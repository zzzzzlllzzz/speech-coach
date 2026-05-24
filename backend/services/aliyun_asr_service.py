from pathlib import Path
import base64
import hashlib
import hmac
import json
import os
import time
import threading
import urllib.parse
import urllib.request
import uuid
import wave


_TOKEN_CACHE: dict[str, str | int] = {}


def aliyun_asr_enabled() -> bool:
    has_static_token = bool(os.getenv("ALIYUN_NLS_TOKEN"))
    has_auto_token_config = bool(os.getenv("ALIYUN_AK_ID") and os.getenv("ALIYUN_AK_SECRET"))
    return bool(os.getenv("ALIYUN_NLS_APP_KEY") and (has_static_token or has_auto_token_config))


def _percent_encode(value: str) -> str:
    return urllib.parse.quote(value, safe="~")


def _create_nls_token() -> str:
    cached_token = _TOKEN_CACHE.get("token")
    expire_time = int(_TOKEN_CACHE.get("expire_time", 0))
    if cached_token and expire_time - int(time.time()) > 600:
        return str(cached_token)

    access_key_id = os.getenv("ALIYUN_AK_ID")
    access_key_secret = os.getenv("ALIYUN_AK_SECRET")
    if not access_key_id or not access_key_secret:
        raise ValueError("未配置 ALIYUN_AK_ID / ALIYUN_AK_SECRET")

    params = {
        "AccessKeyId": access_key_id,
        "Action": "CreateToken",
        "Format": "JSON",
        "RegionId": os.getenv("ALIYUN_REGION_ID", "cn-shanghai"),
        "SignatureMethod": "HMAC-SHA1",
        "SignatureNonce": str(uuid.uuid4()),
        "SignatureVersion": "1.0",
        "Timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "Version": "2019-02-28",
    }
    sorted_query = "&".join(
        f"{_percent_encode(key)}={_percent_encode(str(params[key]))}" for key in sorted(params)
    )
    string_to_sign = f"GET&%2F&{_percent_encode(sorted_query)}"
    key = f"{access_key_secret}&".encode("utf-8")
    signature = base64.b64encode(
        hmac.new(key, string_to_sign.encode("utf-8"), hashlib.sha1).digest()
    ).decode("utf-8")
    query = f"{sorted_query}&Signature={_percent_encode(signature)}"
    endpoint = os.getenv("ALIYUN_NLS_META_URL", "https://nls-meta.cn-shanghai.aliyuncs.com/")

    with urllib.request.urlopen(f"{endpoint}?{query}", timeout=15) as response:
        payload = json.loads(response.read().decode("utf-8"))

    token_info = payload.get("Token") or {}
    token = token_info.get("Id")
    token_expire_time = token_info.get("ExpireTime")
    if not token:
        raise ValueError(f"阿里云 CreateToken 未返回 Token：{payload}")

    _TOKEN_CACHE["token"] = token
    _TOKEN_CACHE["expire_time"] = int(token_expire_time or time.time() + 3000)
    return token


def get_aliyun_token() -> str:
    static_token = os.getenv("ALIYUN_NLS_TOKEN")
    if static_token:
        return static_token
    return _create_nls_token()


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
    try:
        token = get_aliyun_token()
    except Exception as exc:
        return {
            "text": "",
            "mock_mode": True,
            "source": "aliyun_token",
            "error": f"阿里云 Token 获取失败：{exc}",
        }

    transcriber = nls.NlsSpeechTranscriber(
        url=url,
        token=token,
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
