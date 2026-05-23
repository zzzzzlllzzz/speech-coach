from pathlib import Path
import json
import logging
import os

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi import Body
from fastapi.middleware.cors import CORSMiddleware

from services.audio_service import extract_audio
from services.gesture_service import analyze_visual_metrics, build_mock_visual_metrics
from services.report_service import build_fallback_report, build_mock_report, enrich_report
from services.scoring_service import calculate_scores
from services.speech_service import transcribe_audio
from services.text_analysis_service import analyze_text
from services.video_service import inspect_video
from utils.file_utils import save_upload_file


app = FastAPI(title="言镜 AI API", version="0.1.0")
logger = logging.getLogger("speech_coach_ai")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}
MAX_UPLOAD_SIZE = 200 * 1024 * 1024


def get_cors_origins() -> list[str]:
    origins = os.getenv("CORS_ORIGINS", "").strip()
    if origins:
        return [origin.strip() for origin in origins.split(",") if origin.strip()]
    return ["http://localhost:5173", "http://127.0.0.1:5173"]


def use_mock_mode() -> bool:
    return os.getenv("USE_MOCK", "false").strip().lower() in {"1", "true", "yes", "on"}


def validate_upload(file: UploadFile) -> None:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        allowed = "、".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(status_code=400, detail=f"仅支持 {allowed} 格式的视频文件。")

app.add_middleware(
    CORSMiddleware,
    allow_origins=(cors_origins := get_cors_origins()),
    allow_credentials="*" not in cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze_video(
    file: UploadFile = File(...),
    client_visual_metrics: str | None = Form(None),
) -> dict:
    saved_path = None

    try:
        validate_upload(file)

        logger.info("保存视频")
        saved_path = await save_upload_file(file)
        if saved_path.stat().st_size > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=400, detail="视频文件不能超过 200MB。")

        if use_mock_mode():
            logger.info("USE_MOCK=true，返回演示模式报告")
            return build_fallback_report(saved_path.name, "USE_MOCK=true，已启用完整演示模式。")

        report = build_mock_report(saved_path.name)

        logger.info("视频分析")
        video_info = inspect_video(saved_path)
        visual_metrics = None
        if client_visual_metrics:
            try:
                visual_metrics = json.loads(client_visual_metrics)
                visual_metrics["mock_mode"] = False
                visual_metrics["fallback_mode"] = visual_metrics.get("fallback_mode", "browser_mediapipe")
                visual_metrics["analysis_note"] = visual_metrics.get(
                    "analysis_note",
                    "浏览器端 MediaPipe Tasks Vision 已完成上传视频关键点分析。",
                )
            except json.JSONDecodeError:
                logger.warning("前端视觉指标 JSON 解析失败，改用后端视觉分析")
                visual_metrics = None

        if visual_metrics is None:
            visual_metrics = analyze_visual_metrics(saved_path)

        logger.info("提取音频")
        audio_result = extract_audio(saved_path)

        logger.info("语音识别")
        transcription = transcribe_audio(audio_result.audio_path)
        duration = video_info.get("duration") or audio_result.duration or report["video_info"]["duration"]

        logger.info("文本分析")
        transcript = analyze_text(
            text=transcription["text"],
            duration=duration,
            mock_mode=transcription["mock_mode"],
        )

        if audio_result.audio_path:
            transcript["audio_file"] = audio_result.audio_path.name

        if transcription["mock_mode"]:
            transcript["mock_reason"] = transcription["error"] or audio_result.error
        transcript["source"] = transcription.get("source", "fallback")

        logger.info("评分")
        scores = calculate_scores(transcript, visual_metrics)

        logger.info("生成报告")
        report["video_info"] = video_info
        report["video_info"]["duration"] = duration
        return enrich_report(report, transcript, visual_metrics, scores)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("分析失败，返回 fallback 报告")
        filename = saved_path.name if saved_path else (file.filename or "demo.mp4")
        return build_fallback_report(filename, f"后端分析失败，已自动切换到演示报告：{exc}")


@app.post("/api/analyze-fast")
async def analyze_fast(payload: dict = Body(...)) -> dict:
    try:
        filename = payload.get("filename") or "large-video.mp4"
        video_info = payload.get("video_info") or {}
        visual_metrics = payload.get("client_visual_metrics") or {}

        report = build_mock_report(filename)
        duration = video_info.get("duration") or 120
        transcript = analyze_text(text="", duration=duration, mock_mode=True)
        transcript["mock_reason"] = "未检测到文本"
        transcript["source"] = "fallback"

        if not visual_metrics:
            visual_metrics = build_mock_visual_metrics("大视频快速分析未收到浏览器端视觉指标。")
        else:
            visual_metrics["mock_mode"] = False
            visual_metrics["fallback_mode"] = visual_metrics.get("fallback_mode", "browser_mediapipe")
            visual_metrics["analysis_note"] = visual_metrics.get(
                "analysis_note",
                "浏览器端 MediaPipe Tasks Vision 已完成大视频快速分析。",
            )

        scores = calculate_scores(transcript, visual_metrics)
        report["video_info"] = {
            "filename": filename,
            "duration": duration,
            "fps": video_info.get("fps") or 30,
            "width": video_info.get("width") or 1280,
            "height": video_info.get("height") or 720,
            "mock_mode": False,
            "fast_mode": True,
        }
        report = enrich_report(report, transcript, visual_metrics, scores)
        report["analysis_status"]["upload"] = {
            "mode": "fast",
            "message": "大文件已启用快速分析：未上传完整原视频，优先使用浏览器端视觉指标生成报告。",
        }
        return report
    except Exception as exc:
        logger.exception("快速分析失败，返回 fallback 报告")
        return build_fallback_report(
            payload.get("filename", "large-video.mp4") if isinstance(payload, dict) else "large-video.mp4",
            f"快速分析失败：{exc}",
        )
