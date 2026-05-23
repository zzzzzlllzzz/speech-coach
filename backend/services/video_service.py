from pathlib import Path


def inspect_video(video_path: Path) -> dict:
    try:
        import cv2

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise RuntimeError("OpenCV 无法打开视频文件。")

        fps = cap.get(cv2.CAP_PROP_FPS) or 0
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        cap.release()

        duration = round(frame_count / fps, 2) if fps > 0 else 0

        return {
            "filename": video_path.name,
            "duration": duration or 120,
            "fps": round(fps, 2) if fps else 30,
            "width": width or 1280,
            "height": height or 720,
            "mock_mode": False,
        }
    except Exception as exc:
        return {
            "filename": video_path.name,
            "duration": 120,
            "fps": 30,
            "width": 1280,
            "height": 720,
            "mock_mode": True,
            "error": str(exc),
        }
