from pathlib import Path
import os
import shutil
import urllib.request
import zipfile


MODELS = [
    (
        os.getenv("VOSK_MODEL_URL", "https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip"),
        Path(os.getenv("VOSK_MODEL_PATH", "/app/models/vosk-model-small-cn-0.22")),
    ),
    (
        os.getenv("VOSK_EN_MODEL_URL", "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"),
        Path(os.getenv("VOSK_EN_MODEL_PATH", "/app/models/vosk-model-small-en-us-0.15")),
    ),
]


def download_model(model_url: str, model_dir: Path) -> None:
    if model_dir.exists():
        print(f"Vosk model already exists: {model_dir}")
        return

    model_dir.parent.mkdir(parents=True, exist_ok=True)
    archive_path = model_dir.parent / Path(model_url).name
    extract_dir = model_dir.parent / f"{model_dir.name}-download"

    try:
        print(f"Downloading Vosk model from {model_url}")
        urllib.request.urlretrieve(model_url, archive_path)

        if extract_dir.exists():
            shutil.rmtree(extract_dir)
        extract_dir.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(archive_path) as archive:
            archive.extractall(extract_dir)

        extracted_model = next(extract_dir.iterdir())
        shutil.move(str(extracted_model), str(model_dir))
        print(f"Vosk model cached: {model_dir}")
    except Exception as exc:
        print(f"Vosk model download skipped: {exc}")
    finally:
        archive_path.unlink(missing_ok=True)
        if extract_dir.exists():
            shutil.rmtree(extract_dir, ignore_errors=True)


def main() -> None:
    for model_url, model_dir in MODELS:
        download_model(model_url, model_dir)


if __name__ == "__main__":
    main()
