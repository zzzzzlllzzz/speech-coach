from pathlib import Path
import json
import os
import threading
import time
import wave


def aliyun_asr_enabled() -> bool:
    return bool(os.getenv("ALIYUN_NLS_APP_KEY") and os.getenv("ALIYUN_NLS_TOKEN"))


def _collect_text(payload: object) -> list[str]:
    texts: list[str] = []
    if isinstance(payload, dict):
        for key, value in payload.items():
            if key in {"result", "text", "sentence"} and isinstance(value, str) and value.strip():
                texts.append(value.strip())
            else:
                texts.extend(_collect_text(value))
    elif isinstance(payload, list):
        for item in payload:
            texts.extend(_collect_text(item))
    return texts


def _read_pcm_chunks(audio_path: Path, chunk_size: int = 3200):
    with wave.open(str(audio_path), "rb") as audio:
        if audio.getnchannels() != 1 or audio.getframerate() != 16000:
            raise ValueError("阿里云实时识别需要 16000 Hz 单声道 wav 音频。")
        while True:
            chunk = audio.readframes(chunk_size // 2)
            if not chunk:
                break
            yield chunk


def transcribe_with_aliyun(audio_path: Path) -> dict:
    if not aliyun_asr_enabled():
        return {
            "text": "",
            "mock_mode": True,
            "source": "aliyun_disabled",
            "error": "未配置阿里云语音识别参数",
        }

    try:
        import nls
    except Exception as exc:
        return {
            "text": "",
            "mock_mode": True,
            "source": "aliyun_unavailable",
            "error": f"阿里云语音 SDK 不可用：{exc}",
        }

    texts: list[str] = []
    errors: list[str] = []
    done = threading.Event()

    def on_sentence_end(message, *args):
        try:
            payload = json.loads(message) if isinstance(message, str) else message
            texts.extend(_collect_text(payload))
        except Exception:
            pass

    def on_completed(message, *args):
        try:
            payload = json.loads(message) if isinstance(message, str) else message
            texts.extend(_collect_text(payload))
        except Exception:
            pass
        done.set()

    def on_error(message, *args):
        errors.append(str(message))
        done.set()

    url = os.getenv("ALIYUN_NLS_URL", "wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1")
    transcriber = nls.NlsSpeechTranscriber(
        url=url,
        token=os.getenv("ALIYUN_NLS_TOKEN"),
        appkey=os.getenv("ALIYUN_NLS_APP_KEY"),
        on_sentence_end=on_sentence_end,
        on_completed=on_completed,
        on_error=on_error,
    )

    try:
        started = transcriber.start(
            aformat="pcm",
            enable_intermediate_result=False,
            enable_punctuation_prediction=True,
            enable_inverse_text_normalization=True,
        )
        if started is False:
            return {
                "text": "",
                "mock_mode": True,
                "source": "aliyun",
                "error": "阿里云语音识别启动失败",
            }

        for chunk in _read_pcm_chunks(audio_path):
            transcriber.send_audio(chunk)
            time.sleep(0.01)

        transcriber.stop()
        done.wait(timeout=8)
    except Exception as exc:
        return {
            "text": "",
            "mock_mode": True,
            "source": "aliyun",
            "error": f"阿里云语音识别失败：{exc}",
        }

    text = "".join(dict.fromkeys(texts)).strip()
    if not text:
        return {
            "text": "",
            "mock_mode": True,
            "source": "aliyun",
            "error": errors[-1] if errors else "未检测到文本",
        }

    return {
        "text": text,
        "mock_mode": False,
        "source": "aliyun_nls",
        "error": None,
    }
