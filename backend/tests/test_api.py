import os
import threading
import time
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app, safe_number, sanitize_video_info, sanitize_visual_metrics, speech_service_status
from services.report_service import build_issues, build_quality_assessment, build_suggestions
from services.scoring_service import calculate_scores
from services.aliyun_asr_service import _collect_text


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

    def test_background_analysis_job_returns_result_without_long_request(self):
        previous = os.environ.get("USE_MOCK")
        os.environ["USE_MOCK"] = "true"
        try:
            started = self.client.post(
                "/api/analyze-jobs",
                files={"file": ("speech.mp4", b"small-test-video", "video/mp4")},
            )
            self.assertEqual(started.status_code, 202)
            job_id = started.json()["job_id"]

            payload = None
            for _ in range(30):
                status = self.client.get(f"/api/analyze-jobs/{job_id}")
                self.assertEqual(status.status_code, 200)
                payload = status.json()
                if payload["status"] in {"completed", "failed"}:
                    break
                time.sleep(0.02)

            self.assertEqual(payload["status"], "completed")
            self.assertEqual(payload["progress"], 100)
            self.assertIn("result", payload)
        finally:
            if previous is None:
                os.environ.pop("USE_MOCK", None)
            else:
                os.environ["USE_MOCK"] = previous

    def test_unknown_background_job_is_not_exposed(self):
        response = self.client.get("/api/analyze-jobs/not-a-real-job")
        self.assertEqual(response.status_code, 404)

    def test_fast_analysis_refuses_fake_success_when_speech_fails(self):
        failed = {
            "text": "", "raw_text": "", "mock_mode": True,
            "source": "fallback", "error": "测试语音服务失败",
        }
        with patch("main.transcribe_audio", return_value=failed):
            response = self.client.post(
                "/api/analyze-fast",
                data={
                    "filename": "speech.mp4",
                    "video_info": '{"duration": 60}',
                    "client_visual_metrics": '{"analysis_frame_count": 60}',
                },
                files={"audio_file": ("speech.wav", b"not-a-real-wave", "audio/wav")},
            )
        self.assertEqual(response.status_code, 422)
        self.assertIn("停止评分", response.json()["detail"])

    def test_health_stays_responsive_during_slow_transcription(self):
        started = threading.Event()
        release = threading.Event()
        response_holder = {}

        def slow_transcribe(_path):
            started.set()
            release.wait(timeout=3)
            return {
                "text": "大家好，今天我介绍我们的项目。最后，谢谢大家。",
                "raw_text": "大家好，今天我介绍我们的项目。最后，谢谢大家。",
                "mock_mode": False,
                "source": "aliyun",
                "polish_source": "none",
                "polish_error": None,
            }

        def run_analysis():
            response_holder["response"] = self.client.post(
                "/api/analyze-fast",
                data={
                    "filename": "speech.mp4",
                    "file_size": "1024",
                    "video_info": '{"duration": 60}',
                    "client_visual_metrics": '{"analysis_frame_count": 20, "analyzed_duration_seconds": 60}',
                },
                files={"audio_file": ("speech.wav", b"not-a-real-wave", "audio/wav")},
            )

        with patch("main.transcribe_audio", side_effect=slow_transcribe), patch(
            "main.analyze_audio_delivery", return_value={"available": False}
        ):
            worker = threading.Thread(target=run_analysis)
            worker.start()
            self.assertTrue(started.wait(timeout=2))
            before = time.monotonic()
            health = self.client.get("/health")
            elapsed = time.monotonic() - before
            release.set()
            worker.join(timeout=5)

        self.assertEqual(health.status_code, 200)
        self.assertLess(elapsed, 1)
        self.assertEqual(response_holder["response"].status_code, 200)

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

    def test_voice_score_uses_real_audio_delivery_metrics(self):
        transcript = {
            "text": "这是一个足够长的真实演讲转写文本，用于验证声音表现评分。",
            "word_count": 80,
            "duration": 60,
            "speech_rate": 160,
            "speech_rate_reliable": True,
            "mock_mode": False,
            "has_opening": True,
            "has_topic": True,
            "has_ending": True,
            "audio_metrics": {
                "available": True,
                "low_volume_ratio": 0.5,
                "volume_stability_score": 40,
                "long_pause_events": [{}, {}, {}, {}],
            },
        }
        visual = {
            "mock_mode": False, "gesture_activity": 0.3, "hand_visible_ratio": 0.5,
            "body_sway_score": 80, "looking_camera_ratio": 0.7,
        }
        self.assertLess(calculate_scores(transcript, visual)["voice"], 82)

    def test_mock_visual_metrics_do_not_generate_fake_visual_findings(self):
        transcript = {
            "text": "这是有效的真实转写文本。", "word_count": 30, "duration": 30,
            "speech_rate": 150, "mock_mode": False, "has_opening": True,
            "has_topic": True, "has_ending": True, "logic_words_count": 3,
        }
        visual = {
            "mock_mode": True, "looking_camera_ratio": 0,
            "gesture_activity": 0, "head_down_count": 99,
            "body_sway_score": 0, "head_down_events": ["00:05"],
        }
        suggestions = "".join(build_suggestions(transcript, visual))
        issues = "".join(item["type"] for item in build_issues(transcript, visual))
        self.assertNotIn("镜头交流比例偏低", suggestions)
        self.assertNotIn("低头", suggestions + issues)

    def test_aliyun_nested_callback_text_is_collected(self):
        payload = {
            "payload": {
                "result": "第一句",
                "nested": [{"text": "第二句"}],
            }
        }
        self.assertEqual(_collect_text(payload), ["第一句", "第二句"])


if __name__ == "__main__":
    unittest.main()
