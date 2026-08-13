from services.gesture_service import build_mock_visual_metrics
from services.scoring_service import calculate_scores, get_filler_total
from services.speech_service import MOCK_TRANSCRIPT_TEXT
from services.text_analysis_service import analyze_text


def _format_issue_time(seconds: float) -> str:
    seconds = max(0, round(seconds))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def _duration_seconds(transcript: dict) -> float:
    try:
        return max(0, float(transcript.get("duration") or 0))
    except (TypeError, ValueError):
        return 0


def _parse_issue_time(value: str | None) -> float | None:
    if not value:
        return None
    parts = str(value).split(":")
    try:
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        return float(value)
    except (TypeError, ValueError):
        return None


def _clamp_issue_time(transcript: dict, value: str | None, default_ratio: float = 0.25) -> str:
    duration = _duration_seconds(transcript)
    parsed = _parse_issue_time(value)
    if parsed is None:
        parsed = duration * default_ratio if duration else 0

    if duration > 0:
        latest = max(0, duration - 1) if duration >= 2 else duration
        parsed = min(parsed, latest)
    return _format_issue_time(parsed)


def _issue_time(transcript: dict, ratio: float, fallback: str) -> str:
    duration = _duration_seconds(transcript)
    if not duration:
        return _clamp_issue_time(transcript, fallback, ratio)
    latest = max(0, duration - 1) if duration >= 2 else duration
    return _format_issue_time(min(duration * ratio, latest))


def build_report_shell(filename: str, duration: float | int = 120) -> dict:
    return {
        "video_info": {
            "filename": filename,
            "duration": duration,
            "fps": 30,
            "width": 1280,
            "height": 720,
        },
        "transcript": {},
        "visual_metrics": {},
        "scores": {},
        "issues": [],
        "suggestions": [],
        "summary": "",
    }


def build_suggestions(transcript: dict, visual_metrics: dict) -> list[str]:
    suggestions = []
    speech_rate = transcript.get("speech_rate", 0)
    speech_rate_reliable = transcript.get("speech_rate_reliable", True)
    filler_total = get_filler_total(transcript)
    looking_camera_ratio = visual_metrics.get("looking_camera_ratio", 0)
    gesture_activity = visual_metrics.get("gesture_activity", 0)
    face_block_count = visual_metrics.get("face_block_count", 0)
    head_down_count = visual_metrics.get("head_down_count", 0)
    body_sway_score = visual_metrics.get("body_sway_score", 100)

    if transcript.get("mock_mode"):
        suggestions.append("语音识别本次未完成，文本维度不参与可靠判断；请确认声音清晰，并检查阿里云 ASR 或 Vosk 服务是否可用后重新分析。")
    if not transcript.get("mock_mode") and not transcript.get("has_opening"):
        suggestions.append("没有检测到明确开场语，建议先用一句简短问候和主题句帮助观众进入内容。")
    if not transcript.get("mock_mode") and not transcript.get("has_topic"):
        suggestions.append("主题句不够明显，建议在开头直接说明“今天我演讲的主题是……”。")
    if not transcript.get("mock_mode") and not transcript.get("has_ending"):
        suggestions.append("结尾标志不够明确，建议用“最后”或“谢谢大家”自然收束观点。")
    if not transcript.get("mock_mode") and transcript.get("logic_words_count", 0) < 3:
        suggestions.append("逻辑连接词偏少，建议用“首先、其次、最后”等词让结构更清晰。")
    if speech_rate_reliable and speech_rate > 200:
        suggestions.append("你的语速偏快，建议在重点观点后停顿 1 秒，让观众有理解时间。")
    if speech_rate_reliable and speech_rate < 120:
        suggestions.append("你的语速偏慢，建议适当提升节奏，让表达更有活力。")
    if looking_camera_ratio < 0.6:
        suggestions.append("你的镜头交流比例偏低，建议减少低头看稿，每讲完一个观点后看向镜头。")
    if gesture_activity < 0.2:
        suggestions.append("你的手势活跃度偏低，建议在列举观点或强调关键词时加入自然开放式手势。")
    if gesture_activity > 0.55:
        suggestions.append("你的手势活动较频繁，建议减少无意义摆动，让手势更多服务于重点表达。")
    if face_block_count is not None and face_block_count > 3:
        suggestions.append("检测到多次手部靠近面部，建议演讲时避免摸脸或遮挡面部。")
    if head_down_count > 5:
        suggestions.append("检测到低头次数较多，建议将提纲放在视线更高的位置，减少长时间看稿。")
    if body_sway_score < 70:
        suggestions.append("你的身体稳定性还有提升空间，建议双脚站稳，保持身体重心稳定。")
    if not transcript.get("mock_mode") and filler_total > 10:
        suggestions.append("本次演讲中口头禅较多，建议用短暂停顿代替‘嗯、啊、然后’等填充词。")

    fallback_suggestions = [
        "建议在每个重点观点后进行短暂停顿，增强表达层次。",
        "建议在开场和结尾保持自然微笑，提升亲和力。",
        "建议使用‘首先、其次、最后’等连接词，让结构更清晰。",
    ]

    for suggestion in fallback_suggestions:
        if len(suggestions) >= 3:
            break
        suggestions.append(suggestion)

    return suggestions


