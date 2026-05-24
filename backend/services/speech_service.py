from pathlib import Path
import json
import os
import wave

from services.aliyun_asr_service import aliyun_asr_enabled, transcribe_with_aliyun
from services.transcript_polish_service import polish_transcript_with_context


MOCK_TRANSCRIPT_TEXT = (
    "大家好，今天我演讲的主题是人工智能如何帮助我们提升公众表达能力。"
    "首先，AI 可以帮助我们发现表达中的问题。其次，它可以根据我们的语速、"
    "手势和姿态给出具体建议。然后，我们可以通过反复练习不断改进。"
    "最后，我认为 AI 不是替代我们表达，而是帮助我们成为更好的表达者。"
)

_VOSK_MODELS: dict[str, object] = {}


def build_mock_transcription(reason: str | None = None) -> dict:
    return {
        "text": "",
        "raw_text": "",
        "mock_mode": True,
        "source": "fallback",
        "polish_source": "none",
        "polish_error": None,
        "error": reason or "未检测到文本",
    }


def _with_polished_text(result: dict) -> dict:
    if result.get("mock_mode") or not result.get("text"):
        result.setdefault("raw_text", result.get("text", ""))
        result.setdefault("polish_source", "none")
        result.setdefault("polish_error", None)
        return result

    polish_result = polish_transcript_with_context(result["text"])
    result["raw_text"] = polish_result["raw_text"]
    result["text"] = polish_result["text"]
    result["polish_source"] = polish_result["polish_source"]
    result["polish_error"] = polish_result["polish_error"]
    return result


def _get_vosk_model(language: str):
    if language in _VOSK_MODELS:
        return _VOSK_MODELS[language]

    default_paths = {
        "zh": "models/vosk-model-small-cn-0.22",
        "en": "models/vosk-model-small-en-us-0.15",
    }
    env_name = "VOSK_MODEL_PATH" if language == "zh" else "VOSK_EN_MODEL_PATH"
    model_path = Path(os.getenv(env_name, default_paths[language]))
    if not model_path.exists():
        raise FileNotFoundError(f"Vosk {language} 模型不存在：{model_path}")

    from vosk import Model

    _VOSK_MODELS[language] = Model(str(model_path))
    return _VOSK_MODELS[language]


def _transcribe_with_vosk(audio_path: Path, language: str) -> dict:
    from vosk import KaldiRecognizer

    model = _get_vosk_model(language)
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

    text = " ".join(chunk.strip() for chunk in chunks if chunk.strip())
    text = text.replace("  ", " ").strip()
    if not text:
        return build_mock_transcription("未检测到文本")

    return {
        "text": text,
        "mock_mode": False,
        "source": f"vosk_{language}",
        "error": None,
    }


def transcribe_audio(audio_path: Path | None) -> dict:
    if os.getenv("SPEECH_COACH_FORCE_MOCK") == "1":
        return build_mock_transcription("未检测到文本")

    if audio_path is None or not audio_path.exists():
        return build_mock_transcription("未检测到文本")

    aliyun_error = None
    if aliyun_asr_enabled():
        aliyun_result = transcribe_with_aliyun(audio_path)
        if not aliyun_result["mock_mode"]:
            return _with_polished_text(aliyun_result)
        aliyun_error = aliyun_result.get("error") or "阿里云未返回识别文本"

    try:
        zh_result = _transcribe_with_vosk(audio_path, "zh")
        if not zh_result["mock_mode"]:
            return _with_polished_text(zh_result)
    except Exception as exc:
        aliyun_error = aliyun_error or f"Vosk 中文识别失败：{exc}"

    try:
        return _with_polished_text(_transcribe_with_vosk(audio_path, "en"))
    except Exception as exc:
        reason = aliyun_error or f"Vosk 英文识别失败：{exc}"
        return build_mock_transcription(reason)
