from pathlib import Path
from statistics import mean
import math
import os


MOCK_VISUAL_METRICS = {
    "face_visible_ratio": 0.9,
    "looking_camera_ratio": 0.62,
    "head_down_count": 5,
    "body_sway_score": 75,
    "gesture_activity": 0.32,
    "hand_visible_ratio": 0.45,
    "face_block_count": 2,
    "expression_change_score": 68,
    "analysis_frame_count": 0,
    "head_down_events": ["00:48"],
    "face_block_events": ["01:10"],
    "mock_mode": True,
}


def build_mock_visual_metrics(reason: str | None = None) -> dict:
    metrics = dict(MOCK_VISUAL_METRICS)
    if reason:
        metrics["mock_reason"] = reason
    return metrics


def _distance(point_a: tuple[float, float], point_b: tuple[float, float]) -> float:
    return math.hypot(point_a[0] - point_b[0], point_a[1] - point_b[1])


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _format_time(seconds: float) -> str:
    seconds = max(0, round(seconds))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def _face_box(face_landmarks) -> tuple[float, float, float, float]:
    xs = [landmark.x for landmark in face_landmarks.landmark]
    ys = [landmark.y for landmark in face_landmarks.landmark]
    return min(xs), min(ys), max(xs), max(ys)


def _is_point_near_box(point: tuple[float, float], box: tuple[float, float, float, float]) -> bool:
    min_x, min_y, max_x, max_y = box
    padding_x = (max_x - min_x) * 0.2
    padding_y = (max_y - min_y) * 0.2
    return (
        min_x - padding_x <= point[0] <= max_x + padding_x
        and min_y - padding_y <= point[1] <= max_y + padding_y
    )


def _face_feature(face_landmarks, face_box: tuple[float, float, float, float]) -> tuple[float, float, float]:
    landmarks = face_landmarks.landmark
    min_x, min_y, max_x, max_y = face_box
    face_w = max(max_x - min_x, 0.001)
    face_h = max(max_y - min_y, 0.001)
    mouth_gap = abs(landmarks[13].y - landmarks[14].y) / face_h
    mouth_width = abs(landmarks[61].x - landmarks[291].x) / face_w
    brow_eye_gap = abs(landmarks[159].y - landmarks[65].y) / face_h
    return mouth_gap, mouth_width, brow_eye_gap


