import { useEffect, useState } from "react";
import { analyzeFastVideo, analyzeVideo } from "./api";
import { analyzeVideoWithMediaPipe } from "./mediapipeVideoAnalysis";
import UploadPanel from "./components/UploadPanel";
import ProgressPanel from "./components/ProgressPanel";
import ReportDashboard from "./components/ReportDashboard";

const MAX_FILE_SIZE = 1024 * 1024 * 1024;
const FAST_MODE_FILE_SIZE = 80 * 1024 * 1024;
const FAST_MODE_DURATION = 180;
const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv"];

function validateVideoFile(file) {
  const lowerName = file.name.toLowerCase();
  const isAllowed = ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));

  if (!isAllowed) {
    return "仅支持 mp4、mov、avi、mkv 格式的视频文件。";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "视频文件不能超过 1GB，请压缩后再上传。";
  }

  return "";
}

function readVideoMetadata(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const cleanup = () => URL.revokeObjectURL(url);

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const info = {
        duration: Number.isFinite(video.duration) ? Math.round(video.duration * 100) / 100 : 0,
        width: video.videoWidth || 1280,
        height: video.videoHeight || 720,
        fps: 30,
      };
      cleanup();
      resolve(info);
    };
    video.onerror = () => {
      cleanup();
      resolve({ duration: 0, width: 1280, height: 720, fps: 30 });
    };
    video.src = url;
  });
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [report, setReport] = useState(null);
  const [stage, setStage] = useState("upload");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleFileSelect = (file) => {
    const validationError = validateVideoFile(file);
    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setError("");
  };

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    if (stage !== "analyzing") return undefined;

    setProgress(8);
    const timer = window.setInterval(() => {
      setProgress((value) => {
        if (value < 70) return Math.min(value + 5, 70);
        if (value < 88) return Math.min(value + 2, 88);
        return Math.min(value + 1, 96);
      });
    }, 900);

    return () => window.clearInterval(timer);
  }, [stage]);

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("请先选择一个 mp4、mov、avi 或 mkv 视频文件。");
      return;
    }

    setError("");
    setStage("analyzing");

    try {
      let clientVisualMetrics = null;
      try {
        clientVisualMetrics = await analyzeVideoWithMediaPipe(selectedFile, (value) => {
          setProgress(Math.min(70, Math.max(12, Math.round(value * 0.7))));
        });
      } catch (mediaPipeError) {
        console.warn("浏览器端 MediaPipe 分析失败，改用后端视觉分析。", mediaPipeError);
      }

      setProgress(78);
      const videoInfo = await readVideoMetadata(selectedFile);
      const useFastMode =
        selectedFile.size > FAST_MODE_FILE_SIZE || videoInfo.duration > FAST_MODE_DURATION;
      const result = useFastMode
        ? await analyzeFastVideo({ file: selectedFile, clientVisualMetrics, videoInfo })
        : await analyzeVideo(selectedFile, clientVisualMetrics);
      setProgress(100);
      window.setTimeout(() => {
        setReport(result);
        setStage("report");
      }, 250);
    } catch (err) {
      setError(err.message || "分析失败，请稍后重试。");
      setStage("upload");
      setProgress(0);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setReport(null);
    setStage("upload");
    setProgress(0);
    setError("");
  };

  return (
    <main className="app-shell">
      {stage === "upload" && (
        <UploadPanel
          error={error}
          file={selectedFile}
          onAnalyze={handleAnalyze}
          onFileSelect={handleFileSelect}
          previewUrl={previewUrl}
        />
      )}

      {stage === "analyzing" && <ProgressPanel progress={progress} />}

      {stage === "report" && report && (
        <ReportDashboard report={report} onReset={handleReset} />
      )}
    </main>
  );
}
