export const GAME_STORAGE_KEY = "speech-coach-ai-expression-game";

export const EXPRESSION_CARDS = [
  {
    id: "opening-hook",
    dimension: "content",
    category: "开场",
    title: "先抓住注意力",
    prompt: "你要做一场“拖延症”主题演讲，哪句更适合作为开场？",
    options: ["大家好，今天我演讲的题目是拖延症。", "你有没有在截止前一小时，突然变成效率最高的人？", "拖延症是一种常见现象，下面开始介绍。"],
    correct: 1,
    explanation: "具体问题会让听众立刻代入自己的经历，比报题目更容易建立注意力。",
    memoryHook: "开场先让听众看见自己，再告诉他你要讲什么。",
    drill: "看向听众，问出这句话，停 1 秒，再说主题。",
  },
  {
    id: "one-sentence-point",
    dimension: "content",
    category: "结构",
    title: "一句话先立观点",
    prompt: "汇报进度时，哪种表达最清楚？",
    options: ["这周做了很多事，过程也遇到一些问题……", "结论先说：核心功能已完成，风险只剩接口稳定性。", "我从周一做了什么开始讲吧。"],
    correct: 1,
    explanation: "先给结论，再补证据和过程，听众会更容易跟上你的结构。",
    memoryHook: "观点在前，理由在后；先给地图，再带路。",
    drill: "用“结论先说”开头，把你今天做的事压缩成一句话。",
  },
  {
    id: "signpost-three",
    dimension: "content",
    category: "结构",
    title: "给听众路标",
    prompt: "介绍三个方案时，怎样说能让听众不迷路？",
    options: ["方案很多，我一个一个说。", "我从成本、效果、风险三个方面比较。", "首先说方案一的背景和发展历程。"],
    correct: 1,
    explanation: "提前说出三个比较维度，相当于给听众一张路线图。",
    memoryHook: "超过两个要点，就先报路标。",
    drill: "选一个熟悉主题，用“我从三方面说”列出三个路标。",
  },
  {
    id: "evidence-example",
    dimension: "content",
    category: "说服",
    title: "抽象观点落到证据",
    prompt: "说“团队效率提高了”之后，接哪句话最有说服力？",
    options: ["总之，效率真的提高了很多。", "大家应该也能感觉到变化。", "同样任务从五天缩短到三天，返工次数减少了一半。"],
    correct: 2,
    explanation: "数字和可核验变化能支撑观点，避免只重复结论。",
    memoryHook: "观点后面跟一个数字、例子或对比。",
    drill: "给“我进步了”补一个能被别人验证的证据。",
  },
  {
    id: "pause-before-keyword",
    dimension: "voice",
    category: "停顿",
    title: "重点前先留白",
    prompt: "你要强调“真正的风险不是失败，而是不行动”，哪里最该停顿？",
    options: ["真正的风险不是失败 / 而是不行动。", "真正的风险 / 不是失败而是不行动。", "真正的 / 风险不是失败而是不行动。"],
    correct: 0,
    explanation: "停在转折处能制造预期，让“不行动”自然成为重音落点。",
    memoryHook: "重要答案出现前，先给听众半拍期待。",
    drill: "把这句话读两遍：第二遍在斜线处停 1 秒，并重读“不行动”。",
  },
  {
    id: "filler-to-pause",
    dimension: "voice",
    category: "流畅",
    title: "用静默替代口头禅",
    prompt: "突然忘词时，最专业的处理方式是什么？",
    options: ["连续说“嗯、然后、就是”争取时间。", "停半秒、吸气、看一眼关键词后继续。", "立刻道歉并从头开始。"],
    correct: 1,
    explanation: "短暂停顿在听众耳中通常是从容，而连续填充词会暴露慌乱。",
    memoryHook: "忘词不可怕，乱填才抢走可信度。",
    drill: "刻意停 2 秒，吸气，再完整说一句“我想强调的是……”。",
  },
  {
    id: "pace-contrast",
    dimension: "voice",
    category: "节奏",
    title: "用快慢制造层次",
    prompt: "讲到核心结论时，语速应该怎样变化？",
    options: ["保持全程同样速度。", "明显加速，一口气说完。", "核心句前放慢，关键词重读，句后停顿。"],
    correct: 2,
    explanation: "速度变化和停顿能告诉听众“这里重要”，全程平速会让重点消失。",
    memoryHook: "过程可以快，结论必须稳。",
    drill: "快速说十个字，再放慢说“这才是最重要的结论”。",
  },
  {
    id: "eye-contact-sentence",
    dimension: "camera_contact",
    category: "目光",
    title: "一句一抬头",
    prompt: "有提词稿时，哪种镜头交流更自然？",
    options: ["一直盯稿，最后再看一次镜头。", "记住一个意思单位，抬头对镜头说完整一句。", "每说两个字就在稿子和镜头间切换。"],
    correct: 1,
    explanation: "完整句的目光接触比频繁切换自然，也让听众感到你是在和他交流。",
    memoryHook: "低头取信息，抬头送表达。",
    drill: "只看关键词“为什么重要”，抬头对镜头说一个完整句子。",
  },
  {
    id: "eye-contact-ending",
    dimension: "camera_contact",
    category: "收尾",
    title: "最后一句不要逃",
    prompt: "演讲收尾时，哪种做法更有力量？",
    options: ["边低头收稿边说“谢谢大家”。", "看向听众，说完最后一句，停一拍再致谢。", "说完立刻转身离开。"],
    correct: 1,
    explanation: "最后一句后的目光和停顿能让观点落地，也给听众反应时间。",
    memoryHook: "结尾说完别急走，让观点站稳一秒。",
    drill: "看向前方说“改变，从下一次开口开始”，停 1 秒，再微笑致谢。",
  },
  {
    id: "gesture-keyword",
    dimension: "gesture",
    category: "手势",
    title: "动作只服务关键词",
    prompt: "讲“三个关键原因”时，手势怎么用最好？",
    options: ["全程快速挥手保持活力。", "说到一、二、三时分别做清晰计数手势，之后自然收回。", "双手一直背在身后避免出错。"],
    correct: 1,
    explanation: "有起点、有意义、有收回的手势，才能强化信息而不是制造干扰。",
    memoryHook: "关键词出现才出手，意思结束就回家。",
    drill: "说三个要点，每个要点只配一个动作，动作后回到腹前。",
  },
  {
    id: "open-gesture",
    dimension: "gesture",
    category: "手势",
    title: "开放而不是防御",
    prompt: "邀请大家参与行动时，哪种姿态最合适？",
    options: ["双臂抱胸，身体后仰。", "手指一直指向观众。", "掌心自然打开，手臂向观众方向舒展。"],
    correct: 2,
    explanation: "开放掌心更友好，也与“邀请”这个语言意图一致。",
    memoryHook: "动作要和话的意图同方向。",
    drill: "说“我邀请大家一起尝试”，同时做一次自然的开放手势。",
  },
  {
    id: "stable-posture",
    dimension: "posture",
    category: "姿态",
    title: "先站稳再表达",
    prompt: "站立演讲时，哪种基础姿态更可靠？",
    options: ["双脚与肩同宽，重心稳定，肩颈放松。", "不断左右换重心，看起来更活跃。", "双腿交叉，身体靠向一侧。"],
    correct: 0,
    explanation: "稳定站姿能减少无意识晃动，让上半身动作更自然。",
    memoryHook: "脚下有根，手上才有表达。",
    drill: "双脚站稳，放松肩膀，保持下半身不动说 20 秒。",
  },
  {
    id: "purposeful-movement",
    dimension: "posture",
    category: "走位",
    title: "换观点再换位置",
    prompt: "舞台上什么时候移动最自然？",
    options: ["想到哪里就来回走。", "每隔五秒移动一次。", "进入新观点时移动一步，站稳后再继续讲。"],
    correct: 2,
    explanation: "移动与结构转换绑定，会让走位有原因，也帮助听众感知章节变化。",
    memoryHook: "观点换挡，脚步才换位。",
    drill: "说“第二个原因”，横移一步，站稳后再说后面的内容。",
  },
  {
    id: "ending-action",
    dimension: "content",
    category: "收尾",
    title: "结尾给出下一步",
    prompt: "关于节约用水的演讲，哪句结尾最可执行？",
    options: ["节约用水非常重要，我的演讲结束了。", "希望大家以后多多注意。", "从今晚开始，把洗漱时间缩短一分钟；一个月后看看你省下了多少水。"],
    correct: 2,
    explanation: "明确的时间、动作和反馈方式，能把认同转化成行动。",
    memoryHook: "好结尾不是“希望”，而是“何时做什么”。",
    drill: "给你的下次演讲补一句“今天结束后，请先……”。",
  },
];

