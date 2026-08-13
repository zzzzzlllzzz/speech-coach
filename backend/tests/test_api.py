import os
import unittest

from fastapi.testclient import TestClient

from main import app, safe_number, sanitize_video_info, sanitize_visual_metrics, speech_service_status
from services.report_service import build_quality_assessment
from services.scoring_service import calculate_scores


class ApiSafetyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_and_security_headers(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
        self.assertIn("speech", response.json())
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertEqual(response.headers["x-frame-options"], "DENY")

    def test_debug_endpoint_is_hidden_by_default(self):
        previous = os.environ.pop("ENABLE_DEBUG_ENDPOINTS", None)
        try:
            response = self.client.get("/debug/asr")
            self.assertEqual(response.status_code, 404)
        finally:
            if previous is not None:
                os.environ["ENABLE_DEBUG_ENDPOINTS"] = previous

    def test_public_status_does_not_expose_credentials(self):
        response = self.client.get("/api/status")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["max_video_minutes"], 30)
        self.assertNotIn("token", str(payload).lower())
        self.assertNotIn("secret", str(payload).lower())

    def test_empty_model_directory_is_not_ready(self):
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            old_path = os.environ.get("VOSK_MODEL_PATH")
            old_en_path = os.environ.get("VOSK_EN_MODEL_PATH")
            old_mock = os.environ.get("USE_MOCK")
            os.environ["VOSK_MODEL_PATH"] = directory
            os.environ["VOSK_EN_MODEL_PATH"] = directory
            os.environ["USE_MOCK"] = "false"
            try:
                self.assertFalse(speech_service_status()["offline_ready"])
            finally:
                if old_path is None: os.environ.pop("VOSK_MODEL_PATH", None)
                else: os.environ["VOSK_MODEL_PATH"] = old_path
                if old_en_path is None: os.environ.pop("VOSK_EN_MODEL_PATH", None)
                else: os.environ["VOSK_EN_MODEL_PATH"] = old_en_path
                if old_mock is None: os.environ.pop("USE_MOCK", None)
                else: os.environ["USE_MOCK"] = old_mock

    def test_optimize_script_rejects_empty_text(self):
        response = self.client.post("/api/optimize-script", json={"text": ""})
        self.assertEqual(response.status_code, 422)

    def test_fast_analysis_rejects_invalid_video_filename(self):
        response = self.client.post(
            "/api/analyze-fast",
            data={"filename": "notes.txt", "video_info": "{}", "file_size": "10"},
        )
        self.assertEqual(response.status_code, 400)

    def test_untrusted_metrics_are_bounded(self):
        metrics = sanitize_visual_metrics(
            {
                "looking_camera_ratio": 900,
                "gesture_activity": -2,
                "head_down_count": float("inf"),
                "head_down_events": ["x" * 40] * 200,
            }
        )
        self.assertEqual(metrics["looking_camera_ratio"], 1)
        self.assertEqual(metrics["gesture_activity"], 0)
        self.assertEqual(metrics["head_down_count"], 0)
        self.assertEqual(len(metrics["head_down_events"]), 100)
        self.assertLessEqual(len(metrics["head_down_events"][0]), 12)
        self.assertEqual(metrics["analyzed_duration_seconds"], 0)

    def test_video_info_and_non_finite_values_are_bounded(self):
        info = sanitize_video_info({"duration": -1, "fps": 9999, "width": "nan"})
        self.assertEqual(info["duration"], 1)
        self.assertEqual(info["fps"], 240)
        self.assertEqual(info["width"], 1280)
        self.assertEqual(safe_number(float("inf"), 7, 0, 10), 7)

    def test_quality_assessment_flags_incomplete_long_transcript(self):
        result = build_quality_assessment(
            {"duration": 600, "word_count": 20, "mock_mode": False},
            {"analysis_frame_count": 120, "analyzed_duration_seconds": 600, "mock_mode": False},
        )
        self.assertEqual(result["level"], "medium")
        self.assertFalse(result["checks"][0]["passed"])
        self.assertTrue(result["checks"][2]["passed"])

    def test_scores_are_not_fabricated_when_speech_is_missing(self):
        scores = calculate_scores(
            {"text": "", "word_count": 0, "duration": 600, "mock_mode": True},
            {"mock_mode": False, "gesture_activity": 0.3, "hand_visible_ratio": 0.5, "body_sway_score": 80, "looking_camera_ratio": 0.7},
        )
        self.assertIsNone(scores["content"])
        self.assertIsNone(scores["voice"])
        self.assertIsNone(scores["overall"])
        self.assertIsNotNone(scores["gesture"])


if __name__ == "__main__":
    unittest.main()
