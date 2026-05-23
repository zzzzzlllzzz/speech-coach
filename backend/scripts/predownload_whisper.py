import os


def main() -> None:
    model_size = os.getenv("WHISPER_MODEL", "base")
    try:
        from faster_whisper import WhisperModel

        WhisperModel(model_size, device="cpu", compute_type="int8")
        print(f"Whisper model '{model_size}' is cached.")
    except Exception as exc:
        print(f"Whisper model predownload skipped: {exc}")


if __name__ == "__main__":
    main()
