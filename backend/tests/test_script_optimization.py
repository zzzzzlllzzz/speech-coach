import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from services.script_optimization_service import optimize_script


class ScriptOptimizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_rule_director_script_is_complete_without_ai_key(self):
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": ""}, clear=False):
            result = optimize_script({"text": "大家好，今天我想分享学习方法。首先，要明确目标。最后，坚持复盘。"})

        self.assertEqual(result["source"], "rule_based")
        self.assertTrue(result["annotated_script"])
        self.assertGreaterEqual(len(result["performance_segments"]), 3)
        for segment in result["performance_segments"]:
            self.assertIn("pause_after_seconds", segment)
            self.assertTrue(segment["voice"])
            self.assertTrue(segment["gesture"])
            self.assertTrue(segment["eye_contact"])
            self.assertTrue(segment["position"])

    def test_endpoint_returns_rehearsal_script_without_ai_key(self):
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": ""}, clear=False):
            response = self.client.post(
                "/api/optimize-script",
                json={"text": "各位老师好。今天我介绍我们的项目。谢谢大家。"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("performance_segments", payload)
        self.assertIn("停顿", payload["annotated_script"])

    @patch("services.script_optimization_service.call_deepseek_json")
    def test_ai_director_script_is_safely_normalized(self, mock_call):
        mock_call.return_value = {
            "optimized_text": "这是改写后的演讲稿。",
            "annotated_script": "【看镜头】这是改写后的演讲稿。【停顿1秒】",
            "performance_segments": [{
                "section": "开场",
                "text": "这是改写后的演讲稿。",
                "pause_after_seconds": 99,
                "pace": "无法识别的速度",
                "emphasis": ["改写后"],
                "voice": "清晰有力",
                "gesture": "右手打开",
                "eye_contact": "看向镜头",
                "position": "站稳",
            }],
        }
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "test-key"}, clear=False):
            result = optimize_script({"text": "这是原稿。"})

        self.assertEqual(result["source"], "deepseek")
        segment = result["performance_segments"][0]
        self.assertEqual(segment["pause_after_seconds"], 5)
        self.assertEqual(segment["pace"], "平稳")
        self.assertEqual(segment["gesture"], "右手打开")

    @patch("services.script_optimization_service.call_deepseek_json", side_effect=TimeoutError)
    def test_ai_failure_falls_back_instead_of_breaking_report(self, _mock_call):
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "test-key"}, clear=False):
            result = optimize_script({"text": "这是需要继续排练的原稿。"})

        self.assertEqual(result["source"], "rule_based")
        self.assertIn("fallback_reason", result)
        self.assertTrue(result["performance_segments"])

    @patch("services.script_optimization_service.call_deepseek_json")
    def test_long_script_is_processed_in_multiple_complete_chunks(self, mock_call):
        mock_call.return_value = {
            "optimized_text": "本段已完成改写。",
            "performance_segments": [{"section": "主体", "text": "本段已完成改写。"}],
        }
        long_text = "这是一个需要完整保留并认真分析的演讲段落。" * 140
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "test-key"}, clear=False):
            result = optimize_script({"text": long_text})

        self.assertGreater(mock_call.call_count, 1)
        self.assertEqual(len(result["performance_segments"]), mock_call.call_count)
        self.assertEqual(result["optimized_text"].count("本段已完成改写"), mock_call.call_count)


if __name__ == "__main__":
    unittest.main()
