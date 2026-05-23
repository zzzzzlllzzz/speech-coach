import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
} from "recharts";

const LABELS = {
  content: "内容",
  voice: "语音",
  gesture: "手势",
  posture: "姿态",
  camera_contact: "镜头",
};

export default function RadarChart({ scores }) {
  const data = Object.entries(LABELS).map(([key, label]) => ({
    label,
    value: scores[key],
  }));

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={300}>
        <RechartsRadarChart data={data}>
          <PolarGrid stroke="#d8ddff" />
          <PolarAngleAxis dataKey="label" tick={{ fill: "#4b587c", fontSize: 13 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="#6157f8"
            fill="#6157f8"
            fillOpacity={0.28}
            strokeWidth={3}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
