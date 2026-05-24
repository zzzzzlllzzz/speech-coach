def clamp_score(value: float | int) -> int:
    return max(0, min(100, round(value)))


def get_filler_total(transcript: dict) -> int:
    return sum((transcript.get("filler_words") or {}).values())


def _word_count(transcript: dict) -> int:
    return int(transcript.get("word_count") or 0)


def _duration(transcript: dict) -> float:
    try:
        return float(transcript.get("duration") or 0)
    except (TypeError, ValueError):
        return 0


def _has_effective_text(transcript: dict) -> bool:
    text = (transcript.get("text") or "").strip()
    return bool(text) and _word_count(transcript) >= 8 and not transcript.get("mock_mode")


def score_content(transcript: dict) -> int:
    if not _has_effective_text(transcript):
        return 35

    score = 52
    filler_total = get_filler_total(transcript)
    word_count = _word_count(transcript)
    logic_count = transcript.get("logic_words_count", 0)

    if transcript.get("has_opening"):
        score += 8
    else:
        score -= 8

    if transcript.get("has_topic"):
        score += 10
    else:
        score -= 12

    if transcript.get("has_ending"):
        score += 8
    else:
        score -= 8

    if logic_count >= 5:
        score += 8
    elif logic_count < 2:
        score -= 10

    if word_count >= 150:
        score += 8
    elif word_count >= 80:
        score += 5
    elif word_count < 30:
        score -= 12

    if 5 <= filler_total <= 10:
        score -= 5
    elif 11 <= filler_total <= 20:
        score -= 10
    elif filler_total > 20:
        score -= 15

    return clamp_score(score)


def score_voice(transcript: dict) -> int:
    if not _has_effective_text(transcript):
        return 35
    if transcript.get("speech_rate_reliable") is False:
        return 45

    speech_rate = transcript.get("speech_rate", 0)
    filler_total = get_filler_total(transcript)
    word_count = _word_count(transcript)

    if 120 <= speech_rate <= 190:
        score = 82
    elif 90 <= speech_rate <= 119 or 191 <= speech_rate <= 220:
        score = 68
    elif 60 <= speech_rate <= 89 or 221 <= speech_rate <= 260:
        score = 52
    else:
        score = 38

    if word_count < 30:
        score -= 8

    if filler_total > 20:
        score -= 10
    elif filler_total > 10:
        score -= 5

    return clamp_score(score)


def score_gesture(visual_metrics: dict) -> int:
    gesture_activity = visual_metrics.get("gesture_activity", 0)
    hand_visible_ratio = visual_metrics.get("hand_visible_ratio", 0)
    face_block_count = visual_metrics.get("face_block_count", 0)

    if 0.2 <= gesture_activity <= 0.55:
        score = 78
    elif gesture_activity < 0.12:
        score = 50
    elif gesture_activity < 0.2:
        score = 62
    elif gesture_activity > 0.7:
        score = 55
    else:
        score = 65

    if hand_visible_ratio is not None and hand_visible_ratio < 0.25:
        score -= 12
    if face_block_count is not None and face_block_count > 3:
        score -= 10

    return clamp_score(score)


def score_posture(visual_metrics: dict) -> int:
    score = visual_metrics.get("body_sway_score", 75)
    head_down_count = visual_metrics.get("head_down_count", 0)
    face_visible_ratio = visual_metrics.get("face_visible_ratio", 1)

    if head_down_count > 10:
        score -= 15
    elif head_down_count > 5:
        score -= 8
    if face_visible_ratio is not None and face_visible_ratio < 0.5:
        score -= 8

    return clamp_score(score)


def score_camera_contact(visual_metrics: dict) -> int:
    looking_camera_ratio = visual_metrics.get("looking_camera_ratio", 0)

    if looking_camera_ratio >= 0.75:
        return 82
    if looking_camera_ratio >= 0.55:
        return 70
    if looking_camera_ratio >= 0.35:
        return 55
    return 40


def calculate_scores(transcript: dict, visual_metrics: dict) -> dict:
    content = score_content(transcript)
    voice = score_voice(transcript)
    gesture = score_gesture(visual_metrics)
    posture = score_posture(visual_metrics)
    camera_contact = score_camera_contact(visual_metrics)

    overall = clamp_score(
        content * 0.3
        + voice * 0.2
        + gesture * 0.15
        + posture * 0.15
        + camera_contact * 0.2
    )

    if not _has_effective_text(transcript):
        overall = min(overall, 62)
    elif _word_count(transcript) < 30 or _duration(transcript) < 15:
        overall = min(overall, 68)

    if (
        not transcript.get("has_opening")
        and not transcript.get("has_topic")
        and not transcript.get("has_ending")
    ):
        overall = min(overall, 65)

    if transcript.get("mock_mode") and visual_metrics.get("mock_mode"):
        overall = min(overall, 58)

    return {
        "content": content,
        "voice": voice,
        "gesture": gesture,
        "posture": posture,
        "camera_contact": camera_contact,
        "overall": overall,
    }
