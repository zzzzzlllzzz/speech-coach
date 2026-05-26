import { useEffect, useState } from "react";
import { analyzeFastVideo, analyzeVideo } from "./api";
import { attachIssueFrames, getVideoInfo } from "./videoFrames";
import UploadPanel from "./components/UploadPanel";
import ProgressPanel from "./components/ProgressPanel";
import ReportDashboard from "./components/ReportDashboard";

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const FAST_MODE_SIZE = 45 * 1024 * 1024;
const FAST_MODE_DURATION = 90;
const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv"];

function validateVideoFile(file) {
  const lowerName = file.name.toLowerCase();
  const isAllowed = ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));

  if (!isAllowed) {
    return "仅支持 mp4、mov、avi、mkv 格式的视频文件。";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "视频文件不能超过 200MB。为了保证语音转写准确，请压缩到 1 到 3 分钟后再上传。";
  }

  return "";
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [report, setReport] = useState(null);
  const [stage, setStage] = useState("upload");
  const [progress, setProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState("准备分析");
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
        if (value < 35) return Math.min(value + 1, 35);
        if (value < 72) return Math.min(value + 0.7, 72);
        if (value < 92) return Math.min(value + 0.35, 92);
        return Math.min(value + 0.12, 97);
      });
    }, 450);

    return () => window.clearInterval(timer);
  }, [stage]);

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("请先选择一个 mp4、mov、avi 或 mkv 视频文件。");
      return;
    }

    setError("");
    setStage("analyzing");
    setProgress(3);
    setAnalysisStep("正在读取视频信息");

    try {
      const videoInfo = await getVideoInfo(selectedFile).catch(() => ({}));
      const fastMode =
        selectedFile.size > FAST_MODE_SIZE || (videoInfo.duration || 0) > FAST_MODE_DURATION;
      let clientVisualMetrics = null;
      try {
        setAnalysisStep("正在分析人脸、姿态和手势关键点");
        const { analyzeVideoWithMediaPipe } = await import("./mediapipeVideoAnalysis");
        clientVisualMetrics = await analyzeVideoWithMediaPipe(selectedFile, (value) => {
          setProgress((current) => Math.max(current, Math.min(68, 8 + Math.round(value * 0.55))));
        }, { fastMode });
      } catch (mediaPipeError) {
        if (import.meta.env.DEV) {
          console.warn("浏览器端 MediaPipe 分析失败，改用后端视觉分析。", mediaPipeError);
        }
      }

      let result;
      if (fastMode) {
        setAnalysisStep("视频较大，正在提取音频并启用快速上传");
        const { extractAudioWavFromVideo } = await import("./audioExtraction");
        const audioFile = await extractAudioWavFromVideo(selectedFile);
        setProgress((current) => Math.max(current, 72));
        if (audioFile) {
          setAnalysisStep("正在上传音频和视觉指标，避免整段大视频慢传");
          result = await analyzeFastVideo({
            file: selectedFile,
            clientVisualMetrics,
            videoInfo,
            audioFile,
            onUploadProgress: (ratio) => {
              setProgress((current) => Math.max(current, 72 + Math.round(ratio * 14)));
            },
          });
        } else {
          setAnalysisStep("浏览器音频提取失败，正在改用完整视频上传保证转写准确");
          result = await analyzeVideo(selectedFile, clientVisualMetrics, (ratio) => {
            setProgress((current) => Math.max(current, 72 + Math.round(ratio * 12)));
          });
        }
      } else {
        setProgress((current) => Math.max(current, 72));
        setAnalysisStep("正在上传视频到后端提取音频");
        result = await analyzeVideo(selectedFile, clientVisualMetrics, (ratio) => {
          setProgress((current) => Math.max(current, 72 + Math.round(ratio * 12)));
        });
      }

      setAnalysisStep("正在匹配问题时间点并截取对应画面");
      const framedIssues = await attachIssueFrames(selectedFile, result.issues || []).catch(
        () => result.issues || []
      );
      result = { ...result, issues: framedIssues };
      setAnalysisStep("报告已生成");
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
    setAnalysisStep("准备分析");
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

      {stage === "analyzing" && <ProgressPanel progress={Math.round(progress)} step={analysisStep} />}

      {stage === "report" && report && (
        <ReportDashboard report={report} onReset={handleReset} />
      )}
    </main>
  );
}
