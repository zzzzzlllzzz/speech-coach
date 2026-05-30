import { useEffect, useState } from "react";

const speechTips = [
  "开场先用一句话说明主题，观众会更快知道你要讲什么。",
  "讲到重点观点后停顿 1 秒，比一直加快语速更有层次。",
  "列举观点时可以配合开放式手势，让结构更容易被看见。",
  "看稿时尽量短看快抬头，每讲完一个观点后重新看向镜头。",
  "如果忘词，可以用短暂停顿代替“嗯、啊、然后”等填充词。",
  "结尾最好用一句总结或感谢自然收束，不要突然停住。",
  "身体重心保持稳定，表达会显得更清楚、更有控制感。",
  "演讲稿可以用“首先、其次、最后”先搭骨架，再补细节。",
  "站姿站稳，双脚与肩同宽，尽量避免身体来回晃动。",
  "双肩放松，不要刻意耸肩或让上半身显得僵硬。",
  "手势保持自然，幅度适中，减少摸脸、挠头等小动作。",
  "目光平视前方，减少长时间低头看稿或躲开镜头。",
  "眼神可以缓慢扫动，像照顾全场听众一样分配视线。",
  "对视时保持从容，不需要盯太久，短暂停留就足够自然。",
  "语速可以适当放缓，重点词句前后留出一点停顿。",
  "吐字尽量清晰，音量保持稳定，不要忽大忽小。",
  "语气要有起伏，重点句可以稍微加强，不要全程平铺直叙。",
  "开场简洁直接，快速把听众带到你的主题里。",
  "少说口头禅，比如“嗯、啊、然后、就是”，可以用停顿替代。",
  "观点分层表达，听众会更容易理解你的逻辑。",
  "结尾要利落，可以用一句总结或感谢自然收尾。",
  "上台前先深呼吸一次，帮助自己把节奏放稳。",
  "忘词时不要急，短暂停顿、看一眼提纲，再继续说。",
  "把注意力放在内容和观众理解上，不用一直纠结自己表现。",
];

function getStatusText(progress) {
  if (progress < 25) return "正在做本地预处理，页面没有卡住，请保持当前窗口打开。";
  if (progress < 70) return "正在逐帧分析姿态、手势和镜头交流，大视频会自动降低抽帧密度。";
  if (progress < 88) return "正在上传必要数据。大视频会优先上传音频和视觉指标，减少等待。";
  if (progress < 97) return "后端正在进行语音识别、文本整理和评分，请再等一下。";
  return "报告即将完成";
}

export default function ProgressPanel({ progress, step, onBackToHome }) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % speechTips.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, []);

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
      <aside className="analysis-tip-card" aria-live="polite">
        <span>等待时可以想一想</span>
        <strong>{speechTips[tipIndex]}</strong>
      </aside>
      <button className="secondary-button" type="button" onClick={onBackToHome}>
        回到首页查看历史
      </button>
      <div className="progress-track" aria-label="分析进度">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <p>{progress}%</p>
    </section>
  );
}
