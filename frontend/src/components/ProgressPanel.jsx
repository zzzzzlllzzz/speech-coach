export default function ProgressPanel({ progress }) {
  return (
    <section className="center-panel">
      <div className="loader" />
      <h2>AI 正在分析你的语言、动作、手势和镜头交流</h2>
      <div className="analysis-steps">
        <span>保存视频</span>
        <span>提取音频</span>
        <span>识别文字</span>
        <span>视觉分析</span>
        <span>生成报告</span>
      </div>
      <div className="progress-track" aria-label="分析进度">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <p>{progress}%</p>
    </section>
  );
}
