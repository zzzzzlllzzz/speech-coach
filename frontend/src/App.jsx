import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  analyzeFastVideo,
  analyzeVideo,
  getServiceStatus,
  startVideoAnalysisJob,
  waitForVideoAnalysisJob,
} from "./api";
import { attachIssueFrames, getVideoInfo } from "./videoFrames";
import UploadPanel from "./components/UploadPanel";
import ProgressPanel from "./components/ProgressPanel";
import { sampleDemoReport } from "./sampleDemoReport";
import AppHeader from "./components/AppHeader";
import HistoryDashboard from "./components/HistoryDashboard";
import OnboardingGuide from "./components/OnboardingGuide";
import TrainingGuide from "./components/TrainingGuide";
import ExpressionGame from "./components/ExpressionGame";
import { MAX_VIDEO_DURATION_SECONDS, shouldStreamFullVideo } from "./analysisPlan";
import { DEFAULT_TRAINING_CONTEXT } from "./trainingPlan";

const ReportDashboard = lazy(() => import("./components/ReportDashboard"));

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv"];
const HISTORY_STORAGE_KEY = "speech-coach-ai-history";
const ANALYSIS_DRAFT_STORAGE_KEY = "speech-coach-ai-analysis-draft";
const MAX_HISTORY_ITEMS = 8;
const ONBOARDING_STORAGE_KEY = "speech-coach-ai-onboarding-complete";
const TRAINING_CONTEXT_STORAGE_KEY = "speech-coach-ai-training-context";

function readTrainingContext() {
  try {
    return {
      ...DEFAULT_TRAINING_CONTEXT,
      ...JSON.parse(window.localStorage.getItem(TRAINING_CONTEXT_STORAGE_KEY) || "{}"),
    };
  } catch {
    return DEFAULT_TRAINING_CONTEXT;
  }
}

function validateVideoFile(file) {
  const lowerName = file.name.toLowerCase();
  const isAllowed = ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));

  if (!isAllowed) {
    return "仅支持 mp4、mov、avi、mkv 格式的视频文件。";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "视频文件不能超过 500MB。建议保持声音清晰；超长视频会自动调整抽帧密度。";
  }

  return "";
}

function createStoredReport(report) {
  return {
    ...report,
    issues: (report.issues || []).map(({ frame_image, ...issue }) => issue),
  };
}

function createHistoryItem(file, report) {
  const videoInfo = report.video_info || {};
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    filename: videoInfo.filename || file.name,
    duration: videoInfo.duration || report.transcript?.duration || 0,
    overall: report.scores?.overall ?? null,
    summary: report.summary || "",
    report: createStoredReport(report),
  };
}

function readHistory() {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(items) {
  try {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS))
    );
    return true;
  } catch {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isAbortError(error) {
  return error?.name === "AbortError" || error?.message === "分析已取消。";
}

function isLikelyMobileDevice() {
  return (
    window.matchMedia?.("(pointer: coarse)").matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent)
  );
}

