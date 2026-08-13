const dimensions = [
  ["content", "内容"], ["voice", "语音"], ["gesture", "手势"],
  ["posture", "姿态"], ["camera_contact", "镜头"],
];

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function HistoryDashboard({ history, onOpen, onStart }) {
  const scored = history.filter((item) => Number.isFinite(item.overall));
  const latest = scored[0];
  const previous = scored[1];
  const delta = latest && previous ? latest.overall - previous.overall : null;
  const best = scored.length ? Math.max(...scored.map((item) => item.overall)) : null;
  const latestScores = latest?.report?.scores || {};
  const weakest = dimensions
    .filter(([key]) => Number.isFinite(latestScores[key]))
    .sort(([a], [b]) => latestScores[a] - latestScores[b])[0];

  return (
    <section className="insights-layout">
      <header className="section-hero">
        <p className="eyebrow">能力成长</p>
        <h1>让每次练习都留下进步证据</h1>
        <p>报告仅保存在当前浏览器，不会上传历史记录。用同一主题复测，趋势最有参考价值。</p>
      </header>
      {scored.length ? (
        <>
          <div className="insight-stats">
            <article><span>已完成训练</span><strong>{scored.length}</strong><small>最近保留 8 次</small></article>
            <article><span>当前综合分</span><strong>{latest.overall}</strong><small>{delta === null ? "完成第二次后显示变化" : `${delta >= 0 ? "+" : ""}${delta} 分 vs 上次`}</small></article>
            <article><span>历史最佳</span><strong>{best}</strong><small>继续刷新个人纪录</small></article>
            <article><span>优先训练</span><strong className="text-score">{weakest?.[1] || "保持练习"}</strong><small>{weakest ? `当前 ${latestScores[weakest[0]]} 分` : "暂无维度数据"}</small></article>
          </div>
          <article className="trend-panel">
            <div className="panel-title-row"><div><span>综合分趋势</span><h2>最近训练</h2></div><button className="primary-compact" type="button" onClick={onStart}>开始新训练</button></div>
            <div className="trend-chart" aria-label="综合分趋势图">
              {[...scored].reverse().map((item, index) => (
                <button key={item.id} type="button" onClick={() => onOpen(item)} title={`${item.filename}：${item.overall} 分`}>
                  <span style={{ height: `${Math.max(12, item.overall)}%` }}><b>{item.overall}</b></span>
                  <small>第{index + 1}次</small>
                </button>
              ))}
            </div>
          </article>
          <div className="history-cards">
            {history.map((item) => (
              <button key={item.id} type="button" onClick={() => onOpen(item)}>
                <span><strong>{item.filename}</strong><small>{formatDate(item.createdAt)}</small></span>
                <em>{item.overall ?? "—"}</em>
              </button>
            ))}
          </div>
        </>
      ) : (
        <article className="empty-insights">
          <span>01</span><h2>还没有训练记录</h2><p>先体验示例报告，或上传一段 1–3 分钟的真实演讲视频。</p>
          <button className="primary-compact" type="button" onClick={onStart}>开始第一次训练</button>
        </article>
      )}
    </section>
  );
}
