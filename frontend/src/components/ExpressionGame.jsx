import { useMemo, useState } from "react";
import {
  completeSession,
  emptyGameProgress,
  EXPRESSION_CARDS,
  GAME_STORAGE_KEY,
  getGameLevel,
  getPreferredDimension,
  recordAnswer,
  selectSessionCards,
} from "../expressionGame";

const DIMENSION_LABELS = {
  content: "内容结构",
  voice: "声音节奏",
  gesture: "手势表达",
  posture: "身体姿态",
  camera_contact: "目光交流",
};

function readProgress() {
  try {
    return { ...emptyGameProgress(), ...JSON.parse(window.localStorage.getItem(GAME_STORAGE_KEY) || "{}") };
  } catch {
    return emptyGameProgress();
  }
}
export default function ExpressionGame({ history = [], onStartVideo }) {
  const [progress, setProgress] = useState(readProgress);
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const preferredDimension = useMemo(() => getPreferredDimension(history), [history]);
  const level = getGameLevel(progress.xp);
  const mastered = Object.values(progress.skills || {}).filter((skill) => skill.mastery >= 3).length;
  const accuracy = progress.answered ? Math.round((progress.correct / progress.answered) * 100) : 0;

  const saveProgress = (next) => {
    setProgress(next);
    window.localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(next));
  };

  const startSession = (reviewWrong = false) => {
    let cards = selectSessionCards(EXPRESSION_CARDS, progress, preferredDimension, 5);
    if (reviewWrong) {
      const wrongIds = answers.filter((answer) => !answer.correct).map((answer) => answer.card.id);
      const wrongCards = EXPRESSION_CARDS.filter((card) => wrongIds.includes(card.id));
      if (wrongCards.length) cards = wrongCards;
    }
    setSession(cards);
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
  };

  const chooseAnswer = (optionIndex) => {
    if (selected !== null) return;
    const card = session[index];
    const correct = optionIndex === card.correct;
    setSelected(optionIndex);
    setAnswers((current) => [...current, { card, correct }]);
    saveProgress(recordAnswer(progress, card.id, correct));
  };

  const nextCard = () => {
    if (index < session.length - 1) {
      setIndex((value) => value + 1);
      setSelected(null);
      return;
    }
    const completed = completeSession(progress);
    saveProgress(completed);
    setFinished(true);
  };

  if (!session) {
    return (
      <section className="game-layout">
        <header className="game-hero">
          <div>
            <p className="eyebrow">表达闯关 · 每天 3 分钟</p>
            <h1>把“知道技巧”<br />练成“开口会用”</h1>
            <p>用真实表达情境做选择，答完立即知道为什么；错题会自动进入复习，逐步形成表达反射。</p>
          </div>
          <div className="game-level-card">
            <span>LEVEL {level.level}</span>
            <strong>{progress.xp} XP</strong>
            <div><i style={{ width: `${level.ratio}%` }} /></div>
            <small>再获得 {level.target - level.current} XP 升级</small>
          </div>
        </header>

        <div className="game-stats">
          <article><span>🔥</span><strong>{progress.streak} 天</strong><small>连续练习</small></article>
          <article><span>✓</span><strong>{mastered} 项</strong><small>已掌握技巧</small></article>
          <article><span>◎</span><strong>{accuracy || "—"}{accuracy ? "%" : ""}</strong><small>累计正确率</small></article>
        </div>

        <article className="daily-challenge-card">
          <div className="challenge-number">05</div>
          <div>
            <span className="challenge-kicker">今日挑战</span>
            <h2>5 个情境，建立一个更好的表达习惯</h2>
            <p>根据你最近的训练报告，今天会优先练习<strong>{DIMENSION_LABELS[preferredDimension]}</strong>。没有报告也可以直接开始。</p>
            <div className="challenge-tags"><span>情境判断</span><span>即时讲解</span><span>错题复习</span><span>微动作训练</span></div>
          </div>
          <button className="game-primary" type="button" onClick={() => startSession(false)}>开始今日闯关 <b>→</b></button>
        </article>

        <div className="skill-map">
          <div><span>01</span><strong>先判断</strong><small>遇到真实表达情境</small></div>
          <i />
          <div><span>02</span><strong>懂原因</strong><small>不是只记标准答案</small></div>
          <i />
          <div><span>03</span><strong>做一遍</strong><small>20 秒把技巧说出来</small></div>
          <i />
          <div><span>04</span><strong>再复习</strong><small>薄弱技巧优先出现</small></div>
        </div>
      </section>
    );
  }

  if (finished) {
    const correctCount = answers.filter((answer) => answer.correct).length;
    const wrongCount = answers.length - correctCount;
    return (
      <section className="game-layout game-result">
        <article className="game-result-card">
          <div className="result-badge">{correctCount === answers.length ? "🏆" : "✨"}</div>
          <p className="eyebrow">本轮完成</p>
          <h1>{correctCount === answers.length ? "全对，表达反射正在形成" : "今天又比昨天会说一点"}</h1>
          <p>答对 {correctCount}/{answers.length} 题，本轮获得 <strong>{correctCount * 12 + wrongCount * 3 + 20} XP</strong>。真正的提升来自下一次开口时把一个动作做出来。</p>
          <div className="result-metrics">
            <div><strong>{Math.round((correctCount / answers.length) * 100)}%</strong><span>本轮正确率</span></div>
            <div><strong>{progress.streak}</strong><span>连续练习天数</span></div>
            <div><strong>Lv.{getGameLevel(progress.xp).level}</strong><span>当前等级</span></div>
          </div>
          {wrongCount > 0 && (
            <div className="wrong-review-list">
              <span>建议再看一眼</span>
              {answers.filter((answer) => !answer.correct).map((answer) => (
                <div key={answer.card.id}><b>{answer.card.category}</b><strong>{answer.card.memoryHook}</strong></div>
              ))}
            </div>
          )}
          <div className="game-result-actions">
            {wrongCount > 0 && <button className="game-primary" type="button" onClick={() => startSession(true)}>立即复习错题</button>}
            <button className="game-secondary" type="button" onClick={() => setSession(null)}>返回闯关首页</button>
            <button className="game-text-button" type="button" onClick={onStartVideo}>用真实视频检验进步 →</button>
          </div>
        </article>
      </section>
    );
  }

  const card = session[index];
  const isCorrect = selected === card.correct;
  return (
    <section className="game-layout game-session">
      <div className="game-session-top">
        <button type="button" onClick={() => setSession(null)} aria-label="退出本轮">×</button>
        <div><i style={{ width: `${((index + (selected !== null ? 1 : 0)) / session.length) * 100}%` }} /></div>
        <strong>{index + 1}/{session.length}</strong>
      </div>
      <article className="question-card">
        <div className="question-meta"><span>{card.category}</span><small>优先能力 · {DIMENSION_LABELS[card.dimension]}</small></div>
        <h1>{card.title}</h1>
        <p className="question-prompt">{card.prompt}</p>
        <div className="answer-options">
          {card.options.map((option, optionIndex) => {
            let state = "";
            if (selected !== null && optionIndex === card.correct) state = "correct";
            else if (selected === optionIndex) state = "wrong";
            return (
              <button className={state} key={option} type="button" onClick={() => chooseAnswer(optionIndex)} disabled={selected !== null}>
                <span>{String.fromCharCode(65 + optionIndex)}</span><strong>{option}</strong>{state === "correct" && <b>✓</b>}{state === "wrong" && <b>×</b>}
              </button>
            );
          })}
        </div>
        {selected !== null && (
          <div className={isCorrect ? "answer-feedback correct" : "answer-feedback wrong"}>
            <div><span>{isCorrect ? "答对了 +12 XP" : "这题会再次出现 +3 XP"}</span><strong>{card.explanation}</strong></div>
            <blockquote>记忆钩子：{card.memoryHook}</blockquote>
            <div className="micro-drill"><b>20 秒做一遍</b><p>{card.drill}</p></div>
            <button className="game-primary" type="button" onClick={nextCard}>{index === session.length - 1 ? "查看本轮结果" : "下一题"} →</button>
          </div>
        )}
      </article>
    </section>
  );
}
