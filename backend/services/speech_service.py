from pathlib import Path
import json
import os
import wave


MOCK_TRANSCRIPT_TEXT = (
    "大家好，今天我演讲的主题是人工智能如何帮助我们提升公众表达能力。"
    "首先，AI 可以帮助我们发现表达中的问题。其次，它可以根据我们的语速、"
    "手势和姿态给出具体建议。然后，我们可以通过反复练习不断改进。"
    "最后，我认为 AI 不是替代我们表达，而是帮助我们成为更好的表达者。"
)

_VOSK_MODEL = None


def build_mock_transcription(reason: str | None = None) -> dict:
    return {
        "text": "",
        "mock_mode": True,
        "source": "fallback",
        "error": reason or "未检测到文本",
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
        return build_mock_transcription("未检测到文本")

    return {
        "text": text,
        "mock_mode": False,
        "source": "vosk",
        "error": None,
    }


def transcribe_audio(audio_path: Path | None) -> dict:
    if os.getenv("SPEECH_COACH_FORCE_MOCK") == "1":
        return build_mock_transcription("未检测到文本")

    if audio_path is None or not audio_path.exists():
        return build_mock_transcription("未检测到文本")

    try:
        return _transcribe_with_vosk(audio_path)
    except Exception:
        return build_mock_transcription("未检测到文本")
