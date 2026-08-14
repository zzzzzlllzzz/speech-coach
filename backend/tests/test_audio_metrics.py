from pathlib import Path
from tempfile import TemporaryDirectory
from array import array
import math
import unittest
import wave

from services.audio_metrics_service import analyze_audio_delivery


class AudioMetricsTests(unittest.TestCase):
    def test_detects_long_pause_across_complete_track(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "delivery.wav"
            sample_rate = 16000
            voiced = array("h", [round(math.sin(index / 12) * 7000) for index in range(sample_rate)])
            silence = array("h", [0] * (sample_rate * 2))
            with wave.open(str(path), "wb") as audio:
                audio.setnchannels(1)
                audio.setsampwidth(2)
                audio.setframerate(sample_rate)
                audio.writeframes(voiced.tobytes() + silence.tobytes() + voiced.tobytes())

            metrics = analyze_audio_delivery(path)
            self.assertTrue(metrics["available"])
            self.assertGreaterEqual(len(metrics["long_pause_events"]), 1)
            self.assertEqual(metrics["long_pause_events"][0]["time"], "00:01")
            self.assertGreaterEqual(metrics["analyzed_duration_seconds"], 4)


if __name__ == "__main__":
    unittest.main()