def _analyze_with_opencv(video_path: Path, frame_step: int, max_seconds: int, reason: str) -> dict:
    try:
        import cv2
        import numpy as np
    except Exception as exc:
        return build_mock_visual_metrics(f"{reason}；OpenCV fallback 也不可用：{exc}")

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return build_mock_visual_metrics(f"{reason}；OpenCV 无法打开视频。")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    max_frame_index = int(min(cap.get(cv2.CAP_PROP_FRAME_COUNT) or fps * max_seconds, fps * max_seconds))
    frame_step = max(frame_step, math.ceil(max_frame_index / 300))
    cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
    face_detector = cv2.CascadeClassifier(str(cascade_path))
    if face_detector.empty():
        cap.release()
        return build_mock_visual_metrics(f"{reason}；OpenCV 人脸检测器加载失败。")

    total = 0
    face_visible = 0
    looking_camera = 0
    hand_visible = 0
    face_block_count = 0
    head_down_count = 0
    was_head_down = False
    was_face_blocked = False
    head_down_events: list[str] = []
    face_block_events: list[str] = []
    face_centers: list[float] = []
    motion_scores: list[float] = []
    hand_motion_scores: list[float] = []
    expression_scores: list[float] = []
    previous_gray = None
    previous_face_roi = None

    frame_index = 0
    while frame_index < max_frame_index:
        ok, frame = cap.read()
        if not ok:
            break

        if frame_index % frame_step != 0:
            frame_index += 1
            continue

        total += 1
        height, width = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb)
        skin_mask = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))
        skin_mask = cv2.medianBlur(skin_mask, 5)
        small_gray = cv2.resize(gray, (160, 90))

        if previous_gray is not None:
            motion_scores.append(float(np.mean(cv2.absdiff(previous_gray, small_gray))) / 255)

        faces = face_detector.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5, minSize=(60, 60))
        head_down = False
        face_blocked = False
        hand_visible_frame = False
        if len(faces) > 0:
            face_visible += 1
            x, y, w, h = max(faces, key=lambda item: item[2] * item[3])
            center_x = (x + w / 2) / width
            center_y = (y + h / 2) / height
            face_centers.append(center_x)
            head_down = center_y > 0.58

            if 0.35 <= center_x <= 0.65 and 0.18 <= center_y <= 0.72 and not head_down:
                looking_camera += 1

            face_roi = cv2.resize(gray[y : y + h, x : x + w], (64, 64))
            if previous_face_roi is not None:
                expression_scores.append(float(np.mean(cv2.absdiff(previous_face_roi, face_roi))) / 255)
            previous_face_roi = face_roi

            outer_x1 = max(0, int(x - w * 0.6))
            outer_y1 = max(0, int(y - h * 0.4))
            outer_x2 = min(width, int(x + w * 1.6))
            outer_y2 = min(height, int(y + h * 1.8))
            near_face_mask = skin_mask[outer_y1:outer_y2, outer_x1:outer_x2].copy()
            face_x1 = max(0, x - outer_x1)
            face_y1 = max(0, y - outer_y1)
            face_x2 = min(near_face_mask.shape[1], face_x1 + w)
            face_y2 = min(near_face_mask.shape[0], face_y1 + h)
            near_face_mask[face_y1:face_y2, face_x1:face_x2] = 0
            face_blocked = cv2.countNonZero(near_face_mask) / max(near_face_mask.size, 1) > 0.035

            zone_x1 = max(0, int(x - w * 1.2))
            zone_y1 = max(0, int(y + h * 0.5))
            zone_x2 = min(width, int(x + w * 2.2))
            zone_y2 = min(height, int(y + h * 3.2))
        else:
            zone_x1 = int(width * 0.15)
            zone_y1 = int(height * 0.35)
            zone_x2 = int(width * 0.85)
            zone_y2 = int(height * 0.95)

        hand_zone_mask = skin_mask[zone_y1:zone_y2, zone_x1:zone_x2]
        skin_ratio = cv2.countNonZero(hand_zone_mask) / max(hand_zone_mask.size, 1)
        hand_motion = 0
        if previous_gray is not None:
            current_small_zone = small_gray[
                int(zone_y1 / height * 90) : max(int(zone_y2 / height * 90), int(zone_y1 / height * 90) + 1),
                int(zone_x1 / width * 160) : max(int(zone_x2 / width * 160), int(zone_x1 / width * 160) + 1),
            ]
            previous_small_zone = previous_gray[
                int(zone_y1 / height * 90) : max(int(zone_y2 / height * 90), int(zone_y1 / height * 90) + 1),
                int(zone_x1 / width * 160) : max(int(zone_x2 / width * 160), int(zone_x1 / width * 160) + 1),
            ]
            if current_small_zone.size and previous_small_zone.size:
                hand_motion = float(np.mean(cv2.absdiff(previous_small_zone, current_small_zone))) / 255
                hand_motion_scores.append(hand_motion)

        hand_visible_frame = hand_visible_frame or skin_ratio > 0.025 or hand_motion > 0.035
        if hand_visible_frame:
            hand_visible += 1

        if face_blocked and not was_face_blocked:
            face_block_count += 1
            face_block_events.append(_format_time(frame_index / fps))
        was_face_blocked = face_blocked

        if head_down and not was_head_down:
            head_down_count += 1
            head_down_events.append(_format_time(frame_index / fps))
        was_head_down = head_down
        previous_gray = small_gray
        frame_index += 1

    cap.release()

    if total == 0:
        return build_mock_visual_metrics(f"{reason}；OpenCV 未读取到有效帧。")

    sway_score = 75
    if face_centers:
        sway_score = round(_clamp(100 - (max(face_centers) - min(face_centers)) * 240, 0, 100))

    motion_level = mean(hand_motion_scores or motion_scores) if (hand_motion_scores or motion_scores) else 0
    gesture_activity = round(_clamp(motion_level * 8, 0, 1), 2)
    expression_change_score = round(_clamp((mean(expression_scores) if expression_scores else 0) * 500, 0, 100))

    return {
        "face_visible_ratio": round(face_visible / total, 2),
        "looking_camera_ratio": round(looking_camera / total, 2),
        "head_down_count": head_down_count,
        "body_sway_score": sway_score,
        "gesture_activity": gesture_activity,
        "hand_visible_ratio": round(hand_visible / total, 2),
        "face_block_count": face_block_count,
        "expression_change_score": expression_change_score,
        "analysis_frame_count": total,
        "analyzed_duration_seconds": round(max_frame_index / fps, 2),
        "sample_interval_frames": frame_step,
        "head_down_events": head_down_events[:5],
        "face_block_events": face_block_events[:5],
        "mock_mode": False,
        "fallback_mode": "opencv",
        "analysis_note": f"MediaPipe 不可用，已使用 OpenCV 对真实视频帧做近似视觉分析。原因：{reason}",
        "metric_sources": {
            "face_visible_ratio": "opencv_haar_face",
            "looking_camera_ratio": "opencv_face_center",
            "head_down_count": "opencv_face_position",
            "body_sway_score": "opencv_face_motion",
            "gesture_activity": "opencv_motion_and_skin",
            "hand_visible_ratio": "opencv_skin_and_motion",
            "face_block_count": "opencv_skin_near_face",
            "expression_change_score": "opencv_face_roi_change",
        },
    }


