from array import array
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch
import json
import unittest
import wave

from services.aliyun_asr_service import transcribe_with_aliyun


class FakeTranscriber:
    def __init__(self, **callbacks):
        self.callbacks = callbacks

    def start(self, **kwargs):
        return True

    def send_audio(self, chunk):
        return None

    def stop(self, timeout):
        self.callbacks["on_sentence_end"](json.dumps({"payload": {"result": "第一句。"}}))
        self.callbacks["on_sentence_end"](json.dumps({"payload": {"result": "第二句。"}}))
        self.callbacks["on_completed"](json.dumps({"payload": {"result": "第一句。第二句。"}}))


class AliyunCallbackTests(unittest.TestCase):
    def test_sentence_callbacks_produce_complete_transcript(self):
        with TemporaryDirectory() as directory:
            audio_path = Path(directory) / "speech.wav"
            with wave.open(str(audio_path), "wb") as audio:
                audio.setnchannels(1)
                audio.setsampwidth(2)
                audio.setframerate(16000)
                audio.writeframes(array("h", [1000] * 1600).tobytes())

            fake_module = SimpleNamespace(NlsSpeechTranscriber=FakeTranscriber)
            environment = {
                "ALIYUN_NLS_APP_KEY": "app", "ALIYUN_NLS_TOKEN": "token",
                "ALIYUN_NLS_SEND_INTERVAL": "0",
            }
            with patch.dict("sys.modules", {"nls": fake_module}), patch.dict("os.environ", environment, clear=False):
                result = transcribe_with_aliyun(audio_path)

        self.assertFalse(result["mock_mode"])
        self.assertEqual(result["source"], "aliyun_nls")
        self.assertEqual(result["text"], "第一句。第二句。")


if __name__ == "__main__":
    unittest.main()
