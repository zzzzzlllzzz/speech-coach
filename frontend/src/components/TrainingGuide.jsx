import { useState } from "react";

const scenarios = {
  speech: { label: "演讲比赛", icon: "台", focus: "观点鲜明、情绪有起伏、结尾有号召力", opening: "你是否想过，真正限制我们的，可能不是能力，而是……", drill: "选一句核心观点，先平读一次，再加入重音、停顿和一个开放手势。", checks: ["20 秒内亮出主题", "三个观点各有例证", "最后一句看向观众"] },
  presentation: { label: "课堂 / 工作汇报", icon: "报", focus: "结论先行、信息清楚、让听众知道下一步", opening: "结论先说：本次工作的核心成果有两项，风险只剩一个。", drill: "把一段过程描述压缩成“结论 + 两个证据 + 下一步”。", checks: ["第一页就给结论", "数字配合对比解释", "明确负责人和时间"] },
  interview: { label: "面试 / 自我介绍", icon: "面", focus: "简洁可信、经历有证据、回答紧扣问题", opening: "我最能解决的问题是……过去一年，我用两次实际成果证明了它。", drill: "用“结论—情境—行动—结果”在 60 秒内讲完一段经历。", checks: ["先回答再解释", "每段经历有结果", "保持镜头目光交流"] },
  improv: { label: "即兴表达", icon: "即", focus: "快速搭结构、不卡在开头、忘词也能继续", opening: "关于这个问题，我的判断是……主要有两个原因。", drill: "随机选一个物品，用“观点—理由—例子—重申”讲 90 秒。", checks: ["准备时只写关键词", "超过两点先报路标", "忘词时停顿而不填词"] },
};

const mistakes = [
  { icon: "嗯", title: "口头禅太多", wrong: "用“嗯、然后”填满空白", right: "停半秒、吸气、再继续" },
  { icon: "稿", title: "一直低头读稿", wrong: "逐字朗读完整句子", right: "看关键词，抬头说完整句" },
  { icon: "平", title: "全程一个语调", wrong: "重点和过程同样速度", right: "重点前放慢，句后停一拍" },
  { icon: "晃", title: "身体无意识摇晃", wrong: "一紧张就左右换重心", right: "脚下站稳，换观点再移动" },
];

const weekPlan = [
  ["第 1 天", "建立基线", "自然讲 2 分钟，不刻意修饰"],
  ["第 2 天", "只练结构", "一句主题 + 三个观点"],
  ["第 3 天", "只练声音", "重音、停顿和语速变化"],
  ["第 4 天", "只练目光", "一句一抬头，结尾不逃"],
  ["第 5 天", "只练动作", "三个观点配三个手势"],
  ["第 6 天", "完整复练", "把四项能力合在一起"],
  ["第 7 天", "视频复测", "对比分数与问题时间点"],
];

