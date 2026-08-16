from pathlib import Path
import asyncio
import json
import logging
import math
import os
import time
import uuid

from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.aliyun_asr_service import get_aliyun_asr_status
from services.audio_service import extract_audio
from services.audio_metrics_service import analyze_audio_delivery
from services.gesture_service import analyze_visual_metrics, build_mock_visual_metrics
from services.report_service import build_fallback_report, build_report_shell, enrich_report
from services.scoring_service import calculate_scores
from services.script_optimization_service import optimize_script
from services.speech_service import transcribe_audio
from services.text_analysis_service import analyze_text
from services.video_service import inspect_video
from utils.file_utils import UploadTooLargeError, save_upload_file


app = FastAPI(title="言镜 AI API", version="0.1.0")
logger = logging.getLogger("speech_coach_ai")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}
ALLOWED_AUDIO_EXTENSIONS = {".wav"}
MAX_UPLOAD_SIZE = 500 * 1024 * 1024
MAX_FAST_AUDIO_SIZE = 80 * 1024 * 1024
MAX_JSON_FIELD_SIZE = 64 * 1024
MAX_SCRIPT_TEXT_LENGTH = 20000
MAX_ANALYSIS_JOBS = 20
MAX_ACTIVE_ANALYSIS_JOBS = 2
ANALYSIS_JOBS: dict[str, dict] = {}
ANALYSIS_TASKS: set[asyncio.Task] = set()


class ScriptOptimizationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_SCRIPT_TEXT_LENGTH)
    summary: str | None = Field(default="", max_length=2000)
    suggestions: list[str] = Field(default_factory=list, max_length=30)
    structure_analysis: dict | None = None


def get_cors_origins() -> list[str]:
    origins = os.getenv("CORS_ORIGINS", "").strip()
    if origins:
        return [origin.strip() for origin in origins.split(",") if origin.strip()]
    return [
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
    ]


def use_mock_mode() -> bool:
    return os.getenv("USE_MOCK", "false").strip().lower() in {"1", "true", "yes", "on"}


def speech_service_status() -> dict:
    chinese_model = Path(os.getenv("VOSK_MODEL_PATH", "models/vosk-model-small-cn-0.22"))
    english_model = Path(os.getenv("VOSK_EN_MODEL_PATH", "models/vosk-model-small-en-us-0.15"))
    aliyun_status = get_aliyun_asr_status(check_token=False)
    aliyun_ready = bool(aliyun_status["enabled"] and aliyun_status["sdk_available"])
    offline_ready = any(
        (model / "am" / "final.mdl").is_file() and (model / "conf" / "model.conf").is_file()
        for model in (chinese_model, english_model)
    )
    return {
        "ready": aliyun_ready or offline_ready or use_mock_mode(),
        "aliyun_ready": aliyun_ready,
        "offline_ready": offline_ready,
        "mock_mode": use_mock_mode(),
    }


def validate_upload(file: UploadFile) -> None:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        allowed = "、".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(status_code=400, detail=f"仅支持 {allowed} 格式的视频文件。")


def validate_audio_upload(file: UploadFile | None) -> None:
    if file is None:
        return
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(status_code=400, detail="快速分析音频仅支持 wav 格式。")


def parse_json_field(value: str | None, default: dict | None = None) -> dict:
    if not value:
        return default or {}
    if len(value.encode("utf-8")) > MAX_JSON_FIELD_SIZE:
        raise HTTPException(status_code=400, detail="分析指标数据过大。")
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else (default or {})
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="分析指标格式无效。")