function isSafariBrowser() {
  const userAgent = window.navigator.userAgent;
  return /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR/i.test(userAgent);
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [report, setReport] = useState(null);
  const [selectedVideoInfo, setSelectedVideoInfo] = useState(null);
  const [trainingContext, setTrainingContext] = useState(() => readTrainingContext());
  const [history, setHistory] = useState(() => readHistory());
  const [stage, setStage] = useState("upload");
  const [activeView, setActiveView] = useState("train");
  const [showOnboarding, setShowOnboarding] = useState(
    () => window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "1"
  );
  const [analysisActive, setAnalysisActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState("准备分析");
  const analysisAbortRef = useRef(null);
  const analysisCancelledRef = useRef(false);
  const [error, setError] = useState(() => {
    const draft = window.sessionStorage.getItem(ANALYSIS_DRAFT_STORAGE_KEY);
    if (!draft) return "";
    window.sessionStorage.removeItem(ANALYSIS_DRAFT_STORAGE_KEY);
    return "上次分析因为刷新或关闭页面被中断，请重新上传视频开始分析。";
  });

  const handleFileSelect = (file) => {
    if (analysisActive) {
      setError("当前视频仍在分析中，请等待报告生成后再上传新视频。");
      return;
    }

    const validationError = validateVideoFile(file);
    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setSelectedVideoInfo(null);
    setError("");
  };

  const handleTrainingContextChange = (nextContext) => {
    const normalized = { ...trainingContext, ...nextContext };
    setTrainingContext(normalized);
    window.localStorage.setItem(TRAINING_CONTEXT_STORAGE_KEY, JSON.stringify(normalized));
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
    if (!selectedFile) {
      setSelectedVideoInfo(null);
      return undefined;
    }
    let active = true;
    getVideoInfo(selectedFile)
      .then((info) => {
        if (active) setSelectedVideoInfo(info);
      })
      .catch(() => {
        if (active) setSelectedVideoInfo({ error: true });
      });
    return () => { active = false; };
  }, [selectedFile]);

  useEffect(() => {
    if (!analysisActive) return undefined;

    setProgress(8);
    const timer = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 94) return value;
        if (value < 35) return Math.min(value + 1, 35);
        if (value < 72) return Math.min(value + 0.7, 72);
        if (value < 88) return Math.min(value + 0.3, 88);
        return Math.min(value + 0.08, 94);
      });
    }, 450);

    return () => window.clearInterval(timer);
  }, [analysisActive]);

  useEffect(() => {
    if (!analysisActive) {
      window.sessionStorage.removeItem(ANALYSIS_DRAFT_STORAGE_KEY);
      return undefined;
    }

    window.sessionStorage.setItem(
      ANALYSIS_DRAFT_STORAGE_KEY,
      JSON.stringify({
        filename: selectedFile?.name || "",
        startedAt: new Date().toISOString(),
      })
    );

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [analysisActive, selectedFile]);

  const throwIfCancelled = () => {
    if (analysisCancelledRef.current) {
      throw new DOMException("分析已取消。", "AbortError");
    }
  };

  const handleCancelAnalysis = () => {
    if (!analysisActive) return;
    analysisCancelledRef.current = true;
    analysisAbortRef.current?.abort();
    analysisAbortRef.current = null;
    setAnalysisActive(false);
    setStage("upload");
    setProgress(0);
    setAnalysisStep("准备分析");
    window.sessionStorage.removeItem(ANALYSIS_DRAFT_STORAGE_KEY);
    setError("已取消本次分析，可以重新选择视频。");
  };

  const handleAnalyze = async () => {
    if (analysisActive) {
      setError("当前视频仍在分析中，请等待报告生成后再上传新视频。");
      return;
    }

    if (!selectedFile) {
      setError("请先选择一个 mp4、mov、avi 或 mkv 视频文件。");
      return;
    }

    setError("");
    analysisCancelledRef.current = false;
    const controller = new AbortController();
    analysisAbortRef.current = controller;
    setAnalysisActive(true);
    setStage("analyzing");
    setProgress(3);
    setAnalysisStep("正在读取视频信息");

    try {
      const serviceStatus = await getServiceStatus();
      if (!serviceStatus.speech?.ready) {
        throw new Error("语音识别服务尚未就绪。请配置阿里云 ASR，或确认 Vosk 模型已成功安装后再分析，避免生成不完整报告。");
      }
      const videoInfo = await getVideoInfo(selectedFile).catch(() => ({}));
      throwIfCancelled();
      if ((videoInfo.duration || 0) > MAX_VIDEO_DURATION_SECONDS) {
        throw new Error("当前支持最长 30 分钟的视频，请先裁剪到核心演讲片段后再分析。");
      }
      const lightMode = isLikelyMobileDevice() || isSafariBrowser();
      const isLongVideo = shouldStreamFullVideo(videoInfo.duration, selectedFile.size);
      const fastMode = !isLongVideo;
      let clientVisualMetrics = null;
      try {
        setAnalysisStep("正在分析人脸、姿态和手势关键点");
        const { analyzeVideoWithMediaPipe } = await import("./mediapipeVideoAnalysis");
        clientVisualMetrics = await analyzeVideoWithMediaPipe(selectedFile, (value) => {
          if (!analysisCancelledRef.current) {
            setProgress((current) => Math.max(current, Math.min(68, 8 + Math.round(value * 0.55))));
          }
        }, { fastMode, lightMode, signal: controller.signal });
      } catch (mediaPipeError) {
        if (isAbortError(mediaPipeError)) throw mediaPipeError;
        if (import.meta.env.DEV) {
          console.warn("浏览器端 MediaPipe 分析失败，改用后端视觉分析。", mediaPipeError);
        }
      }
      throwIfCancelled();

      let result;
      if (fastMode) {
        setAnalysisStep("视频较大，正在提取音频并启用快速上传");
        const { extractAudioWavFromVideo } = await import("./audioExtraction");
        const audioFile = await extractAudioWavFromVideo(selectedFile);
        throwIfCancelled();
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
            signal: controller.signal,
          });
        } else {
          setAnalysisStep("浏览器音频提取失败，正在改用完整视频上传保证转写准确");
          result = await analyzeVideo(selectedFile, clientVisualMetrics, (ratio) => {
            setProgress((current) => Math.max(current, 72 + Math.round(ratio * 12)));
          }, controller.signal);
        }
      } else {
        setProgress((current) => Math.max(current, 72));
        setAnalysisStep("长视频已完成全程抽帧，正在上传并创建后台分析任务");
        const job = await startVideoAnalysisJob(selectedFile, clientVisualMetrics, (ratio) => {
          setProgress((current) => Math.max(current, 72 + Math.round(ratio * 12)));
        }, controller.signal);
        setProgress((current) => Math.max(current, 85));
        setAnalysisStep("视频上传完成，后台正在识别完整音轨");
        result = await waitForVideoAnalysisJob(job.job_id, (status) => {
          if (status.stage) setAnalysisStep(status.stage);
          const backendProgress = Number(status.progress || 0);
          setProgress((current) => Math.max(current, Math.min(95, 85 + Math.round(backendProgress * 0.1))));
        }, controller.signal);
      }

      throwIfCancelled();
      if (result.quality_assessment?.level === "low") {
        throw new Error("本次语音和视觉数据均未达到可靠分析标准，请检查视频编码、画面和声音后重新上传。");
      }
      setProgress((current) => Math.max(current, 96));
      setAnalysisStep("正在匹配问题时间点并截取对应画面");
      const framedIssues = await attachIssueFrames(selectedFile, result.issues || []).catch(
        () => result.issues || []
      );
      throwIfCancelled();
      result = { ...result, issues: framedIssues, training_context: trainingContext };
      const nextHistory = [createHistoryItem(selectedFile, result), ...history].slice(
        0,
        MAX_HISTORY_ITEMS
      );
      if (writeHistory(nextHistory)) {
        setHistory(nextHistory);
      }
      setAnalysisStep("报告已生成");
      setProgress(100);
      setAnalysisActive(false);
      analysisAbortRef.current = null;
      window.sessionStorage.removeItem(ANALYSIS_DRAFT_STORAGE_KEY);
      window.setTimeout(() => {
        setReport(result);
        setStage("report");
      }, 250);
    } catch (err) {
      analysisAbortRef.current = null;
      setAnalysisActive(false);
      window.sessionStorage.removeItem(ANALYSIS_DRAFT_STORAGE_KEY);
      setError(isAbortError(err) ? "已取消本次分析，可以重新选择视频。" : err.message || "分析失败，请稍后重试。");
      setStage("upload");
      setProgress(0);
    }
  };

  const handleUseDemo = async () => {
    if (analysisActive) {
      setError("当前视频仍在分析中，请等待报告生成后再开始示例体验。");
      return;
    }

    try {
      setSelectedFile(null);
      setPreviewUrl("");
      setReport(null);
      setError("");
      analysisCancelledRef.current = false;
      setAnalysisActive(true);
      setStage("analyzing");

      const steps = [
        [8, "正在加载示例视频"],
        [24, "正在分析人脸、姿态和手势关键点"],
        [48, "正在提取音频并识别文字"],
        [72, "正在进行文本结构分析"],
        [90, "正在计算六维评分"],
        [100, "报告已生成"],
      ];

      for (const [nextProgress, nextStep] of steps) {
        throwIfCancelled();
        setAnalysisStep(nextStep);
        setProgress(nextProgress);
        await wait(nextProgress === 100 ? 300 : 850);
      }

      throwIfCancelled();
      const result = JSON.parse(JSON.stringify(sampleDemoReport));
      result.training_context = trainingContext;
      const demoFile = { name: result.video_info.filename };
      setAnalysisActive(false);
      analysisAbortRef.current = null;
      window.sessionStorage.removeItem(ANALYSIS_DRAFT_STORAGE_KEY);
      setHistory((currentHistory) => {
        const nextHistory = [createHistoryItem(demoFile, result), ...currentHistory].slice(
          0,
          MAX_HISTORY_ITEMS
        );
        writeHistory(nextHistory);
        return nextHistory;
      });
      setReport(result);
      setStage("report");
    } catch (err) {
      analysisAbortRef.current = null;
      setAnalysisActive(false);
      window.sessionStorage.removeItem(ANALYSIS_DRAFT_STORAGE_KEY);
      setError(isAbortError(err) ? "已取消本次分析，可以重新选择视频。" : err.message || "分析失败，请稍后重试。");
      setStage("upload");
      setProgress(0);
    }
  };

  const handleOpenHistory = (item) => {
    if (!analysisActive) {
      setSelectedFile(null);
      setPreviewUrl("");
    }
    setReport(item.report);
    setActiveView("train");
    setStage("report");
    if (!analysisActive) {
      setProgress(0);
      setAnalysisStep("已打开历史报告");
    }
    setError("");
  };

  const handleClearHistory = () => {
    if (!history.length) return;
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    setHistory([]);
  };

  const handleReset = () => {
    if (analysisActive) {
      setStage("upload");
      setError("当前视频仍在分析中，可以查看历史报告，但暂时不能上传新视频。");
      return;
    }

    setSelectedFile(null);
    setReport(null);
    setStage("upload");
    setProgress(0);
    setAnalysisStep("准备分析");
    setError("");
  };

  const handleNavigate = (view) => {
    setActiveView(view);
    if (view === "train" && stage === "report" && !report) setStage("upload");
  };

  const handleCloseOnboarding = () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
    setShowOnboarding(false);
  };

  const handleStartTraining = () => {
    setActiveView("train");
    if (!analysisActive) setStage("upload");
  };

  return (
    <main className="app-shell">
      <AppHeader activeView={activeView} analysisActive={analysisActive} onNavigate={handleNavigate} />
      {activeView === "history" && (
        <HistoryDashboard history={history} onOpen={handleOpenHistory} onStart={handleStartTraining} />
      )}
      {activeView === "guide" && (
        <TrainingGuide onStart={handleStartTraining} onShowOnboarding={() => setShowOnboarding(true)} />
      )}
      {activeView === "game" && (
        <ExpressionGame history={history} onStartVideo={handleStartTraining} />
      )}
      {activeView === "train" && stage === "upload" && (
        <UploadPanel
          error={error}
          file={selectedFile}
          analysisActive={analysisActive}
          analysisProgress={Math.round(progress)}
          analysisStep={analysisStep}
          onAnalyze={handleAnalyze}
          onClearHistory={handleClearHistory}
          onFileSelect={handleFileSelect}
          onTrainingContextChange={handleTrainingContextChange}
          onOpenHistory={handleOpenHistory}
          onShowProgress={() => setStage("analyzing")}
          onUseDemo={handleUseDemo}
          previewUrl={previewUrl}
          trainingContext={trainingContext}
          videoInfo={selectedVideoInfo}
          history={history}
        />
      )}

      {activeView === "train" && stage === "analyzing" && (
        <ProgressPanel
          progress={Math.round(progress)}
          step={analysisStep}
          onBackToHome={() => setStage("upload")}
          onCancel={handleCancelAnalysis}
        />
      )}

      {activeView === "train" && stage === "report" && report && (
        <Suspense fallback={<section className="center-panel"><div className="loader" /><h2>正在打开训练报告</h2></section>}>
          <ReportDashboard
            report={report}
            history={history}
            onReset={handleReset}
            onPracticeAgain={handleReset}
            analysisActive={analysisActive}
          />
        </Suspense>
      )}
      {showOnboarding && <OnboardingGuide onClose={handleCloseOnboarding} />}
    </main>
  );
}
