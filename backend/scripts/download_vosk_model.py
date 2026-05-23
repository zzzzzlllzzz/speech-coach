from pathlib import Path
import os
import shutil
import urllib.request
import zipfile


MODEL_URL = os.getenv(
    "VOSK_MODEL_URL",
    "https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip",
)
MODEL_DIR = Path(os.getenv("VOSK_MODEL_PATH", "/app/models/vosk-model-small-cn-0.22"))


def main() -> None:
    if MODEL_DIR.exists():
        print(f"Vosk model already exists: {MODEL_DIR}")
        return

    MODEL_DIR.parent.mkdir(parents=True, exist_ok=True)
    archive_path = MODEL_DIR.parent / "vosk-model-small-cn-0.22.zip"
    extract_dir = MODEL_DIR.parent / "vosk-download"

    try:
        print(f"Downloading Vosk model from {MODEL_URL}")
        urllib.request.urlretrieve(MODEL_URL, archive_path)

        if extract_dir.exists():
            shutil.rmtree(extract_dir)
        extract_dir.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(archive_path) as archive:
            archive.extractall(extract_dir)

        extracted_model = next(extract_dir.iterdir())
        shutil.move(str(extracted_model), str(MODEL_DIR))
        print(f"Vosk model cached: {MODEL_DIR}")
    except Exception as exc:
        print(f"Vosk model download skipped: {exc}")
    finally:
        archive_path.unlink(missing_ok=True)
        if extract_dir.exists():
            shutil.rmtree(extract_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
