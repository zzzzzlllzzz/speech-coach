from services.deepseek_service import call_deepseek_json, deepseek_enabled
from services.text_analysis_service import polish_transcript_text


TRANSCRIPT_POLISH_TIMEOUT = 6


def _deepseek_enabled() -> bool:
    return deepseek_enabled()


def _polish_with_deepseek(raw_text: str) -> dict:
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
    payload = call_deepseek_json(prompt, max_tokens=700, timeout=TRANSCRIPT_POLISH_TIMEOUT)
    text = str(payload.get("text") or "").strip()
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
