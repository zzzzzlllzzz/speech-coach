import VideoPreview from "./VideoPreview";
import { TRAINING_FOCUSES, TRAINING_SCENARIOS } from "../trainingPlan";

function formatHistoryTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return minutes > 0 ? `${minutes}分${rest}秒` : `${rest}秒`;
}

export default function UploadPanel({
  analysisActive = false,
  analysisProgress = 0,
  analysisStep = "",
  error,
  file,
  history = [],
  onAnalyze,
  onClearHistory,
  onFileSelect,
  onOpenHistory,
  onShowProgress,
  onTrainingContextChange,
  onUseDemo,
  previewUrl,
  trainingContext,
  videoInfo,
}) {
  const handleChange = (event) => {
    const nextFile = event.target.files?.[0];
    if (nextFile) {
      onFileSelect(nextFile);
    }
  };

  return (
    <section className="hero-layout">
      <div className="hero-copy">
        <p className="eyebrow">AI Expression Coach</p>
        <h1>每一次开口<br />都有进步依据</h1>
        <p className="subtitle">言镜 AI · 多模态公众表达训练助手</p>
        <p className="tagline">不只听你说了什么，也看你怎么说</p>
        <p className="intro">
          上传一段演讲视频，系统将生成语言表达、动作手势和镜头交流的可视化训练报告。
        </p>
        <div className="hero-highlights">
          <span>✓ 语音与结构</span>
          <span>✓ 姿态与手势</span>
          <span>✓ 镜头交流</span>
          <span>✓ 可执行训练计划</span>
        </div>
        <div className="flow-preview" aria-label="使用流程">
          <span><b>01</b>上传视频</span><i />
          <span><b>02</b>AI 分析</span><i />
          <span><b>03</b>针对训练</span>
        </div>
      </div>

      <div className="upload-card">
        <div className="upload-card-header">
          <span>新一轮训练</span>
          <strong>上传你的演讲视频</strong>
        </div>
        <div className="recording-checks" aria-label="录制建议">
          <span>人脸与上半身入镜</span><span>声音清晰</span><span>支持最长 30 分钟</span>
        </div>

        <section className="training-setup" aria-labelledby="training-setup-title">
          <div className="training-setup-heading">
            <span>训练目标</span>
            <strong id="training-setup-title">先告诉教练你要练什么</strong>
          </div>
          <div className="setup-field">
            <span>使用场景</span>
            <div className="choice-chips">
              {TRAINING_SCENARIOS.map((item) => (
                <button
                  className={trainingContext.scenario === item.value ? "active" : ""}
                  key={item.value}
                  type="button"
                  title={item.hint}
                  onClick={() => onTrainingContextChange({ scenario: item.value })}
                >{item.label}</button>
              ))}
            </div>
          </div>
          <div className="setup-field">
            <span>本轮重点</span>
            <select
              value={trainingContext.focus}
              onChange={(event) => onTrainingContextChange({ focus: event.target.value })}
            >
              {TRAINING_FOCUSES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="setup-field duration-field">
            <span>目标时长</span>
            <select
              value={trainingContext.targetMinutes}
              onChange={(event) => onTrainingContextChange({ targetMinutes: Number(event.target.value) })}
            >
              {[1, 3, 5, 10, 20, 30].map((minutes) => <option value={minutes} key={minutes}>{minutes} 分钟</option>)}
            </select>
            <small>分析仍覆盖完整视频；目标时长用于复练时控制表达篇幅。</small>
          </div>
        </section>
        <label className="upload-zone">
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.mov,.avi,.mkv"
            disabled={analysisActive}
            onChange={handleChange}
          />
          <span className="upload-icon">+</span>
          <strong>{file ? file.name : "上传视频文件"}</strong>
          <small>支持格式：mp4、mov、avi、mkv · 500MB 以内 · 长视频自动均匀抽帧</small>
        </label>

        {previewUrl && <VideoPreview src={previewUrl} />}

        {file && (
          <div className={`video-readiness ${videoInfo?.error ? "warning" : ""}`}>
            <strong>{videoInfo ? (videoInfo.error ? "视频预检需要注意" : "视频预检通过") : "正在读取视频信息…"}</strong>
            {videoInfo && !videoInfo.error && (
              <span>
                {Math.floor((videoInfo.duration || 0) / 60)}分{Math.round((videoInfo.duration || 0) % 60)}秒 · {(file.size / 1024 / 1024).toFixed(1)}MB ·
                {(videoInfo.duration || 0) > 300
                  ? ` 将全程均匀抽帧并上传完整音频，稳定转写预计至少 ${Math.max(2, Math.ceil((videoInfo.duration || 0) / 120))} 分钟`
                  : " 将优先本地提取音频以加快分析"}
              </span>
            )}
            {videoInfo?.error && <span>浏览器无法读取时长或编码，仍可尝试分析；失败后会给出明确原因，不会生成模拟评分。</span>}
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        {analysisActive && (
          <div className="background-analysis-card">
            <span>当前视频正在后台分析</span>
            <strong>{analysisStep || "正在生成报告"} · {analysisProgress}%</strong>
            <button type="button" onClick={onShowProgress}>
              查看进度
            </button>
          </div>
        )}

        <button className="primary-button" onClick={onAnalyze} disabled={!file || analysisActive}>
          {analysisActive ? "分析进行中" : "开始多模态分析"}
        </button>
        <button
          className="demo-button"
          type="button"
          onClick={onUseDemo}
          disabled={analysisActive}
        >
          使用示例视频体验完整流程
        </button>

        <section className="history-panel">
          <div className="history-heading">
            <div>
              <span>历史记录</span>
              <strong>最近分析</strong>
            </div>
            {history.length > 0 && (
              <button type="button" onClick={onClearHistory}>
                清空
              </button>
            )}
          </div>

          {history.length > 0 ? (
            <div className="history-list">
              {history.map((item) => (
                <button
                  className="history-item"
                  key={item.id}
                  type="button"
                  onClick={() => onOpenHistory(item)}
                >
                  <span>
                    <strong>{item.filename}</strong>
                    <small>
                      {formatHistoryTime(item.createdAt)} · {formatDuration(item.duration)}
                    </small>
                  </span>
                  <em>{item.overall ?? "未评分"}</em>
                </button>
              ))}
            </div>
          ) : (
            <p className="history-empty">完成一次分析后，这里会保留最近报告。</p>
          )}
        </section>
      </div>
    </section>
  );
}
