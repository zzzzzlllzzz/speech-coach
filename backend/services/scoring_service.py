def clamp_score(value: float | int) -> int:
    return max(0, min(100, round(value)))


def get_filler_total(transcript: dict) -> int:
    return sum((transcript.get("filler_words") or {}).values())


def score_content(transcript: dict) -> int:
    if transcript.get("mock_mode"):
        return 70

    score = 70
    filler_total = get_filler_total(transcript)

    if transcript.get("has_opening"):
        score += 5
    if transcript.get("has_ending"):
        score += 5
    if transcript.get("logic_words_count", 0) >= 5:
        score += 8
    if transcript.get("word_count", 0) >= 150:
        score += 5

    if 5 <= filler_total <= 10:
        score -= 5
    elif 11 <= filler_total <= 20:
        score -= 10
    elif filler_total > 20:
        score -= 15

    if transcript.get("logic_words_count", 0) < 3:
        score -= 8

    return clamp_score(score)


def score_voice(transcript: dict) -> int:
    if transcript.get("speech_rate_reliable") is False:
        return 70

    speech_rate = transcript.get("speech_rate", 0)
    filler_total = get_filler_total(transcript)

    if 140 <= speech_rate <= 190:
        score = 85
    elif 100 <= speech_rate <= 139 or 191 <= speech_rate <= 220:
        score = 75
    else:
        score = 60

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
        score = 85
    elif gesture_activity < 0.2:
        score = 68
    else:
        score = 72

    if hand_visible_ratio is not None and hand_visible_ratio < 0.25:
        score -= 8
    if face_block_count is not None and face_block_count > 3:
        score -= 8

    return clamp_score(score)


def score_posture(visual_metrics: dict) -> int:
    score = visual_metrics.get("body_sway_score", 75)
    head_down_count = visual_metrics.get("head_down_count", 0)

    if head_down_count > 10:
        score -= 10
    elif head_down_count > 5:
        score -= 5

    return clamp_score(score)


def score_camera_contact(visual_metrics: dict) -> int:
    looking_camera_ratio = visual_metrics.get("looking_camera_ratio", 0)

    if looking_camera_ratio >= 0.75:
        return 90
    if looking_camera_ratio >= 0.55:
        return 75
    if looking_camera_ratio >= 0.35:
        return 65
    return 55


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

    return {
        "content": content,
        "voice": voice,
        "gesture": gesture,
        "posture": posture,
        "camera_contact": camera_contact,
        "overall": overall,
    }
