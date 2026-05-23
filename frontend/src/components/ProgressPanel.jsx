function getStatusText(progress) {
  if (progress < 25) return "正在读取视频并准备浏览器端视觉分析";
  if (progress < 70) return "正在分析人脸朝向、姿态和手势关键点";
  if (progress < 88) return "正在上传视频并提取音频";
  if (progress < 97) return "正在等待后端生成报告，免费服务首次运行可能需要更久";
  return "报告即将完成";
}

export default function ProgressPanel({ progress }) {
  return (
    <section className="center-panel">
      <div className="loader" />
      <h2>AI 正在分析你的语言、动作、手势和镜头交流</h2>
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