def analyze_visual_metrics(video_path: Path, frame_step: int = 30, max_seconds: int = 1800) -> dict:
    try:
        os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
        import cv2
    except Exception as exc:
        return build_mock_visual_metrics(f"OpenCV 不可用：{exc}")

    try:
        import mediapipe as mp
    except Exception as exc:
        return _analyze_with_opencv(video_path, frame_step, max_seconds, f"MediaPipe 不可用：{exc}")

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return build_mock_visual_metrics("OpenCV 无法打开视频。")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    max_frame_index = int(min(cap.get(cv2.CAP_PROP_FRAME_COUNT) or fps * max_seconds, fps * max_seconds))
    frame_step = max(frame_step, math.ceil(max_frame_index / 300))

    try:
        mp_pose = mp.solutions.pose
        mp_hands = mp.solutions.hands
        mp_face_mesh = mp.solutions.face_mesh
    except Exception as exc:
        cap.release()
        return _analyze_with_opencv(video_path, frame_step, max_seconds, f"MediaPipe solutions API 不可用：{exc}")

    total = 0
    face_visible = 0
    looking_camera = 0
    hand_visible = 0
    head_down_count = 0
    face_block_count = 0
    was_head_down = False
    was_face_blocked = False
    body_centers: list[float] = []
    hand_centers: list[tuple[float, float]] = []
    gesture_movements: list[float] = []
    expression_features: list[tuple[float, float, float]] = []
    head_down_events: list[str] = []
    face_block_events: list[str] = []
    detected_any_keypoints = False

    try:
        with mp_pose.Pose(
            static_image_mode=False,
            model_complexity=0,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        ) as pose, mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        ) as hands, mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        ) as face_mesh:
            frame_index = 0
            while frame_index < max_frame_index:
                ok, frame = cap.read()
                if not ok:
                    break

                if frame_index % frame_step != 0:
                    frame_index += 1
                    continue

                total += 1
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                rgb.flags.writeable = False

                pose_result = pose.process(rgb)
                hands_result = hands.process(rgb)
                face_result = face_mesh.process(rgb)

                face_box = None
                head_down = False

                if face_result.multi_face_landmarks:
                    detected_any_keypoints = True
                    face_visible += 1
                    face_landmarks = face_result.multi_face_landmarks[0]
                    face_box = _face_box(face_landmarks)
                    min_x, min_y, max_x, max_y = face_box
                    face_center_x = (min_x + max_x) / 2
                    face_center_y = (min_y + max_y) / 2
                    face_h = max(max_y - min_y, 0.001)

                    landmarks = face_landmarks.landmark
                    eye_y = (landmarks[33].y + landmarks[263].y) / 2
                    nose_y = landmarks[1].y
                    head_down = face_center_y > 0.58 or nose_y > eye_y + face_h * 0.38

                    expression_features.append(_face_feature(face_landmarks, face_box))
                    if 0.35 <= face_center_x <= 0.65 and 0.18 <= face_center_y <= 0.72 and not head_down:
                        looking_camera += 1

                pose_hand_points = []
                if pose_result.pose_landmarks:
                    detected_any_keypoints = True
                    pose_landmarks = pose_result.pose_landmarks.landmark
                    left_shoulder = pose_landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER]
                    right_shoulder = pose_landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER]
                    left_wrist = pose_landmarks[mp_pose.PoseLandmark.LEFT_WRIST]
                    right_wrist = pose_landmarks[mp_pose.PoseLandmark.RIGHT_WRIST]
                    nose = pose_landmarks[mp_pose.PoseLandmark.NOSE]

                    if left_shoulder.visibility > 0.45 and right_shoulder.visibility > 0.45:
                        shoulder_center_x = (left_shoulder.x + right_shoulder.x) / 2
                        shoulder_center_y = (left_shoulder.y + right_shoulder.y) / 2
                        body_centers.append(shoulder_center_x)
                        head_down = head_down or (
                            nose.visibility > 0.45 and nose.y > shoulder_center_y - 0.16
                        )

                    for wrist in (left_wrist, right_wrist):
                        if wrist.visibility > 0.45:
                            pose_hand_points.append((wrist.x, wrist.y))

                hand_points = []
                if hands_result.multi_hand_landmarks:
                    detected_any_keypoints = True
                    for hand_landmarks in hands_result.multi_hand_landmarks:
                        hand_points.extend((landmark.x, landmark.y) for landmark in hand_landmarks.landmark)

                all_hand_points = hand_points or pose_hand_points
                if all_hand_points:
                    hand_visible += 1
                    hand_center = (
                        mean(point[0] for point in all_hand_points),
                        mean(point[1] for point in all_hand_points),
                    )
                    if hand_centers:
                        gesture_movements.append(_distance(hand_centers[-1], hand_center))
                    hand_centers.append(hand_center)

                face_blocked = bool(face_box and any(_is_point_near_box(point, face_box) for point in all_hand_points))
                if face_blocked and not was_face_blocked:
                    face_block_count += 1
                    face_block_events.append(_format_time(frame_index / fps))
                was_face_blocked = face_blocked

                if head_down and not was_head_down:
                    head_down_count += 1
                    head_down_events.append(_format_time(frame_index / fps))
                was_head_down = head_down

                frame_index += 1
    except Exception as exc:
        cap.release()
        return _analyze_with_opencv(video_path, frame_step, max_seconds, f"MediaPipe 分析失败：{exc}")

    cap.release()

    if total == 0 or not detected_any_keypoints:
        return _analyze_with_opencv(video_path, frame_step, max_seconds, "MediaPipe 未检测到足够的人脸、姿态或手部关键点。")

    body_sway_score = 75
    if body_centers:
        sway_range = max(body_centers) - min(body_centers)
        body_sway_score = round(_clamp(100 - sway_range * 260, 0, 100))

    gesture_activity = 0
    if gesture_movements:
        gesture_activity = round(_clamp(mean(gesture_movements) * 8, 0, 1), 2)

    expression_change_score = 0
    if len(expression_features) >= 2:
        deltas = [
            mean(abs(current[index] - previous[index]) for index in range(3))
            for previous, current in zip(expression_features, expression_features[1:])
        ]
        expression_change_score = round(_clamp(mean(deltas) * 450, 0, 100))

    return {
        "face_visible_ratio": round(face_visible / total, 2),
        "looking_camera_ratio": round(looking_camera / total, 2),
        "head_down_count": head_down_count,
        "body_sway_score": body_sway_score,
        "gesture_activity": gesture_activity,
        "hand_visible_ratio": round(hand_visible / total, 2),
        "face_block_count": face_block_count,
        "expression_change_score": expression_change_score,
        "analysis_frame_count": total,
        "analyzed_duration_seconds": round(max_frame_index / fps, 2),
        "sample_interval_frames": frame_step,
        "head_down_events": head_down_events[:5],
        "face_block_events": face_block_events[:5],
        "mock_mode": False,
        "metric_sources": {
            "face_visible_ratio": "mediapipe_face_mesh",
            "looking_camera_ratio": "mediapipe_face_center",
            "head_down_count": "mediapipe_face_pose",
            "body_sway_score": "mediapipe_pose_shoulders",
            "gesture_activity": "mediapipe_hands_pose_motion",
            "hand_visible_ratio": "mediapipe_hands_pose",
            "face_block_count": "mediapipe_hand_face_distance",
            "expression_change_score": "mediapipe_face_landmark_change",
        },
    }
