function getStatusText(progress) {
  if (progress < 25) return "正在做本地预处理，页面没有卡住，请保持当前窗口打开。";
  if (progress < 70) return "正在逐帧分析姿态、手势和镜头交流，大视频会自动降低抽帧密度。";
  if (progress < 88) return "正在上传必要数据。大视频会优先上传音频和视觉指标，减少等待。";
  if (progress < 97) return "后端正在进行语音识别、文本整理和评分，请再等一下。";
  return "报告即将完成";
}

export default function ProgressPanel({ progress, step }) {
  return (
    <section className="center-panel">
      <div className="loader" />
      <h2>AI 正在分析你的语言、动作、手势和镜头交流</h2>
      <div className="current-step">{step}</div>
      <p className="progress-status">{getStatusText(progress)}</p>
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
