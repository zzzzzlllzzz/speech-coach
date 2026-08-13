const SCORE_LABELS = {
  content: "内容表达",
  voice: "声音语速",
  gesture: "手势表现",
  posture: "身体姿态",
  camera_contact: "镜头交流",
  overall: "综合表现",
};

export default function ScoreCard({ name, value, onClick }) {
  const available = Number.isFinite(value);
  const score = available ? value : 0;
  const label = SCORE_LABELS[name] || name;

  return (
    <button
      className="score-card score-card-button"
      type="button"
      onClick={onClick}
      disabled={!available}
      aria-label={available ? `查看${label}详细诊断` : `${label}本次未评分`}
    >
      <span>{label}</span>
      <strong>{available ? score : "—"}</strong>
      <div className="score-bar" aria-hidden="true">
        <div style={{ width: `${score}%` }} />
      </div>
      <em>{available ? "查看详情" : "数据不足"}</em>
    </button>
  );
}
