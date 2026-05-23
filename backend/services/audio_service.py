from dataclasses import dataclass
from pathlib import Path
import re
import shutil
import subprocess


OUTPUT_DIR = Path(__file__).resolve().parent.parent / "outputs"


@dataclass
class AudioExtractionResult:
    audio_path: Path | None
    duration: float | None
    success: bool
    error: str | None = None


def _find_ffmpeg() -> str | None:
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg

    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def _parse_duration(output: str) -> float | None:
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", output)
    if not match:
        return None

    hours, minutes, seconds = match.groups()
    return round(int(hours) * 3600 + int(minutes) * 60 + float(seconds), 2)


def _probe_duration(path: Path, ffmpeg_executable: str | None = None) -> float | None:
    ffprobe = shutil.which("ffprobe")

    try:
        if not ffprobe:
            raise FileNotFoundError("ffprobe not found")

        result = subprocess.run(
            [
                ffprobe,
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(path),
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=20,
        )
        return round(float(result.stdout.strip()), 2)
    except Exception:
        if not ffmpeg_executable:
            return None

        try:
            result = subprocess.run(
                [ffmpeg_executable, "-i", str(path)],
                check=False,
                capture_output=True,
                text=True,
                timeout=20,
            )
            return _parse_duration(result.stderr)
        except Exception:
            return None


def extract_audio(video_path: Path) -> AudioExtractionResult:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    audio_path = OUTPUT_DIR / f"{video_path.stem}.wav"
    ffmpeg_executable = _find_ffmpeg()

    if not ffmpeg_executable:
        return AudioExtractionResult(
            audio_path=None,
            duration=None,
            success=False,
            error="未找到 FFmpeg，可安装系统 FFmpeg 或检查 imageio-ffmpeg 依赖。",
        )

    try:
        subprocess.run(
            [
                ffmpeg_executable,
                "-y",
                "-i",
                str(video_path),
                "-vn",
                "-acodec",
                "pcm_s16le",
                "-ar",
                "16000",
                "-ac",
                "1",
                str(audio_path),
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=180,
        )
        return AudioExtractionResult(
            audio_path=audio_path,
            duration=_probe_duration(video_path, ffmpeg_executable)
            or _probe_duration(audio_path, ffmpeg_executable),
            success=True,
        )
    except Exception as exc:
        return AudioExtractionResult(
            audio_path=None,
            duration=_probe_duration(video_path, ffmpeg_executable),
            success=False,
            error=str(exc),
        )
