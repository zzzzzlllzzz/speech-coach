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


def get_aliyun_asr_status(check_token: bool = False) -> dict:
    try:
        import nls  # noqa: F401

        sdk_available = True
        sdk_error = None
    except Exception as exc:
        sdk_available = False
        sdk_error = str(exc)

    status = {
        "enabled": aliyun_asr_enabled(),
        "has_app_key": bool(os.getenv("ALIYUN_NLS_APP_KEY")),
        "has_static_token": bool(os.getenv("ALIYUN_NLS_TOKEN")),
        "has_access_key_id": bool(os.getenv("ALIYUN_AK_ID")),
        "has_access_key_secret": bool(os.getenv("ALIYUN_AK_SECRET")),
        "sdk_available": sdk_available,
        "sdk_error": sdk_error,
        "region": os.getenv("ALIYUN_REGION_ID", "cn-shanghai"),
        "gateway": os.getenv("ALIYUN_NLS_URL", "wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1"),
    }

    if check_token:
        try:
            token = get_aliyun_token()
            status["token_ok"] = bool(token)
            status["token_error"] = None
            status["token_expire_time"] = _TOKEN_CACHE.get("expire_time")
        except Exception as exc:
            status["token_ok"] = False
            status["token_error"] = str(exc)

    return status


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


def _get_audio_chunk_size() -> int:
    try:
        chunk_ms = int(os.getenv("ALIYUN_NLS_CHUNK_MS", "200"))
    except ValueError:
        chunk_ms = 100
    safe_chunk_ms = min(max(chunk_ms, 20), 500)
    bytes_per_second = 16000 * 2
    chunk_size = int(bytes_per_second * safe_chunk_ms / 1000)
    return max(640, chunk_size + (chunk_size % 2))


def _get_send_interval(chunk_size: int) -> float:
    configured = os.getenv("ALIYUN_NLS_SEND_INTERVAL")
    if configured is None:
        # The official Python example sends roughly at 2x real-time. Pushing an entire
        # recording almost instantly can overload the gateway and lose callbacks.
        return chunk_size / (16000 * 2) * 0.5
    try:
        return max(0.0, float(configured))
    except ValueError:
        return chunk_size / (16000 * 2) * 0.5


def _read_pcm_chunks(audio_path: Path, chunk_size: int | None = None):
    chunk_size = chunk_size or _get_audio_chunk_size()
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

    sentence_texts: list[str] = []
    completed_texts: list[str] = []
    errors: list[str] = []
    done = threading.Event()

    def collect_text(message) -> list[str]:
        try:
            payload = json.loads(message) if isinstance(message, str) else message
            return _collect_text(payload)
        except Exception:
            return []

    def on_result_changed(message, *args):
        # Intermediate hypotheses can repeat or be revised; do not mix them into the final transcript.
        return None

    def on_sentence_end(message, *args):
        sentence_texts.extend(collect_text(message))

    def on_completed(message, *args):
        completed_texts.extend(collect_text(message))
        done.set()

    def on_error(message, *args):
        errors.append(str(message))
        done.set()

    def on_close(*args):
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
        on_result_changed=on_result_changed,
        on_sentence_end=on_sentence_end,
        on_completed=on_completed,
        on_error=on_error,
        on_close=on_close,
    )

    try:
        started = transcriber.start(
            aformat="pcm",
            sample_rate=16000,
            enable_intermediate_result=False,
            enable_punctuation_prediction=True,
            enable_inverse_text_normalization=True,
            ping_interval=8,
            ping_timeout=None,
        )
        if started is False:
            return {
                "text": "",
                "mock_mode": True,
                "source": "aliyun",
                "error": "阿里云语音识别启动失败",
            }

        chunk_size = _get_audio_chunk_size()
        send_interval = _get_send_interval(chunk_size)
        for chunk in _read_pcm_chunks(audio_path, chunk_size):
            transcriber.send_audio(chunk)
            if send_interval:
                time.sleep(send_interval)

        transcriber.stop(timeout=int(os.getenv("ALIYUN_NLS_STOP_TIMEOUT", "6")))
        done.wait(timeout=int(os.getenv("ALIYUN_NLS_DONE_TIMEOUT", "8")))
    except Exception as exc:
        return {
            "text": "",
            "mock_mode": True,
            "source": "aliyun",
            "error": f"阿里云语音识别失败：{exc}",
        }

    texts = sentence_texts or completed_texts
    normalized_texts: list[str] = []
    for value in texts:
        value = value.strip()
        # Some SDK events expose the same result under nested aliases. Remove only adjacent
        # callback duplicates so legitimately repeated sentences remain in the speech.
        if value and (not normalized_texts or normalized_texts[-1] != value):
            normalized_texts.append(value)
    text = "".join(normalized_texts).strip()
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
