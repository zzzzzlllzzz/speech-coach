import json
import os
import re
import urllib.request

from services.text_analysis_service import polish_transcript_text


def _deepseek_enabled() -> bool:
    return bool(os.getenv("DEEPSEEK_API_KEY"))


def _extract_json_text(content: str) -> str:
    content = content.strip()
    match = re.search(r"\{[\s\S]*\}", content)
    if not match:
        return content
    try:
        payload = json.loads(match.group(0))
        return str(payload.get("text") or content).strip()
    except Exception:
        return content


def _polish_with_deepseek(raw_text: str) -> dict:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    timeout = int(os.getenv("DEEPSEEK_TIMEOUT", "20"))

    prompt = (
        "你是演讲稿转写校对助手。请根据上下文修正语音识别中的同音错字、错别字、"
        "明显断句错误和重复碎片，让文本成为通顺自然的演讲文字稿。\n"
        "要求：\n"
        "1. 只能根据原文上下文做合理校正，不要新增观点，不要编造原文没有的信息。\n"
        "2. 保留中英文内容；中文使用中文标点，英文使用英文标点。\n"
        "3. 去掉明显无意义的重复和孤立语气词，但不要过度润色成另一篇文章。\n"
        "4. 如果原文太短或无法判断，只做最小断句。\n"
        "5. 只返回 JSON：{\"text\":\"校正后的文字\"}。\n\n"
        f"原始 ASR 文本：{raw_text}"
    )
    body = json.dumps(
        {
            "model": model,
            "messages": [
                {"role": "system", "content": "你只输出合法 JSON，不输出解释。"},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 1200,
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = json.loads(response.read().decode("utf-8"))

    content = payload["choices"][0]["message"]["content"]
    text = _extract_json_text(content)
    text = polish_transcript_text(text)
    if not text:
        raise ValueError("DeepSeek 未返回有效文本")

    return {
        "text": text,
        "polish_source": "deepseek",
        "polish_error": None,
    }


def polish_transcript_with_context(raw_text: str) -> dict:
    raw_text = (raw_text or "").strip()
    if not raw_text:
        return {
            "text": "",
            "raw_text": raw_text,
            "polish_source": "none",
            "polish_error": None,
        }

    rule_based_text = polish_transcript_text(raw_text)
    if not _deepseek_enabled():
        return {
            "text": rule_based_text,
            "raw_text": raw_text,
            "polish_source": "rule",
            "polish_error": None,
        }

    try:
        result = _polish_with_deepseek(raw_text)
        result["raw_text"] = raw_text
        return result
    except Exception as exc:
        return {
            "text": rule_based_text,
            "raw_text": raw_text,
            "polish_source": "rule",
            "polish_error": str(exc),
        }
