const navItems = [
  ["train", "开始训练"],
  ["history", "能力成长"],
  ["guide", "训练指南"],
];

export default function AppHeader({ activeView, analysisActive, onNavigate }) {
  return (
    <>
      <header className="app-header">
        <button className="brand-button" type="button" onClick={() => onNavigate("train")}>
          <span className="brand-mark">言</span>
          <span>
            <strong>言镜 AI</strong>
            <small>公众表达训练助手</small>
          </span>
        </button>
        <div className={analysisActive ? "system-status busy" : "system-status"}>
          <i aria-hidden="true" />
          {analysisActive ? "分析进行中" : "系统就绪"}
        </div>
      </header>
      <nav className="app-nav" aria-label="功能区">
        {navItems.map(([key, label]) => (
          <button
            className={activeView === key ? "active" : ""}
            key={key}
            type="button"
            onClick={() => onNavigate(key)}
          >
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
