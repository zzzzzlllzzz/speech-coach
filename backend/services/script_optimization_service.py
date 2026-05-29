import os

from services.deepseek_service import call_deepseek_json


def optimize_script(payload: dict) -> dict:
    text = (payload.get("text") or "").strip()
    if not text or text == "未检测到文本":
        raise ValueError("当前没有可优化的演讲文字，请先完成语音转写。")

    summary = (payload.get("summary") or "").strip()
    suggestions = payload.get("suggestions") or []
    structure_analysis = payload.get("structure_analysis") or {}
    model = os.getenv("DEEPSEEK_OPTIMIZER_MODEL") or os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    prompt = f"""
你是高中 AI 应用比赛项目“言镜 AI”的演讲稿优化助手。
请根据用户上传视频的语音转写文本，整理出一版更通顺、更像正式演讲稿的文本。

必须遵守：
1. 不要编造用户没有表达过的事实、姓名、地点、数据。
2. 可以根据上下文修正常见 ASR 错字、断句和重复口头碎片。
3. 保留原意，允许把口语化表达改得更清楚、更完整。
4. 不评价心理状态，不写“紧张”“不自信”等判断。
5. 如果原文内容很少或主题不明确，也要尽量整理成自然通顺的一小段，并指出可改进结构。
6. 只输出合法 JSON，不输出 Markdown。

原始转写：
{text}

当前报告总结：
{summary}

当前建议：
{suggestions}

结构分析：
{structure_analysis}

请输出 JSON，字段如下：
{{
  "optimized_text": "优化后的完整演讲稿文本，使用自然段，标点清楚",
  "outline": ["开头建议", "主体建议", "结尾建议"],
  "delivery_tips": ["表达训练建议1", "表达训练建议2", "表达训练建议3"],
  "revision_notes": ["说明具体优化了什么，例如断句、重复词、结构"]
}}
""".strip()

    result = call_deepseek_json(prompt, max_tokens=1800, model=model, temperature=0.2)
    return {
        "optimized_text": str(result.get("optimized_text") or text).strip(),
        "outline": _as_string_list(result.get("outline")),
        "delivery_tips": _as_string_list(result.get("delivery_tips")),
        "revision_notes": _as_string_list(result.get("revision_notes")),
        "source": "deepseek",
        "model": model,
    }


def _as_string_list(value) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]
