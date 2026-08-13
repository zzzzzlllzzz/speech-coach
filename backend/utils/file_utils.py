from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile


UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"


class UploadTooLargeError(ValueError):
    pass


def ensure_upload_dir() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def safe_upload_name(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    stem = Path(filename).stem.strip().replace(" ", "_") or "video"
    cleaned_stem = "".join(char for char in stem if char.isalnum() or char in ("-", "_"))
    return f"{cleaned_stem}_{uuid4().hex[:8]}{suffix}"


async def save_upload_file(file: UploadFile, max_bytes: int | None = None) -> Path:
    ensure_upload_dir()
    destination = UPLOAD_DIR / safe_upload_name(file.filename or "video.mp4")
    written = 0

    try:
        with destination.open("wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                written += len(chunk)
                if max_bytes is not None and written > max_bytes:
                    raise UploadTooLargeError("上传文件超过大小限制。")
                buffer.write(chunk)
        return destination
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await file.close()
