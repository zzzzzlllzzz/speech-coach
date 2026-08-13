import { useState } from "react";

const pages = [
  {
    kicker: "欢迎使用言镜 AI",
    title: "一次训练，得到看得懂、做得到的反馈",
    text: "系统会同时分析内容结构、语音节奏、手势、姿态和镜头交流，并标出具体问题时间点。",
    points: ["上传 1–3 分钟视频", "等待多模态分析", "按训练计划录制下一版"],
  },
  {
    kicker: "结果可信",
    title: "每个分数都能追溯到依据",
    text: "点击报告中的任一维度，即可查看评分证据、发现的问题和针对性动作，不对心理状态做猜测。",
    points: ["区分真实分析与降级结果", "保留文字稿与关键指标", "支持问题画面回看"],
  },
  {
    kicker: "持续进步",
    title: "不要只看一次分数，要看变化",
    text: "能力成长页会保留最近训练。建议围绕同一主题录制第二版，对比综合分和最弱维度。",
    points: ["一次只改善 1–2 项", "完成报告内三步训练", "用同一主题复测"],
  },
];

export default function OnboardingGuide({ onClose }) {
  const [page, setPage] = useState(0);
  const current = pages[page];

  return (
    <div className="onboarding-backdrop" role="presentation">
      <section className="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="onboarding-progress" aria-label={`新手指南 ${page + 1}/${pages.length}`}>
          {pages.map((item, index) => <i className={index <= page ? "active" : ""} key={item.title} />)}
        </div>
        <p className="eyebrow">{current.kicker}</p>
        <h2 id="onboarding-title">{current.title}</h2>
        <p>{current.text}</p>
        <ul>{current.points.map((point) => <li key={point}>{point}</li>)}</ul>
        <div className="onboarding-actions">
          <button className="text-button" type="button" onClick={onClose}>跳过</button>
          {page > 0 && <button className="secondary-button" type="button" onClick={() => setPage(page - 1)}>上一步</button>}
          <button className="primary-compact" type="button" onClick={() => page === pages.length - 1 ? onClose() : setPage(page + 1)}>
            {page === pages.length - 1 ? "开始第一次训练" : "下一步"}
          </button>
        </div>
      </section>
    </div>
  );
}