export default function TrainingGuide({ onStart, onGame, onShowOnboarding }) {
  const [scenario, setScenario] = useState("speech");
  const activeScenario = scenarios[scenario];

  return (
    <section className="guide-layout guide-hub">
      <header className="guide-hero-rich">
        <div className="guide-hero-copy">
          <p className="eyebrow">训练指南 · 从第一次开口开始</p>
          <h1>不用天赋，也能把话<strong>说清楚、说动人</strong></h1>
          <p>不要一次改所有问题。每次只练一个动作，录下来、看证据、再说一遍，进步会更快被看见。</p>
          <div className="guide-hero-actions">
            <button className="game-primary" type="button" onClick={onStart}>上传视频，建立能力基线 →</button>
            <button className="game-secondary" type="button" onClick={onGame}>先玩 3 分钟表达闯关</button>
          </div>
          <div className="guide-trust-row"><span>✓ 零基础可用</span><span>✓ 每次只练一件事</span><span>✓ 用报告验证进步</span></div>
        </div>
        <article className="minute-practice-card">
          <div className="minute-card-top"><span>现在就能做</span><strong>60 秒</strong></div>
          <h2>一句话表达热身</h2>
          <ol>
            <li><b>10 秒</b><span>想清楚：我最想让对方记住什么？</span></li>
            <li><b>40 秒</b><span>说观点、一个理由、一个例子。</span></li>
            <li><b>10 秒</b><span>看向前方，再说一遍结论。</span></li>
          </ol>
          <blockquote>万能开头：“我想说清楚一件事……”</blockquote>
        </article>
      </header>

      <div className="guide-section-heading">
        <div><p className="eyebrow">今日训练路径</p><h2>15 分钟，完成一次有效练习</h2></div>
        <span>比漫无目的地反复录制更高效</span>
      </div>
      <div className="training-route">
        <article><span>01</span><div><small>3 分钟</small><h3>自然说一遍</h3><p>不要表演，先暴露真实习惯。</p></div></article><i>→</i>
        <article><span>02</span><div><small>5 分钟</small><h3>只改最低项</h3><p>从报告中选择一个最小动作。</p></div></article><i>→</i>
        <article><span>03</span><div><small>7 分钟</small><h3>重录并对比</h3><p>同一内容再说，确认是否改善。</p></div></article>
      </div>

      <div className="guide-section-heading scenario-heading"><div><p className="eyebrow">场景训练器</p><h2>你下一次要在哪儿开口？</h2></div></div>
      <div className="scenario-switcher" role="tablist" aria-label="表达场景">
        {Object.entries(scenarios).map(([key, item]) => (
          <button className={scenario === key ? "active" : ""} key={key} type="button" role="tab" aria-selected={scenario === key} onClick={() => setScenario(key)}><span>{item.icon}</span>{item.label}</button>
        ))}
      </div>
      <article className="scenario-guide-card">
        <div className="scenario-main">
          <span className="scenario-label">训练重点</span><h2>{activeScenario.focus}</h2>
          <div className="opening-template"><small>可以直接套用的开头</small><blockquote>“{activeScenario.opening}”</blockquote></div>
          <div className="scenario-drill"><b>今天只练这一遍</b><p>{activeScenario.drill}</p></div>
        </div>
        <aside><span>录制前检查</span>{activeScenario.checks.map((check) => <p key={check}><i>✓</i>{check}</p>)}<button className="primary-compact" type="button" onClick={onStart}>带着模板开始训练</button></aside>
      </article>

      <div className="guide-section-heading"><div><p className="eyebrow">新手最常见的 4 个问题</p><h2>别只知道问题，要知道替代动作</h2></div></div>
      <div className="mistake-grid">
        {mistakes.map((item) => <article key={item.title}><span>{item.icon}</span><h3>{item.title}</h3><p className="mistake-wrong"><b>×</b>{item.wrong}</p><p className="mistake-right"><b>✓</b>{item.right}</p></article>)}
      </div>

      <article className="week-plan-panel">
        <div className="week-plan-intro"><p className="eyebrow">7 天入门计划</p><h2>一周建立表达训练习惯</h2><p>每天 10–15 分钟，不追求一次完美，只让一个动作比昨天更稳定。</p></div>
        <div className="week-plan-list">
          {weekPlan.map(([day, title, detail], index) => <div key={day}><span>{index + 1}</span><small>{day}</small><strong>{title}</strong><p>{detail}</p></div>)}
        </div>
      </article>

      <article className="guide-final-cta">
        <div><span>准备好了吗？</span><h2>第一次不需要精彩，只需要真实。</h2><p>录一段你平时会说的内容，言镜会告诉你下一步最值得练什么。</p></div>
        <div><button className="game-primary" type="button" onClick={onStart}>开始第一次视频训练</button><button className="game-text-button" type="button" onClick={onShowOnboarding}>重看使用方法</button></div>
      </article>
    </section>
  );
}
