from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile


UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"


def ensure_upload_dir() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def safe_upload_name(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    stem = Path(filename).stem.strip().replace(" ", "_") or "video"
    cleaned_stem = "".join(char for char in stem if char.isalnum() or char in ("-", "_"))
    return f"{cleaned_stem}_{uuid4().hex[:8]}{suffix}"


async def save_upload_file(file: UploadFile) -> Path:
    ensure_upload_dir()
    destination = UPLOAD_DIR / safe_upload_name(file.filename or "video.mp4")

    with destination.open("wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)

    await file.close()
    return destination
