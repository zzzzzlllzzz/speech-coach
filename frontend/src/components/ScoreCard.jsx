const SCORE_LABELS = {
  content: "内容表达",
  voice: "声音语速",
  gesture: "手势表现",
  posture: "身体姿态",
  camera_contact: "镜头交流",
  overall: "综合表现",
};

export default function ScoreCard({ name, value }) {
  return (
    <article className="score-card">
      <span>{SCORE_LABELS[name] || name}</span>
      <strong>{value}</strong>
      <div className="score-bar" aria-hidden="true">
        <div style={{ width: `${value}%` }} />
      </div>
    </article>
  );
}
