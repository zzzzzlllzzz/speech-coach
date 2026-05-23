import RadarChart from "./RadarChart";
import ScoreCard from "./ScoreCard";
import TimelineIssues from "./TimelineIssues";

const scoreKeys = ["content", "voice", "gesture", "posture", "camera_contact", "overall"];

const metricLabels = {
  speech_rate: "语速",
  filler_total: "口头禅总数",
  face_visible_ratio: "人脸可见比例",
  looking_camera_ratio: "近似镜头交流",
  head_down_count: "低头次数",
  body_sway_score: "身体稳定分",
  gesture_activity: "手势活跃度",
  hand_visible_ratio: "手部可见比例",
  face_block_count: "遮脸次数",
  expression_change_score: "表情变化分",
};

const keyMetricKeys = [
  "speech_rate",
  "filler_total",
  "looking_camera_ratio",
  "head_down_count",
  "gesture_activity",
  "body_sway_score",
];

const visualMetricKeys = [
  "face_visible_ratio",
  "hand_visible_ratio",
  "face_block_count",
  "expression_change_score",
];

function formatMetric(key, value, transcript) {
  if (value === null || value === undefined) {
    return "未检测";
  }
  if (key.includes("ratio") || key === "gesture_activity") {
    return `${Math.round(value * 100)}%`;
  }
  if (key === "speech_rate") {
    return transcript?.speech_rate_reliable === false
      ? `${value} 字/分钟（演示估算）`
      : `${value} 字/分钟`;
  }
  return value;
}

export default function ReportDashboard({ report, onReset }) {
  const fillerEntries = Object.entries(report.transcript.filler_words || {});
  const fillerTotal = fillerEntries.reduce((total, [, count]) => total + count, 0);
  const hasDemoMode = report.transcript.mock_mode || report.visual_metrics.mock_mode;
  const analysisStatus = report.analysis_status || {};
  const keyMetrics = {
    speech_rate: report.transcript.speech_rate,
    filler_total: fillerTotal,
    looking_camera_ratio: report.visual_metrics.looking_camera_ratio,
    head_down_count: report.visual_metrics.head_down_count,
    gesture_activity: report.visual_metrics.gesture_activity,
    body_sway_score: report.visual_metrics.body_sway_score,
  };
  const analysisFlags = [
    ["开头", report.transcript.has_opening],
    ["结尾", report.transcript.has_ending],
    ["主题句", report.transcript.has_topic],
  ];
  const visualMode = analysisStatus.visual?.mode || (report.visual_metrics.mock_mode ? "mock" : "real");
  const visualSourceLabel =
    visualMode === "browser_mediapipe"
      ? "浏览器 MediaPipe 真实分析"
      : visualMode === "opencv"
      ? "OpenCV 真实近似分析"
      : report.visual_metrics.mock_mode
        ? "Fallback 指标"
        : "MediaPipe 真实分析";

  return (
    <section className="report-layout">
      <header className="report-header">
        <div>
          <p className="eyebrow">训练报告</p>
          <h1>言镜 AI 分析结果</h1>
          <p>{report.summary}</p>
        </div>
        <div className="report-actions">
          <button className="secondary-button" onClick={() => window.print()}>
            导出演示报告
          </button>
          <button className="secondary-button" onClick={onReset}>
            重新上传并分析
          </button>
        </div>
      </header>

      {hasDemoMode && (
        <div className="demo-notice">
          部分模块启用了 fallback：页面会继续给出可解释建议，但带有“演示估算”的指标不作为真实能力判断。
        </div>
      )}

      <div className="source-grid">
        <article className={report.transcript.mock_mode ? "source-card mock" : "source-card"}>
          <span>语音识别来源</span>
          <strong>{report.transcript.mock_mode ? "Fallback 文本" : "Whisper 真实识别"}</strong>
          <p>{analysisStatus.speech?.message}</p>
        </article>
        <article className={report.visual_metrics.mock_mode ? "source-card mock" : "source-card"}>
          <span>视觉分析来源</span>
          <strong>{visualSourceLabel}</strong>
          <p>{analysisStatus.visual?.message}</p>
        </article>
      </div>

      <div className="overall-card">
        <span>综合分</span>
        <strong>{report.scores.overall}</strong>
        <p>{report.summary}</p>
      </div>

      <div className="score-grid">
        {scoreKeys.map((key) => (
          <ScoreCard key={key} name={key} value={report.scores[key]} />
        ))}
      </div>

      <div className="dashboard-grid">
        <article className="panel chart-panel">
          <h2>六维能力雷达图</h2>
          <RadarChart scores={report.scores} />
        </article>

        <article className="panel">
          <h2>关键指标</h2>
          <div className="metric-grid">
            {keyMetricKeys.map((key) => (
              <div className="metric-item" key={key}>
                <span>{metricLabels[key]}</span>
                <strong>{formatMetric(key, keyMetrics[key], report.transcript)}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="panel">
          <div className="panel-title-row">
            <h2>视觉关键指标</h2>
            <span className={report.visual_metrics.mock_mode ? "status-pill mock" : "status-pill"}>
              {report.visual_metrics.mock_mode ? "Mock 模式" : "视觉分析"}
            </span>
          </div>
          <div className="metric-grid">
            {visualMetricKeys.map((key) => (
              <div className="metric-item" key={key}>
                <span>{metricLabels[key]}</span>
                <strong>{formatMetric(key, report.visual_metrics[key], report.transcript)}</strong>
              </div>
            ))}
          </div>
      </article>

      <div className="dashboard-grid">
        <article className="panel">
          <h2>问题时间点</h2>
          <TimelineIssues issues={report.issues} />
        </article>

        <article className="panel">
          <h2>个性化建议</h2>
          <ul className="suggestion-list">
            {report.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </article>
      </div>

      <article className="panel transcript-panel">
        <div className="panel-title-row">
          <h2>演讲文字转写</h2>
          <span className={report.transcript.mock_mode ? "status-pill mock" : "status-pill"}>
            {report.transcript.mock_mode ? "Mock 模式" : "真实识别"}
          </span>
        </div>
        <div className="transcript-meta">
          <span>字数：{report.transcript.word_count}</span>
          <span>语速：{report.transcript.speech_rate} 字/分钟</span>
          <span>时长：{report.transcript.duration} 秒</span>
          <span>逻辑连接词：{report.transcript.logic_words_count}</span>
        </div>

        <div className="text-analysis-grid">
          <div>
            <h3>口头禅统计</h3>
            {fillerEntries.length > 0 ? (
              <div className="filler-list">
                {fillerEntries.map(([word, count]) => (
                  <span key={word}>
                    {word}：{count}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted-text">未检测到明显口头禅。</p>
            )}
          </div>

          <div>
            <h3>结构提示</h3>
            <div className="flag-list">
              {analysisFlags.map(([label, enabled]) => (
                <span className={enabled ? "flag enabled" : "flag"} key={label}>
                  {label}：{enabled ? "有" : "未检测到"}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p>{report.transcript.text}</p>
      </article>
    </section>
  );
}