def build_issues(transcript: dict, visual_metrics: dict) -> list[dict]:
    issues = []
    filler_total = get_filler_total(transcript)
    speech_rate_reliable = transcript.get("speech_rate_reliable", True)

    if not transcript.get("mock_mode") and filler_total > 10:
        issues.append(
            {
                "time": "全文",
                "type": "口头禅",
                "message": "这一段可能出现较多口头禅，建议用停顿替代表达填充词。",
            }
        )

    if speech_rate_reliable and transcript.get("speech_rate", 0) > 200:
        issues.append(
            {
                "time": "全程",
                "type": "语速偏快",
                "message": "这一阶段表达节奏可能偏快，建议在重点句后加入短暂停顿。",
            }
        )

    if not transcript.get("mock_mode") and transcript.get("logic_words_count", 0) < 3:
        issues.append(
            {
                "time": "全文",
                "type": "结构提示",
                "message": "没有检测到足够的逻辑连接词，建议用更清晰的顺序词组织观点。",
            }
        )

    for event_time in visual_metrics.get("head_down_events", [])[:2]:
        issues.append(
            {
                "time": _clamp_issue_time(transcript, event_time, 0.3),
                "type": "低头",
                "message": "检测到这一时刻头部朝向偏低，可能影响表达稳定感，建议减少长时间看稿。",
            }
        )

    for event_time in visual_metrics.get("face_block_events", [])[:2]:
        issues.append(
            {
                "time": _clamp_issue_time(transcript, event_time, 0.35),
                "type": "面部遮挡",
                "message": "检测到手部靠近面部，建议演讲时保持面部区域清晰可见。",
            }
        )

    if visual_metrics.get("body_sway_score", 100) < 70:
        issues.append(
            {
                "time": "全程",
                "type": "身体晃动",
                "message": "检测到身体移动较明显，建议保持重心稳定。",
            }
        )

    if visual_metrics.get("looking_camera_ratio", 1) < 0.6:
        issues.append(
            {
                "time": "全程",
                "type": "镜头交流",
                "message": "这一阶段镜头交流比例偏低，建议减少低头看稿。",
            }
        )

    if visual_metrics.get("gesture_activity", 1) < 0.2:
        issues.append(
            {
                "time": "全程",
                "type": "手势偏少",
                "message": "这一阶段手势活动较少，可以在强调重点时加入自然手势。",
            }
        )

    if not issues:
        issues.append(
            {
                "time": _issue_time(transcript, 0.5, "00:05"),
                "type": "表达节奏",
                "message": "本次未检测到突出问题，建议继续保持稳定节奏并优化重点停顿。",
            }
        )

    return issues