export function emptyGameProgress() {
  return { xp: 0, streak: 0, lastStudyDate: "", sessions: 0, correct: 0, answered: 0, skills: {} };
}
export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayDistance(from, to) {
  if (!from) return Infinity;
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return Math.round((end - start) / 86400000);
}

function addDays(key, amount) {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

export function selectSessionCards(cards, progress, preferredDimension, count = 5) {
  const today = dateKey();
  const skills = progress?.skills || {};
  const ranked = cards.map((card, index) => {
    const skill = skills[card.id];
    const unseen = !skill;
    const due = !skill?.nextReview || skill.nextReview <= today;
    const weak = (skill?.wrong || 0) * 12 - (skill?.mastery || 0) * 3;
    const recommended = card.dimension === preferredDimension ? 18 : 0;
    return { card, score: (due ? 40 : 0) + (unseen ? 24 : 0) + weak + recommended - index * 0.01 };
  });
  return ranked.sort((a, b) => b.score - a.score).slice(0, count).map(({ card }) => card);
}

export function recordAnswer(progress, cardId, isCorrect, today = dateKey()) {
  const current = progress || emptyGameProgress();
  const previous = current.skills?.[cardId] || { mastery: 0, wrong: 0, seen: 0 };
  const mastery = isCorrect ? Math.min(5, previous.mastery + 1) : Math.max(0, previous.mastery - 1);
  const intervals = [0, 1, 2, 4, 7, 14];
  return {
    ...current,
    xp: current.xp + (isCorrect ? 12 : 3),
    correct: current.correct + (isCorrect ? 1 : 0),
    answered: current.answered + 1,
    skills: {
      ...current.skills,
      [cardId]: {
        mastery,
        wrong: previous.wrong + (isCorrect ? 0 : 1),
        seen: previous.seen + 1,
        nextReview: addDays(today, isCorrect ? intervals[mastery] : 0),
      },
    },
  };
}

export function completeSession(progress, today = dateKey()) {
  const current = progress || emptyGameProgress();
  const distance = dayDistance(current.lastStudyDate, today);
  const streak = distance === 0 ? current.streak : distance === 1 ? current.streak + 1 : 1;
  return { ...current, streak, lastStudyDate: today, sessions: current.sessions + 1, xp: current.xp + 20 };
}

export function getGameLevel(xp = 0) {
  const level = Math.floor(Math.max(0, xp) / 120) + 1;
  const current = Math.max(0, xp) % 120;
  return { level, current, target: 120, ratio: Math.round((current / 120) * 100) };
}

export function getPreferredDimension(history = []) {
  const scores = history.find((item) => item?.report?.scores)?.report?.scores || {};
  const keys = ["content", "voice", "gesture", "posture", "camera_contact"];
  return keys.filter((key) => Number.isFinite(scores[key])).sort((a, b) => scores[a] - scores[b])[0] || "content";
}
