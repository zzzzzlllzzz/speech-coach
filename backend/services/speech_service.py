from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, TimeoutError
import json
import os
import wave


MOCK_TRANSCRIPT_TEXT = (
    "大家好，今天我演讲的主题是人工智能如何帮助我们提升公众表达能力。"
    "首先，AI 可以帮助我们发现表达中的问题。其次，它可以根据我们的语速、"
    "手势和姿态给出具体建议。然后，我们可以通过反复练习不断改进。"
    "最后，我认为 AI 不是替代我们表达，而是帮助我们成为更好的表达者。"
)

_TRANSCRIBE_EXECUTOR = ThreadPoolExecutor(max_workers=1)
_WHISPER_MODELS: dict[str, object] = {}
_VOSK_MODEL = None


def build_mock_transcription(reason: str | None = None) -> dict:
    return {
        "text": MOCK_TRANSCRIPT_TEXT,
        "mock_mode": True,
        "source": "fallback",
        "error": reason,
    }


def _transcribe_with_whisper(audio_path: Path, model_size: str) -> dict:
    from faster_whisper import WhisperModel

    if model_size not in _WHISPER_MODELS:
        _WHISPER_MODELS[model_size] = WhisperModel(model_size, device="cpu", compute_type="int8")

    model = _WHISPER_MODELS[model_size]
    segments, _info = model.transcribe(
        str(audio_path),
        language="zh",
        beam_size=1,
        best_of=1,
        temperature=0,
        condition_on_previous_text=False,
        vad_filter=True,
    )
    text = "".join(segment.text.strip() for segment in segments).strip()

    if not text:
        return build_mock_transcription("Whisper 未识别到有效文本，已使用 mock 文本。")

    return {
        "text": text,
        "mock_mode": False,
        "source": "faster_whisper",
        "error": None,
    }


def _get_vosk_model():
    global _VOSK_MODEL
    if _VOSK_MODEL is not None:
        return _VOSK_MODEL

    model_path = Path(os.getenv("VOSK_MODEL_PATH", "models/vosk-model-small-cn-0.22"))
    if not model_path.exists():
        raise FileNotFoundError(f"Vosk 中文模型不存在：{model_path}")

    from vosk import Model

    _VOSK_MODEL = Model(str(model_path))
    return _VOSK_MODEL


def _transcribe_with_vosk(audio_path: Path) -> dict:
    from vosk import KaldiRecognizer

    model = _get_vosk_model()
    chunks: list[str] = []

    with wave.open(str(audio_path), "rb") as audio:
        if audio.getnchannels() != 1 or audio.getframerate() != 16000:
            raise ValueError("Vosk 需要 16000 Hz 单声道 wav 音频。")

        recognizer = KaldiRecognizer(model, audio.getframerate())
        recognizer.SetWords(True)

        while True:
            data = audio.readframes(4000)
            if len(data) == 0:
                break
            if recognizer.AcceptWaveform(data):
                text = json.loads(recognizer.Result()).get("text", "")
                if text:
                    chunks.append(text)

        final_text = json.loads(recognizer.FinalResult()).get("text", "")
        if final_text:
            chunks.append(final_text)

    text = "".join("".join(chunks).split())
    if not text:
        return build_mock_transcription("Vosk 未识别到有效文本。")

    return {
        "text": text,
        "mock_mode": False,
        "source": "vosk",
        "error": None,
    }


def transcribe_audio(audio_path: Path | None, model_size: str = "tiny") -> dict:
    if os.getenv("SPEECH_COACH_FORCE_MOCK") == "1":
        return build_mock_transcription("已通过 SPEECH_COACH_FORCE_MOCK=1 强制启用 mock 文本。")

    if audio_path is None or not audio_path.exists():
        return build_mock_transcription("音频文件不存在，已使用 mock 文本。")

    try:
        return _transcribe_with_vosk(audio_path)
    except Exception:
        pass

    try:
        model_size = os.getenv("WHISPER_MODEL", model_size)
        timeout_seconds = int(os.getenv("WHISPER_TIMEOUT_SECONDS", "85"))
        future = _TRANSCRIBE_EXECUTOR.submit(_transcribe_with_whisper, audio_path, model_size)
        return future.result(timeout=timeout_seconds)
    except TimeoutError:
        return build_mock_transcription(
            "Whisper 识别耗时较长，已自动切换到演示文本，保证报告稳定生成。"
        )
    except Exception as exc:
        return build_mock_transcription(f"Whisper 识别失败：{exc}")