def build_summary(scores: dict) -> str:
    overall = scores.get("overall", 0)

    if overall is None:
        return "本次部分分析数据未达到可靠标准，系统不会用降级数据生成综合分；请根据可信度检查提示完善配置后重新分析。"

    if overall >= 85:
        return "本次演讲整体表现较好，内容、语音和视觉表达较均衡，可以继续提升细节表现。"
    if overall >= 70:
        return "本次演讲整体完成度较高，但在镜头交流、手势或表达节奏方面仍有提升空间。"
    return "本次演讲已经完成基本表达，但在结构清晰度、语音节奏和身体表现方面建议继续训练。"


def _speech_status_message(transcript: dict) -> str:
    if transcript.get("mock_mode"):
        return transcript.get("mock_reason") or "未检测到文本。"

    source = transcript.get("source")
    if source == "aliyun_nls":
        return "阿里云智能语音交互已完成真实语音识别。"
    if source == "vosk_zh":
        return "Vosk 中文模型已完成离线语音识别。"
    if source == "vosk_en":
        return "Vosk 英文模型已完成离线语音识别。"
    return "已完成真实语音识别。"


def build_quality_assessment(transcript: dict, visual_metrics: dict) -> dict:
    checks = []
    duration = _duration_seconds(transcript)
    word_count = int(transcript.get("word_count") or 0)
    frame_count = int(visual_metrics.get("analysis_frame_count") or 0)
    analyzed_duration = float(visual_metrics.get("analyzed_duration_seconds") or duration or 0)

    speech_ok = not transcript.get("mock_mode") and word_count >= max(8, duration * 0.35)
    visual_ok = not visual_metrics.get("mock_mode") and frame_count >= min(30, max(1, duration / 10))
    coverage_ok = not duration or analyzed_duration >= duration * 0.9
    checks.append({"label": "语音转写", "passed": speech_ok, "detail": f"识别 {word_count} 字，覆盖时长 {round(duration)} 秒。"})
    checks.append({"label": "视觉抽帧", "passed": visual_ok, "detail": f"全程均匀分析 {frame_count} 帧。"})
    checks.append({"label": "时长覆盖", "passed": coverage_ok, "detail": f"视觉覆盖约 {round(analyzed_duration)} / {round(duration)} 秒。"})
    passed = sum(1 for item in checks if item["passed"])
    level = "high" if passed == 3 else "medium" if passed == 2 else "low"
    return {
        "level": level,
        "label": {"high": "数据质量良好", "medium": "部分结果需复核", "low": "结果仅供参考"}[level],
        "checks": checks,
    }


def enrich_report(report: dict, transcript: dict, visual_metrics: dict, scores: dict) -> dict:
    report["transcript"] = transcript
    report["visual_metrics"] = visual_metrics
    report["scores"] = scores
    report["suggestions"] = build_suggestions(transcript, visual_metrics)
    report["issues"] = build_issues(transcript, visual_metrics)
    report["summary"] = build_summary(scores)
    report["quality_assessment"] = build_quality_assessment(transcript, visual_metrics)
    report["analysis_status"] = {
        "speech": {
            "mode": "mock" if transcript.get("mock_mode") else "real",
            "message": _speech_status_message(transcript),
        },
        "visual": {
            "mode": "mock" if visual_metrics.get("mock_mode") else visual_metrics.get("fallback_mode", "real"),
            "message": visual_metrics.get("mock_reason")
            or visual_metrics.get("analysis_note")
            or (
                f"MediaPipe 已分析 {visual_metrics.get('analysis_frame_count', 0)} 帧视频。"
                if not visual_metrics.get("mock_mode")
                else "视觉分析已使用演示指标。"
            ),
        },
    }
    return report


def build_fallback_report(filename: str, reason: str | None = None, duration: float | int = 120) -> dict:
    report = build_report_shell(filename, duration)
    transcript = analyze_text(MOCK_TRANSCRIPT_TEXT, duration, mock_mode=True)
    transcript["mock_reason"] = reason or "演示模式已启用，使用 mock 文本报告。"
    visual_metrics = build_mock_visual_metrics(reason or "演示模式已启用，使用 mock 视觉指标。")
    scores = calculate_scores(transcript, visual_metrics)
    return enrich_report(report, transcript, visual_metrics, scores)
