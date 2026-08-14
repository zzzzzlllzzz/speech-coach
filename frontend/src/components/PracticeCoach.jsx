import { useEffect, useMemo, useState } from "react";
import { buildBeginnerDrill, formatDuration } from "../trainingPlan";

export default function PracticeCoach({ report, onPracticeAgain }) {
  const focus = report.training_context?.focus || "baseline";
  const drill = useMemo(() => buildBeginnerDrill(report.scores || {}, focus), [report, focus]);
  const [checked, setChecked] = useState(() => drill.steps.map(() => false));
  const [remaining, setRemaining] = useState(300);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || remaining <= 0) return undefined;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, remaining]);

  useEffect(() => {
    if (remaining === 0) setRunning(false);
  }, [remaining]);

  const completeCount = checked.filter(Boolean).length;

  return (
    <article className="practice-coach panel">
      <div className="practice-coach-copy">
        <span className="coach-kicker">先别急着看完所有分数</span>
        <h2>这次只练一件事：{drill.label}</h2>
        <p>{drill.target}</p>
        <blockquote>{drill.cue}</blockquote>
      </div>
      <div className="practice-session">
        <div className="practice-timer" aria-live="polite">
          <span>5 分钟专项练习</span>
          <strong>{formatDuration(remaining)}</strong>
          <div>
            <button type="button" onClick={() => setRunning((value) => !value)}>
              {running ? "暂停" : remaining === 300 ? "开始计时" : "继续"}
            </button>
            <button type="button" onClick={() => { setRunning(false); setRemaining(300); }}>重置</button>
          </div>
        </div>
        <div className="practice-checklist">
          {drill.steps.map((step, index) => (
            <label key={step} className={checked[index] ? "done" : ""}>
              <input
                type="checkbox"
                checked={checked[index]}
                onChange={() => setChecked((items) => items.map((item, itemIndex) => itemIndex === index ? !item : item))}
              />
              <span>{index + 1}</span>{step}
            </label>
          ))}
        </div>
        <button className="primary-button practice-again-button" type="button" onClick={onPracticeAgain}>
          {completeCount === drill.steps.length ? "带着改进目标录制第二版" : `完成 ${completeCount}/${drill.steps.length} · 准备复练`}
        </button>
      </div>
    </article>
  );
}
