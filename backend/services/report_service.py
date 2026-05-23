from services.gesture_service import build_mock_visual_metrics
from services.scoring_service import calculate_scores, get_filler_total
from services.speech_service import MOCK_TRANSCRIPT_TEXT
from services.text_analysis_service import analyze_text


def _format_issue_time(seconds: float) -> str:
    seconds = max(0, round(seconds))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def _issue_time(transcript: dict, ratio: float, fallback: str) -> str:
    duration = transcript.get("duration")
    if not duration:
        return fallback
    return _format_issue_time(float(duration) * ratio)


def build_mock_report(filename: str) -> dict:
    return {
        "video_info": {
            "filename": filename,
            "duration": 120,
            "fps": 30,
            "width": 1280,
            "height": 720,
        },
        "transcript": {
            "text": "大家好，今天我演讲的主题是人工智能如何帮助我们提升公众表达能力。首先，AI 可以帮助我们发现表达中的问题。其次，它可以给出具体的改进建议。最后，通过不断训练，我们可以变得更加自信和清晰。",
            "word_count": 92,
            "duration": 120,
            "speech_rate": 46,
            "filler_words": {
                "嗯": 3,
                "啊": 2,
                "然后": 5,
                "就是": 4,
            },
        },
        "visual_metrics": {
            "face_visible_ratio": 0.92,
            "looking_camera_ratio": 0.68,
            "head_down_count": 6,
            "body_sway_score": 72,
            "gesture_activity": 0.35,
            "hand_visible_ratio": 0.48,
            "face_block_count": 2,
            "expression_change_score": 65,
        },
        "scores": {
            "content": 78,
            "voice": 82,
            "gesture": 74,
            "posture": 76,
            "camera_contact": 68,
            "overall": 76,
        },
        "issues": [
            {
                "time": "00:36",
                "type": "口头禅",
                "message": "这一段出现较多“然后”，建议替换为更清晰的连接词。",
            },
            {
                "time": "01:12",
                "type": "身体晃动",
                "message": "检测到身体左右移动较明显，建议保持重心稳定。",
            },
        ],
        "suggestions": [
            "语速整体较合适，但重点句后可以增加停顿。",
            "演讲中低头次数偏多，建议减少看稿时间。",
            "手势活跃度略低，可以在列举观点时加入自然开放式手势。",
        ],
        "summary": "本次演讲主题较明确，语速较稳定，但镜头交流和手势表现仍有提升空间。",
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
        suggestions.append("语音识别本次未完成，文本相关建议使用演示估算；正式展示前建议准备一段声音清晰的 1 到 3 分钟视频。")
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
                "time": "00:36",
                "type": "口头禅",
                "message": "这一段可能出现较多口头禅，建议用停顿替代表达填充词。",
            }
        )

    if speech_rate_reliable and transcript.get("speech_rate", 0) > 200:
        issues.append(
            {
                "time": _issue_time(transcript, 0.2, "00:20"),
                "type": "语速偏快",
                "message": "这一阶段表达节奏可能偏快，建议在重点句后加入短暂停顿。",
            }
        )

    if not transcript.get("mock_mode") and transcript.get("logic_words_count", 0) < 3:
        issues.append(
            {
                "time": _issue_time(transcript, 0.15, "00:15"),
                "type": "结构提示",
                "message": "没有检测到足够的逻辑连接词，建议用更清晰的顺序词组织观点。",
            }
        )

    for event_time in visual_metrics.get("head_down_events", [])[:2]:
        issues.append(
            {
                "time": event_time,
                "type": "低头",
                "message": "检测到这一时刻头部朝向偏低，可能影响表达稳定感，建议减少长时间看稿。",
            }
        )

    for event_time in visual_metrics.get("face_block_events", [])[:2]:
        issues.append(
            {
                "time": event_time,
                "type": "面部遮挡",
                "message": "检测到手部靠近面部，建议演讲时保持面部区域清晰可见。",
            }
        )

    if visual_metrics.get("body_sway_score", 100) < 70:
        issues.append(
            {
                "time": _issue_time(transcript, 0.6, "01:12"),
                "type": "身体晃动",
                "message": "检测到身体移动较明显，建议保持重心稳定。",
            }
        )

    if visual_metrics.get("looking_camera_ratio", 1) < 0.6:
        issues.append(
            {
                "time": _issue_time(transcript, 0.4, "00:48"),
                "type": "镜头交流",
                "message": "这一阶段镜头交流比例偏低，建议减少低头看稿。",
            }
        )

    if visual_metrics.get("gesture_activity", 1) < 0.2:
        issues.append(
            {
                "time": _issue_time(transcript, 0.55, "01:05"),
                "type": "手势偏少",
                "message": "这一阶段手势活动较少，可以在强调重点时加入自然手势。",
            }
        )

    if not issues:
        issues.append(
            {
                "time": "00:30",
                "type": "表达节奏",
                "message": "本次未检测到突出问题，建议继续保持稳定节奏并优化重点停顿。",
            }
        )

    return issues


def build_summary(scores: dict) -> str:
    overall = scores.get("overall", 0)

    if overall >= 85:
        return "本次演讲整体表现较好，内容、语音和视觉表达较均衡，可以继续提升细节表现。"
    if overall >= 70:
        return "本次演讲整体完成度较高，但在镜头交流、手势或表达节奏方面仍有提升空间。"
    return "本次演讲已经完成基本表达，但在结构清晰度、语音节奏和身体表现方面建议继续训练。"


def enrich_report(report: dict, transcript: dict, visual_metrics: dict, scores: dict) -> dict:
    report["transcript"] = transcript
    report["visual_metrics"] = visual_metrics
    report["scores"] = scores
    report["suggestions"] = build_suggestions(transcript, visual_metrics)
    report["issues"] = build_issues(transcript, visual_metrics)
    report["summary"] = build_summary(scores)
    report["analysis_status"] = {
        "speech": {
            "mode": "mock" if transcript.get("mock_mode") else "real",
            "message": transcript.get("mock_reason")
            or (
                "Vosk 已完成真实语音识别。"
                if not transcript.get("mock_mode")
                else "未检测到文本。"
            ),
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
    report = build_mock_report(filename)
    transcript = analyze_text(MOCK_TRANSCRIPT_TEXT, duration, mock_mode=True)
    transcript["mock_reason"] = reason or "演示模式已启用，使用 mock 文本报告。"
    visual_metrics = build_mock_visual_metrics(reason or "演示模式已启用，使用 mock 视觉指标。")
    scores = calculate_scores(transcript, visual_metrics)
    report["video_info"]["duration"] = duration
    return enrich_report(report, transcript, visual_metrics, scores)
