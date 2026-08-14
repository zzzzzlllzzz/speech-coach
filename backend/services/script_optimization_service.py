import os
import re
from concurrent.futures import ThreadPoolExecutor

from services.deepseek_service import call_deepseek_json, deepseek_enabled


ALLOWED_PACES = {"放慢", "平稳", "稍快", "逐步加快", "逐步放慢"}


def _as_string_list(value) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _sentences(text: str) -> list[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    parts = re.findall(r"[^。！？!?；;]+[。！？!?；;]?", cleaned)
    return [part.strip() for part in parts if part.strip()]


def _text_chunks(text: str, max_chars: int = 2400) -> list[str]:
    chunks = []
    current = []
    current_length = 0
    for sentence in _sentences(text) or [text]:
        if current and current_length + len(sentence) > max_chars:
            chunks.append("".join(current))
            current = []
            current_length = 0
        current.append(sentence)
        current_length += len(sentence)
    if current:
        chunks.append("".join(current))
    return chunks


def _section_name(index: int, total: int) -> str:
    if index == 0:
        return "开场"
    if index == total - 1:
        return "结尾"
    return f"主体 {index}"


def _emphasis_terms(sentence: str, ending: bool = False) -> list[str]:
    clauses = [re.sub(r"\s+", "", item) for item in re.split(r"[，。！？；：,.!?;:]", sentence) if item.strip()]
    prefixes = ("大家好", "各位好", "各位老师好", "今天我想分享的是", "今天我想分享", "首先", "其次", "然后", "最后")
    cleaned = []
    for clause in clauses:
        value = clause
        for prefix in prefixes:
            if value.startswith(prefix):
                value = value[len(prefix):]
        if len(value) >= 4:
            cleaned.append(value)
    if ending and clauses:
        closing = next((item for item in reversed(clauses) if len(item) >= 4), "")
        if closing:
            return [closing[:8]]
    return [cleaned[0][:8]] if cleaned else [clauses[0][:8]] if clauses else []


def _build_annotated_script(segments: list[dict]) -> str:
    lines = []
    for segment in segments:
        emphasis = "、".join(segment["emphasis"]) or "本句关键词"
        lines.append(
            f"【{segment['section']}｜语速：{segment['pace']}】\n"
            f"【声音：{segment['voice']}｜手势：{segment['gesture']}｜目光：{segment['eye_contact']}｜站位：{segment['position']}】\n"
            f"{segment['text']}\n"
            f"【重音：{emphasis}｜句后停顿{segment['pause_after_seconds']:g}秒】"
        )
    return "\n\n".join(lines)


def _rule_segment(sentence: str, index: int, total: int) -> dict:
    opening = index == 0
    ending = index == total - 1
    transition = any(word in sentence for word in ("首先", "其次", "然后", "最后", "第一", "第二", "第三"))
    pause = 2.0 if ending else 1.0 if opening or transition else 0.6
    pace = "逐步放慢" if ending else "放慢" if opening else "平稳"
    gesture = (
        "双手自然放在腹前，主题句时用一次开放手势"
        if opening
        else "手掌自然打开，配合序号做一次清晰手势"
        if transition
        else "保持自然，仅在关键词处做小幅强调手势"
    )
    eye_contact = "开口前先看镜头1秒" if opening else "说完整句后回看镜头" if not ending else "全句看镜头，结束后停留2秒"
    voice = "主题句清楚有力，句尾不要变轻" if opening else "关键词加重，其他部分保持自然" if not ending else "音量稳定，最后一句放慢收束"
    return {
        "section": _section_name(index, total),
        "text": sentence,
        "pause_after_seconds": pause,
        "pace": pace,
        "emphasis": _emphasis_terms(sentence, ending),
        "voice": voice,
        "gesture": gesture,
        "eye_contact": eye_contact,
        "position": "双脚站稳，肩颈放松" if opening else "重心保持稳定，不来回移动",
    }


def build_rule_based_director_script(text: str) -> dict:
    sentences = _sentences(text) or [text]
    segments = [_rule_segment(sentence, index, len(sentences)) for index, sentence in enumerate(sentences)]
    return {
        "optimized_text": "\n\n".join(sentences),
        "annotated_script": _build_annotated_script(segments),
        "performance_segments": segments,
        "outline": ["开场：一句话说明主题", "主体：每段只讲一个观点并补充解释", "结尾：总结核心观点并自然致谢"],
        "delivery_tips": ["开口前先站稳并看镜头1秒", "重点词加重，观点之间停顿0.6至1秒", "动作只服务关键词，做完回到自然位置"],
        "revision_notes": ["清理转写中的碎片和不自然断句", "按开场、主体、结尾重新划分排练段落", "为每段补充停顿、声音、手势、目光和站姿提示"],
        "source": "rule_based",
        "model": "内置导演规则",
    }


def _normalize_segments(value, fallback_text: str) -> list[dict]:
    if not isinstance(value, list):
        return build_rule_based_director_script(fallback_text)["performance_segments"]
    segments = []
    for index, item in enumerate(value[:40]):
        if not isinstance(item, dict) or not str(item.get("text") or "").strip():
            continue
        try:
            pause = max(0, min(5, float(item.get("pause_after_seconds") or 0.6)))
        except (TypeError, ValueError):
            pause = 0.6
        pace = str(item.get("pace") or "平稳").strip()
        segments.append({
            "section": str(item.get("section") or f"第{index + 1}段").strip()[:30],
            "text": str(item["text"]).strip()[:3000],
            "pause_after_seconds": pause,
            "pace": pace if pace in ALLOWED_PACES else "平稳",
            "emphasis": _as_string_list(item.get("emphasis"))[:8],
            "voice": str(item.get("voice") or "声音自然清楚").strip()[:300],
            "gesture": str(item.get("gesture") or "手势自然并服务关键词").strip()[:300],
            "eye_contact": str(item.get("eye_contact") or "句末回看镜头").strip()[:300],
            "position": str(item.get("position") or "重心保持稳定").strip()[:300],
        })
    return segments or build_rule_based_director_script(fallback_text)["performance_segments"]


def _build_prompt(text: str, summary: str, suggestions: list, structure_analysis: dict, part: int, total: int) -> str:
    part_note = f"这是长演讲的第 {part}/{total} 部分，保持与全文主题一致，不要在中间部分擅自添加开场或致谢。" if total > 1 else ""
    return f"""
你是高中 AI 应用比赛项目“言镜 AI”的演讲稿改写教练和舞台导演。
请根据真实转写改写内容，并生成一份用户可以直接照着排练的逐段导演稿。{part_note}

必须遵守：
1. 不编造原文没有的事实、姓名、地点或数据；保留原意。
2. 清理 ASR 错字、重复和口头碎片，让观点更明确、结构更清楚。
3. 每一段都必须提供：停顿秒数、语速、重音词、声音、手势、目光和站姿提示。
4. 动作提示要具体且克制，例如“右手打开强调关键词”，不能只写“动作自然”。
5. 停顿要服务结构：普通句0.3至0.8秒，观点转换0.8至1.2秒，结尾1.5至2秒。
6. 不猜测心理状态，不写“紧张”“不自信”等判断。
7. 只输出合法 JSON，不输出 Markdown。

原始转写：{text}
报告总结：{summary}
当前建议：{suggestions}
结构分析：{structure_analysis}

请输出：
{{
  "optimized_text": "没有舞台标记的完整改写稿，按自然段分隔",
  "annotated_script": "包含舞台标记的完整排练稿",
  "performance_segments": [
    {{
      "section": "开场/主体一/转折/结尾",
      "text": "这一段要说的改写后文本",
      "pause_after_seconds": 1.0,
      "pace": "放慢/平稳/稍快/逐步加快/逐步放慢",
      "emphasis": ["需要加重的词"],
      "voice": "音量、重音和语气操作",
      "gesture": "明确、可执行的手势操作",
      "eye_contact": "具体目光操作",
      "position": "站姿或移动操作"
    }}
  ],
  "outline": ["结构改写建议"],
  "delivery_tips": ["全稿排练建议"],
  "revision_notes": ["原稿问题与对应修改理由"]
}}
""".strip()


def optimize_script(payload: dict) -> dict:
    text = (payload.get("text") or "").strip()
    if not text or text == "未检测到文本":
        raise ValueError("当前没有可改写的演讲文字，请先完成语音转写。")

    fallback = build_rule_based_director_script(text)
    if not deepseek_enabled():
        return fallback

    summary = (payload.get("summary") or "").strip()
    suggestions = payload.get("suggestions") or []
    structure_analysis = payload.get("structure_analysis") or {}
    model = os.getenv("DEEPSEEK_OPTIMIZER_MODEL") or os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    try:
        chunks = _text_chunks(text)
        prompts = [
            _build_prompt(chunk, summary, suggestions, structure_analysis, index, len(chunks))
            for index, chunk in enumerate(chunks, start=1)
        ]

        def request_chunk(prompt: str) -> dict:
            return call_deepseek_json(
                prompt,
                max_tokens=3600,
                model=model,
                temperature=0.2,
            )

        if len(prompts) == 1:
            results = [request_chunk(prompts[0])]
        else:
            with ThreadPoolExecutor(max_workers=min(3, len(prompts))) as executor:
                results = list(executor.map(request_chunk, prompts))
    except Exception:
        return {**fallback, "fallback_reason": "AI改写服务暂时不可用，已生成内置规则导演稿。"}

    optimized_parts = [str(result.get("optimized_text") or chunks[index]).strip() for index, result in enumerate(results)]
    optimized_text = "\n\n".join(optimized_parts)
    segments = []
    for index, result in enumerate(results):
        segments.extend(_normalize_segments(result.get("performance_segments"), optimized_parts[index]))
    outline = []
    delivery_tips = []
    revision_notes = []
    for result in results:
        outline.extend(_as_string_list(result.get("outline")))
        delivery_tips.extend(_as_string_list(result.get("delivery_tips")))
        revision_notes.extend(_as_string_list(result.get("revision_notes")))
    return {
        "optimized_text": optimized_text,
        "annotated_script": _build_annotated_script(segments),
        "performance_segments": segments,
        "outline": list(dict.fromkeys(outline))[:12] or fallback["outline"],
        "delivery_tips": list(dict.fromkeys(delivery_tips))[:12] or fallback["delivery_tips"],
        "revision_notes": list(dict.fromkeys(revision_notes))[:12] or fallback["revision_notes"],
        "source": "deepseek",
        "model": model,
    }
