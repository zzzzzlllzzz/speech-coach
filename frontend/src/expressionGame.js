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
  {
    id: "audience-language",
    dimension: "content",
    category: "听众",
    title: "把术语翻译成人话",
    prompt: "向完全不懂技术的听众介绍“云存储”，哪种说法更容易理解？",
    options: ["它采用分布式对象存储架构。", "可以把它想成一个随时能打开的网络保险柜。", "它的底层具有高可用和弹性扩容能力。"],
    correct: 1,
    explanation: "用听众熟悉的事物作类比，能快速降低理解门槛。",
    memoryHook: "专家讲原理，高手先让人听懂。",
    drill: "挑一个专业词，不用术语，像向十岁孩子一样解释它。",
  },
  {
    id: "pyramid-answer",
    dimension: "content",
    category: "即兴",
    title: "即兴回答先搭骨架",
    prompt: "被临时问到“为什么选择这个方案”，最稳妥的回答顺序是？",
    options: ["想到哪说到哪，细节越多越好。", "先讲背景，再回忆过程，最后看时间是否够。", "先给结论，再说两点理由，最后重申建议。"],
    correct: 2,
    explanation: "结论—理由—重申是紧张时也容易执行的最小结构。",
    memoryHook: "先答问题，再解释答案。",
    drill: "用“我的结论是……原因有两点……”回答一个简单问题。",
  },
  {
    id: "transition-summary",
    dimension: "content",
    category: "转场",
    title: "换章节前先收一下",
    prompt: "从问题分析转到解决方案时，哪句转场最自然？",
    options: ["好了，下面再说别的。", "刚才我们看到了两个核心问题，接下来逐一给出解决办法。", "解决方案有很多，我挑几个讲。"],
    correct: 1,
    explanation: "先总结上一段，再预告下一段，听众能清楚感知结构变化。",
    memoryHook: "转场要一手收旧，一手开新。",
    drill: "用“刚才……接下来……”把两个话题连成一句话。",
  },
  {
    id: "voice-projection",
    dimension: "voice",
    category: "音量",
    title: "声音送到最后一排",
    prompt: "在没有麦克风的教室讲话，怎样提高音量最健康有效？",
    options: ["挤紧喉咙大喊。", "吸气后保持身体打开，把声音送向最后一排。", "每句话都提高音调。"],
    correct: 1,
    explanation: "气息支撑和明确的声音目标，比单纯挤压喉咙更清楚也更持久。",
    memoryHook: "放大声音靠气息，不靠嗓子硬扛。",
    drill: "深吸一口气，用清晰而不喊叫的声音说“最后一排能听见吗”。",
  },
  {
    id: "intonation-question",
    dimension: "voice",
    category: "语调",
    title: "别把所有句子说成直线",
    prompt: "想让反问句“难道我们只能等待吗”更有感染力，应该怎样处理？",
    options: ["全句平铺直叙。", "前半句稍抬语调，重读“只能”，句末留出停顿。", "快速小声说完。"],
    correct: 1,
    explanation: "语调起伏、关键词重音和句后停顿共同传达反问的力量。",
    memoryHook: "语调表达态度，文字只负责内容。",
    drill: "先平读，再带着不甘的情绪读一遍这句反问。",
  },
  {
    id: "breath-phrase",
    dimension: "voice",
    category: "气息",
    title: "在意思结束处换气",
    prompt: "长句讲到一半气不够，最好的处理方式是什么？",
    options: ["坚持说完，后半句越来越小声。", "提前按意思分组，在短语边界自然换气。", "每隔三四个字固定吸气。"],
    correct: 1,
    explanation: "按意群换气既保护声音，也不会破坏听众对句意的理解。",
    memoryHook: "换气跟着意思走，不跟着字数走。",
    drill: "给一个长句画两条斜线，只在斜线处换气后读完。",
  },
  {
    id: "eye-three-zones",
    dimension: "camera_contact",
    category: "目光",
    title: "照顾不同区域的听众",
    prompt: "面对较宽的会场，目光应该怎样移动？",
    options: ["只看最中间最友好的人。", "快速来回扫视全场。", "一次看左、中、右一个区域，各说完整一句再自然转换。"],
    correct: 2,
    explanation: "分区并保持一个完整意思单位，能让每个区域都感到被交流。",
    memoryHook: "目光不是扫场，而是一句送给一群人。",
    drill: "选左、中、右三个点，每看一个点说完一句话。",
  },
  {
    id: "notes-glance",
    dimension: "camera_contact",
    category: "提词",
    title: "提纲只写触发词",
    prompt: "为了减少低头读稿，提纲最适合写成什么样？",
    options: ["完整逐字稿，字号尽量小。", "每段只写关键词、数字和转场提示。", "只写演讲标题，其他全部临场发挥。"],
    correct: 1,
    explanation: "关键词能唤起内容，又不会诱使你逐字朗读。",
    memoryHook: "提纲负责提醒，不负责替你讲话。",
    drill: "把一段三句话的稿子压缩成三个关键词，再抬头复述。",
  },
  {
    id: "online-lens",
    dimension: "camera_contact",
    category: "镜头",
    title: "线上发言看镜头",
    prompt: "视频会议中讲关键结论时，眼睛应该看哪里？",
    options: ["一直看自己的小窗口。", "看摄像头，把它当成对方的眼睛。", "看屏幕角落避免紧张。"],
    correct: 1,
    explanation: "看镜头会让远端听众感到你在直视他们，关键句尤其有效。",
    memoryHook: "看屏幕是你在看人，看镜头是对方看见你在看他。",
    drill: "在镜头旁贴一个小点，看着它完整说出你的结论。",
  },
  {
    id: "audience-reaction",
    dimension: "camera_contact",
    category: "互动",
    title: "看见听众的反馈",
    prompt: "发现听众皱眉、似乎没听懂时，最好的反应是？",
    options: ["无视反馈，严格按稿讲完。", "立刻质问大家为什么不认真。", "放慢速度，换一个例子，并用一句话确认理解。"],
    correct: 2,
    explanation: "目光交流不仅是看人，还要根据反馈及时调整表达。",
    memoryHook: "交流不是把话说完，而是确认对方收到。",
    drill: "练习说“换个更简单的例子”，然后用一个生活场景重讲观点。",
  },
  {
    id: "gesture-size-match",
    dimension: "gesture",
    category: "手势",
    title: "动作大小匹配场地",
    prompt: "在大型舞台讲“我们需要更大的改变”，手势怎样更合适？",
    options: ["只动手指，动作越小越稳重。", "用清晰舒展的动作打开身体，但不过度挥舞。", "双手一直插在口袋里。"],
    correct: 1,
    explanation: "场地越大，动作幅度需要适当放大，才能被远处观众读懂。",
    memoryHook: "小房间用小动作，大舞台让动作被看见。",
    drill: "同一句话分别用小、中、大三种动作幅度演一遍。",
  },
  {
    id: "avoid-face-touch",
    dimension: "gesture",
    category: "习惯",
    title: "减少紧张小动作",
    prompt: "讲话时总摸头发、碰脸，最有效的改法是什么？",
    options: ["强迫双手完全不动。", "给双手一个自然等待位置，只在关键词时做设计好的动作。", "拿更多东西在手上转移注意。"],
    correct: 1,
    explanation: "明确的手势起点和少量计划动作，比单纯压制习惯更容易坚持。",
    memoryHook: "双手有归处，紧张才不会到处跑。",
    drill: "双手自然放在腹前，讲 20 秒，只允许做一次有意义的动作。",
  },
  {
    id: "prop-use",
    dimension: "gesture",
    category: "道具",
    title: "道具用完就放下",
    prompt: "展示完一个产品后，应该怎样处理手中的道具？",
    options: ["继续拿着它直到演讲结束。", "边说边反复转动它。", "展示结束后平稳放回，让注意力重新回到观点。"],
    correct: 2,
    explanation: "无关阶段继续把玩道具会分散听众注意力，也容易暴露紧张。",
    memoryHook: "道具出场要有任务，任务完成就退场。",
    drill: "拿一本书做 5 秒展示，放稳后看向听众继续说话。",
  },
  {
    id: "nervous-sway",
    dimension: "posture",
    category: "稳定",
    title: "停止无意识摇晃",
    prompt: "回看视频发现身体一直左右晃，下一次训练该怎么做？",
    options: ["双腿完全绷紧。", "在地面设两个脚位，先稳定重心，再练上半身表达。", "加快走动，让摇晃不明显。"],
    correct: 1,
    explanation: "脚位提示能建立稳定基线，再逐渐加入有目的的移动。",
    memoryHook: "先消除无目的的动，再增加有目的的动。",
    drill: "在两脚位置贴标记，站稳讲 30 秒并保持膝盖放松。",
  },
  {
    id: "seated-posture",
    dimension: "posture",
    category: "坐姿",
    title: "坐着汇报也要有能量",
    prompt: "线上会议坐着发言，哪种姿态最好？",
    options: ["身体后仰靠住椅背。", "坐在椅子前部，脊柱自然挺直，双脚稳定落地。", "身体尽量贴近摄像头。"],
    correct: 1,
    explanation: "稳定而略微向前的坐姿能改善气息，也传达投入感。",
    memoryHook: "坐稳、坐直、微微向交流方向打开。",
    drill: "调整椅子和镜头，双脚落地，用完整气息说三句话。",
  },
  {
    id: "stage-turn",
    dimension: "posture",
    category: "舞台",
    title: "转身后再开口",
    prompt: "需要转向屏幕指示图表时，怎样做最清楚？",
    options: ["背对观众一边看屏幕一边讲。", "先停顿并转身指示，回到观众方向后继续完整表达。", "快速来回转头，同时不停说话。"],
    correct: 1,
    explanation: "动作与语言分开能避免声音丢失，也减少慌乱感。",
    memoryHook: "脚步先到位，语言再出发。",
    drill: "练习“停—转—指—回—说”五步动作，过程不抢话。",
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
  const dailyJitter = (id) => {
    let hash = 0;
    for (const character of `${today}-${id}`) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    return (hash % 900) / 100;
  };
  const ranked = cards.map((card, index) => {
    const skill = skills[card.id];
    const unseen = !skill;
    const due = !skill?.nextReview || skill.nextReview <= today;
    const weak = (skill?.wrong || 0) * 12 - (skill?.mastery || 0) * 3;
    const recommended = card.dimension === preferredDimension ? 18 : 0;
    return { card, score: (due ? 40 : 0) + (unseen ? 24 : 0) + weak + recommended + dailyJitter(card.id) - index * 0.001 };
  });
  ranked.sort((a, b) => b.score - a.score);
  const selected = [];
  const dimensionCounts = {};
  for (const item of ranked) {
    if (selected.length >= count) break;
    if ((dimensionCounts[item.card.dimension] || 0) >= 2) continue;
    selected.push(item.card);
    dimensionCounts[item.card.dimension] = (dimensionCounts[item.card.dimension] || 0) + 1;
  }
  if (selected.length < count) {
    for (const { card } of ranked) {
      if (selected.length >= count) break;
      if (!selected.some((item) => item.id === card.id)) selected.push(card);
    }
  }
  return selected;
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
