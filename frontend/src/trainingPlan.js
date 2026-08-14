export const TRAINING_SCENARIOS = [
  { value: "speech", label: "演讲比赛", hint: "强调观点、感染力和舞台呈现" },
  { value: "presentation", label: "课堂 / 工作汇报", hint: "强调结构、信息清楚和节奏" },
  { value: "interview", label: "面试 / 自我介绍", hint: "强调重点、可信度和镜头交流" },
  { value: "improv", label: "即兴表达", hint: "强调快速组织和流畅表达" },
];

export const TRAINING_FOCUSES = [
  { value: "baseline", label: "先做全面体检" },
  { value: "content", label: "内容更有条理" },
  { value: "voice", label: "说话更流畅有力" },
  { value: "camera_contact", label: "更敢看观众 / 镜头" },
  { value: "gesture", label: "手势姿态更自然" },
];

export const DEFAULT_TRAINING_CONTEXT = {
  scenario: "speech",
  focus: "baseline",
  targetMinutes: 3,
};

export const SCORE_LABELS = {
  content: "内容结构",
  voice: "声音节奏",
  gesture: "手势表达",
  posture: "身体姿态",
  camera_contact: "镜头交流",
};

const DRILLS = {
  content: {
    title: "一句话 + 三点法",
    target: "让听众在 20 秒内知道主题，并能复述三个要点",
    steps: ["用一句话说清主题", "只保留三个要点，每点补一个例子", "用一句总结自然收尾"],
    cue: "今天我想说明……首先……其次……最后……所以……",
  },
  voice: {
    title: "关键词停顿练习",
    target: "用停顿替代口头禅，让重点句清楚落地",
    steps: ["圈出 5 个关键词", "关键词前放慢，讲完停 1 秒", "回听 30 秒，删掉一个口头禅"],
    cue: "看到句号就停一拍；忘词时先呼吸，不用“嗯、然后”填空。",
  },
  gesture: {
    title: "三个观点三个手势",
    target: "让手势服务观点，减少无意义摆动",
    steps: ["双手自然放在腹前", "三个要点各设计一个开放手势", "每个动作结束后回到自然位置"],
    cue: "只在关键词出现时做动作，动作完成就收回。",
  },
  posture: {
    title: "稳定站姿一分钟",
    target: "保持重心稳定，同时让上半身自然放松",
    steps: ["双脚与肩同宽站稳", "肩颈放松，目光平视", "连续讲 60 秒，脚不来回移动"],
    cue: "脚下贴两个定位点，只让上半身自然配合表达。",
  },
  camera_contact: {
    title: "三点目光法",
    target: "开头、转折和结尾都主动建立镜头交流",
    steps: ["把逐字稿改成 5 个关键词", "每讲完一个观点看镜头 1 秒", "结尾看镜头说完整总结"],
    cue: "把镜头想象成一个正在认真听你说话的人。",
  },
};

export function getPrimaryTrainingDimension(scores = {}, preferredFocus = "baseline") {
  if (preferredFocus !== "baseline" && Number.isFinite(scores[preferredFocus])) {
    return preferredFocus;
  }
  return Object.keys(SCORE_LABELS)
    .filter((key) => Number.isFinite(scores[key]))
    .sort((a, b) => scores[a] - scores[b])[0] || "content";
}

export function buildBeginnerDrill(scores = {}, preferredFocus = "baseline") {
  const key = getPrimaryTrainingDimension(scores, preferredFocus);
  return { key, label: SCORE_LABELS[key], ...DRILLS[key] };
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
