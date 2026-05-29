const SCORE_LABELS = {
  content: "内容表达",
  voice: "声音语速",
  gesture: "手势表现",
  posture: "身体姿态",
  camera_contact: "镜头交流",
  overall: "综合表现",
};

export default function ScoreCard({ name, value, onClick }) {
  const score = Number.isFinite(value) ? value : 0;
  const label = SCORE_LABELS[name] || name;

  return (
    <button
      className="score-card score-card-button"
      type="button"
      onClick={onClick}
      aria-label={`查看${label}详细诊断`}
    >
      <span>{label}</span>
      <strong>{score}</strong>
      <div className="score-bar" aria-hidden="true">
        <div style={{ width: `${score}%` }} />
      </div>
      <em>查看详情</em>
    </button>
  );
}
