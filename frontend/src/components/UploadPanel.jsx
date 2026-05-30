import VideoPreview from "./VideoPreview";

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
  previewUrl,
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
        <p className="eyebrow">AI Expression Trainer</p>
        <h1>Speech Coach</h1>
        <p className="subtitle">多模态公众表达训练助手</p>
        <p className="tagline">不只听你说了什么，也看你怎么说</p>
        <p className="intro">
          上传一段演讲视频，系统将生成语言表达、动作手势和镜头交流的可视化训练报告。
        </p>
        <div className="hero-highlights">
          <span>语音转写</span>
          <span>动作分析</span>
          <span>可解释评分</span>
        </div>
      </div>

      <div className="upload-card">
        <div className="upload-card-header">
          <span>比赛演示入口</span>
          <strong>上传演讲视频</strong>
        </div>
        <label className="upload-zone">
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.mov,.avi,.mkv"
            disabled={analysisActive}
            onChange={handleChange}
          />
          <span className="upload-icon">+</span>
          <strong>{file ? file.name : "上传视频文件"}</strong>
          <small>支持格式：mp4、mov、avi、mkv · 200MB 以内 · 建议 1 到 3 分钟</small>
        </label>

        {previewUrl && <VideoPreview src={previewUrl} />}

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
          {analysisActive ? "分析进行中" : "开始分析"}
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