def safe_number(value: object, default: float, minimum: float, maximum: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if not math.isfinite(number):
        return default
    return max(minimum, min(maximum, number))


def sanitize_video_info(values: dict) -> dict:
    return {
        "duration": safe_number(values.get("duration"), 120, 1, 1800),
        "fps": safe_number(values.get("fps"), 30, 1, 240),
        "width": round(safe_number(values.get("width"), 1280, 1, 7680)),
        "height": round(safe_number(values.get("height"), 720, 1, 4320)),
    }


def sanitize_visual_metrics(values: dict) -> dict:
    ratios = {"face_visible_ratio", "looking_camera_ratio", "gesture_activity", "hand_visible_ratio"}
    counts = {"head_down_count", "face_block_count", "analysis_frame_count"}
    scores = {"body_sway_score", "expression_change_score"}
    cleaned = {}
    for key in ratios:
        cleaned[key] = safe_number(values.get(key), 0, 0, 1)
    for key in counts:
        cleaned[key] = round(safe_number(values.get(key), 0, 0, 100000))
    for key in scores:
        cleaned[key] = safe_number(values.get(key), 0, 0, 100)
    for key in ("head_down_events", "face_block_events"):
        items = values.get(key)
        cleaned[key] = [str(item)[:12] for item in items[:100]] if isinstance(items, list) else []
    cleaned["sample_interval_seconds"] = safe_number(values.get("sample_interval_seconds"), 1, 0.01, 60)
    cleaned["analyzed_duration_seconds"] = safe_number(values.get("analyzed_duration_seconds"), 0, 0, 1800)
    return cleaned


def cleanup_file(path: Path | None) -> None:
    if path:
        try:
            path.unlink(missing_ok=True)
        except OSError:
            logger.warning("临时文件清理失败：%s", path.name)


def update_analysis_job(job_id: str, **values) -> None:
    job = ANALYSIS_JOBS.get(job_id)
    if job is not None:
        job.update(values)
        job["updated_at"] = time.time()


def trim_analysis_jobs() -> None:
    if len(ANALYSIS_JOBS) < MAX_ANALYSIS_JOBS:
        return
    finished = sorted(
        (
            (job_id, job)
            for job_id, job in ANALYSIS_JOBS.items()
            if job.get("status") in {"completed", "failed"}
        ),
        key=lambda item: item[1].get("updated_at", 0),
    )
    for job_id, _job in finished[: max(1, len(ANALYSIS_JOBS) - MAX_ANALYSIS_JOBS + 1)]:
        ANALYSIS_JOBS.pop(job_id, None)


app.add_middleware(
    CORSMiddleware,
    allow_origins=(cors_origins := get_cors_origins()),
    allow_credentials="*" not in cors_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Accept", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    if request.url.path == "/api/optimize-script":
        try:
            if int(request.headers.get("content-length", "0")) > 128 * 1024:
                return Response(
                    content='{"detail":"请求内容过大。"}',
                    status_code=413,
                    media_type="application/json",
                )
        except ValueError:
            return Response(
                content='{"detail":"Content-Length 无效。"}',
                status_code=400,
                media_type="application/json",
            )
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cache-Control"] = "no-store" if request.url.path.startswith(("/api", "/debug")) else "no-cache"
    return response


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "speech": speech_service_status()}


@app.get("/api/status")
def api_status() -> dict:
    return {"speech": speech_service_status(), "max_video_minutes": 30, "max_upload_mb": 500}


@app.get("/debug/asr")
def debug_asr(check_token: bool = False) -> dict:
    if os.getenv("ENABLE_DEBUG_ENDPOINTS", "false").lower() not in {"1", "true", "yes", "on"}:
        raise HTTPException(status_code=404, detail="Not found")
    return get_aliyun_asr_status(check_token=check_token)


@app.post("/api/optimize-script")
def optimize_script_endpoint(payload: ScriptOptimizationRequest) -> dict:
    try:
        return optimize_script(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("DeepSeek 演讲稿优化失败")
        raise HTTPException(status_code=502, detail="演讲稿优化服务暂时不可用，请稍后重试。")


async def analyze_saved_video(saved_path: Path, client_visual_metrics: str | None = None, job_id: str | None = None) -> dict:
    extracted_audio_path = None

    try:
        if use_mock_mode():
            logger.info("USE_MOCK=true，返回演示模式报告")
            return build_fallback_report(saved_path.name, "USE_MOCK=true，已启用完整演示模式。")

        report = build_report_shell(saved_path.name)

        if job_id:
            update_analysis_job(job_id, stage="正在检查视频信息", progress=10)
        logger.info("视频分析")
        video_info = await asyncio.to_thread(inspect_video, saved_path)
        if float(video_info.get("duration") or 0) > 30 * 60:
            raise HTTPException(status_code=400, detail="当前支持最长 30 分钟的视频。")
        visual_metrics = None
        if client_visual_metrics:
            visual_metrics = sanitize_visual_metrics(parse_json_field(client_visual_metrics))
            if visual_metrics:
                visual_metrics["mock_mode"] = False
                visual_metrics["fallback_mode"] = visual_metrics.get("fallback_mode", "browser_mediapipe")
                visual_metrics["analysis_note"] = visual_metrics.get(
                    "analysis_note",
                    "浏览器端 MediaPipe Tasks Vision 已完成上传视频关键点分析。",
                )
            else:
                logger.warning("前端视觉指标 JSON 解析失败，改用后端视觉分析")
                visual_metrics = None

        if visual_metrics is None:
            if job_id:
                update_analysis_job(job_id, stage="正在分析画面关键点", progress=22)
            visual_metrics = await asyncio.to_thread(analyze_visual_metrics, saved_path)

        if job_id:
            update_analysis_job(job_id, stage="正在提取完整音轨", progress=35)
        logger.info("提取音频")
        audio_result = await asyncio.to_thread(extract_audio, saved_path)
        extracted_audio_path = audio_result.audio_path

        if job_id:
            update_analysis_job(job_id, stage="正在识别完整音轨，长演讲需要更久", progress=52)
        logger.info("语音识别")
        transcription = await asyncio.to_thread(transcribe_audio, audio_result.audio_path)
        duration = video_info.get("duration") or audio_result.duration or 120

        if transcription["mock_mode"]:
            reason = transcription.get("error") or "未识别到有效语音"
            raise HTTPException(
                status_code=422,
                detail=f"语音识别未完成：{reason}。系统已停止评分，避免生成不准确报告。",
            )

        logger.info("文本分析")
        if job_id:
            update_analysis_job(job_id, stage="正在分析语言结构和表达节奏", progress=82)
        transcript = await asyncio.to_thread(
            analyze_text,
            text=transcription["text"],
            duration=duration,
            mock_mode=transcription["mock_mode"],
        )
        transcript["audio_metrics"] = await asyncio.to_thread(analyze_audio_delivery, audio_result.audio_path)

        if audio_result.audio_path:
            transcript["audio_file"] = audio_result.audio_path.name

        if transcription["mock_mode"]:
            transcript["mock_reason"] = transcription["error"] or audio_result.error
        transcript["source"] = transcription.get("source", "fallback")
        transcript["raw_text"] = transcription.get("raw_text", transcription["text"])
        transcript["polish_source"] = transcription.get("polish_source", "none")
        transcript["polish_error"] = transcription.get("polish_error")

        logger.info("评分")
        if job_id:
            update_analysis_job(job_id, stage="正在匹配问题并生成训练建议", progress=92)
        scores = await asyncio.to_thread(calculate_scores, transcript, visual_metrics)

        logger.info("生成报告")
        report["video_info"] = video_info
        report["video_info"]["duration"] = duration
        return await asyncio.to_thread(enrich_report, report, transcript, visual_metrics, scores)
    except UploadTooLargeError:
        raise HTTPException(status_code=413, detail="视频文件不能超过 500MB。")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("视频分析失败")
        raise HTTPException(
            status_code=502,
            detail="视频分析未完成，系统不会用模拟数据代替真实结果。请检查视频声音和编码后重试。",
        ) from exc
    finally:
        cleanup_file(saved_path)
        cleanup_file(extracted_audio_path)


async def run_analysis_job(job_id: str, saved_path: Path, client_visual_metrics: str | None) -> None:
    update_analysis_job(job_id, status="processing", stage="视频已上传，准备开始分析", progress=5)
    try:
        report = await analyze_saved_video(saved_path, client_visual_metrics, job_id)
        update_analysis_job(
            job_id,
            status="completed",
            stage="分析完成",
            progress=100,
            result=report,
        )
    except HTTPException as exc:
        update_analysis_job(
            job_id,
            status="failed",
            stage="分析失败",
            error=str(exc.detail),
            error_status=exc.status_code,
        )
    except Exception:
        logger.exception("后台视频分析任务失败")
        update_analysis_job(
            job_id,
            status="failed",
            stage="分析失败",
            error="视频分析未完成，请检查视频声音和编码后重试。",
            error_status=502,
        )


@app.post("/api/analyze")
async def analyze_video(
    file: UploadFile = File(...),
    client_visual_metrics: str | None = Form(None),
) -> dict:
    saved_path = None
    try:
        validate_upload(file)
        logger.info("保存视频")
        saved_path = await save_upload_file(file, max_bytes=MAX_UPLOAD_SIZE)
        return await analyze_saved_video(saved_path, client_visual_metrics)
    except UploadTooLargeError:
        cleanup_file(saved_path)
        raise HTTPException(status_code=413, detail="视频文件不能超过 500MB。")


@app.post("/api/analyze-jobs", status_code=202)
async def create_analysis_job(
    file: UploadFile = File(...),
    client_visual_metrics: str | None = Form(None),
) -> dict:
    saved_path = None
    active_jobs = sum(
        job.get("status") in {"queued", "processing"} for job in ANALYSIS_JOBS.values()
    )
    if active_jobs >= MAX_ACTIVE_ANALYSIS_JOBS:
        raise HTTPException(status_code=429, detail="当前已有视频正在分析，请等待当前任务完成后再上传。")
    try:
        validate_upload(file)
        if client_visual_metrics:
            sanitize_visual_metrics(parse_json_field(client_visual_metrics))
        logger.info("保存后台分析视频")
        saved_path = await save_upload_file(file, max_bytes=MAX_UPLOAD_SIZE)
    except UploadTooLargeError:
        cleanup_file(saved_path)
        raise HTTPException(status_code=413, detail="视频文件不能超过 500MB。")
    except Exception:
        cleanup_file(saved_path)
        raise

    trim_analysis_jobs()
    job_id = uuid.uuid4().hex
    now = time.time()
    ANALYSIS_JOBS[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "stage": "视频上传完成，等待分析",
        "progress": 1,
        "created_at": now,
        "updated_at": now,
    }
    try:
        task = asyncio.create_task(run_analysis_job(job_id, saved_path, client_visual_metrics))
        ANALYSIS_TASKS.add(task)
        task.add_done_callback(ANALYSIS_TASKS.discard)
    except Exception:
        ANALYSIS_JOBS.pop(job_id, None)
        cleanup_file(saved_path)
        raise
    return {"job_id": job_id, "status": "queued", "stage": "视频上传完成，等待分析", "progress": 1}


@app.get("/api/analyze-jobs/{job_id}")
def get_analysis_job(job_id: str) -> dict:
    job = ANALYSIS_JOBS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="分析任务不存在或服务已重启，请重新上传视频。")
    return job


@app.post("/api/analyze-fast")
async def analyze_fast(
    filename: str = Form("large-video.mp4"),
    file_size: str = Form("0"),
    video_info: str = Form("{}"),
    client_visual_metrics: str | None = Form(None),
    audio_file: UploadFile | None = File(None),
) -> dict:
    audio_path = None
    try:
        validate_audio_upload(audio_file)
        suffix = Path(filename).suffix.lower()
        if suffix not in ALLOWED_EXTENSIONS or len(filename) > 255:
            raise HTTPException(status_code=400, detail="视频文件名或格式无效。")
        parsed_video_info = sanitize_video_info(parse_json_field(video_info))
        visual_metrics = parse_json_field(client_visual_metrics)
        if visual_metrics:
            visual_metrics = sanitize_visual_metrics(visual_metrics)
        try:
            parsed_file_size = int(file_size or 0)
        except (TypeError, ValueError):
            parsed_file_size = 0
        parsed_file_size = max(0, min(parsed_file_size, MAX_UPLOAD_SIZE))

        report = build_report_shell(filename)
        duration = parsed_video_info.get("duration") or 120

        transcription = {"text": "", "mock_mode": True, "source": "fallback", "error": "未检测到文本"}
        if audio_file is not None:
            audio_path = await save_upload_file(audio_file, max_bytes=MAX_FAST_AUDIO_SIZE)
            transcription = await asyncio.to_thread(transcribe_audio, audio_path)

        if transcription["mock_mode"]:
            reason = transcription.get("error") or "未识别到有效语音"
            raise HTTPException(
                status_code=422,
                detail=f"语音识别未完成：{reason}。系统已停止评分，避免生成不准确报告。",
            )

        transcript = await asyncio.to_thread(
            analyze_text,
            text=transcription["text"],
            duration=duration,
            mock_mode=transcription["mock_mode"],
        )
        transcript["audio_metrics"] = await asyncio.to_thread(analyze_audio_delivery, audio_path)
        transcript["source"] = transcription.get("source", "fallback")
        transcript["raw_text"] = transcription.get("raw_text", transcription["text"])
        transcript["polish_source"] = transcription.get("polish_source", "none")
        transcript["polish_error"] = transcription.get("polish_error")
        if audio_path:
            transcript["audio_file"] = audio_path.name
        if transcription["mock_mode"]:
            transcript["mock_reason"] = transcription["error"] or "未检测到文本"

        if not visual_metrics:
            visual_metrics = build_mock_visual_metrics("大视频快速分析未收到浏览器端视觉指标。")
        else:
            visual_metrics["mock_mode"] = False
            visual_metrics["fallback_mode"] = visual_metrics.get("fallback_mode", "browser_mediapipe")
            visual_metrics["analysis_note"] = visual_metrics.get(
                "analysis_note",
                "浏览器端 MediaPipe Tasks Vision 已完成大视频快速分析。",
            )

        scores = await asyncio.to_thread(calculate_scores, transcript, visual_metrics)
        report["video_info"] = {
            "filename": filename,
            "duration": duration,
            "fps": parsed_video_info.get("fps") or 30,
            "width": parsed_video_info.get("width") or 1280,
            "height": parsed_video_info.get("height") or 720,
            "mock_mode": False,
            "fast_mode": True,
        }
        report = await asyncio.to_thread(enrich_report, report, transcript, visual_metrics, scores)
        report["analysis_status"]["upload"] = {
            "mode": "fast",
            "file_size": parsed_file_size,
            "message": "大文件已启用快速分析：未上传完整原视频，已优先上传音频用于语音转写。",
        }
        return report
    except UploadTooLargeError:
        raise HTTPException(status_code=413, detail="提取后的音频不能超过 80MB。")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("快速分析失败")
        raise HTTPException(
            status_code=502,
            detail="快速分析未完成，系统不会用模拟数据代替真实结果。请重新上传，或改用完整视频分析。",
        ) from exc
    finally:
        cleanup_file(audio_path)
