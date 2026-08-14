from array import array
from pathlib import Path
from statistics import mean, median, pstdev
import math
import sys
import wave


def _format_time(seconds: float) -> str:
    seconds = max(0, round(seconds))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def analyze_audio_delivery(audio_path: Path | None, window_seconds: float = 0.25) -> dict:
    """Measure delivery from the complete PCM track without guessing emotion or intent."""
    empty = {
        "available": False,
        "silence_ratio": None,
        "low_volume_ratio": None,
        "volume_stability_score": None,
        "long_pause_events": [],
        "analysis_window_seconds": window_seconds,
    }
    if audio_path is None or not audio_path.exists():
        return empty

    try:
        with wave.open(str(audio_path), "rb") as audio:
            channels = audio.getnchannels()
            sample_width = audio.getsampwidth()
            sample_rate = audio.getframerate()
            if channels != 1 or sample_width != 2 or sample_rate <= 0:
                return {**empty, "error": "音频不是 16-bit 单声道 PCM。"}

            frames_per_window = max(1, round(sample_rate * window_seconds))
            rms_values: list[float] = []
            while True:
                raw = audio.readframes(frames_per_window)
                if not raw:
                    break
                samples = array("h")
                samples.frombytes(raw)
                if sys.byteorder != "little":
                    samples.byteswap()
                if not samples:
                    continue
                rms = math.sqrt(sum(sample * sample for sample in samples) / len(samples)) / 32768
                rms_values.append(rms)
    except (OSError, wave.Error):
        return {**empty, "error": "音轨读取失败。"}

    if not rms_values:
        return {**empty, "error": "音轨没有可分析的采样。"}

    active_values = [value for value in rms_values if value >= 0.006]
    reference = median(active_values) if active_values else median(rms_values)
    silence_threshold = max(0.004, min(0.012, reference * 0.28))
    low_volume_threshold = max(0.009, min(0.025, reference * 0.55))
    silent_flags = [value < silence_threshold for value in rms_values]
    low_volume_ratio = sum(value < low_volume_threshold for value in rms_values) / len(rms_values)

    pause_events = []
    pause_start = None
    for index, silent in enumerate([*silent_flags, False]):
        if silent and pause_start is None:
            pause_start = index
        elif not silent and pause_start is not None:
            pause_duration = (index - pause_start) * window_seconds
            if pause_duration >= 1.5:
                pause_events.append({
                    "time": _format_time(pause_start * window_seconds),
                    "duration": round(pause_duration, 1),
                })
            pause_start = None

    voiced = [value for value in rms_values if value >= silence_threshold]
    coefficient = pstdev(voiced) / max(mean(voiced), 0.0001) if len(voiced) > 1 else 0
    stability = round(max(0, min(100, 100 - coefficient * 70)))

    return {
        "available": True,
        "silence_ratio": round(sum(silent_flags) / len(silent_flags), 3),
        "low_volume_ratio": round(low_volume_ratio, 3),
        "volume_stability_score": stability,
        "average_rms": round(mean(rms_values), 4),
        "long_pause_events": pause_events[:20],
        "analysis_window_seconds": window_seconds,
        "analyzed_duration_seconds": round(len(rms_values) * window_seconds, 2),
    }
