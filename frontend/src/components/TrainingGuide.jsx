const guides = [
  ["录制准备", "保证人脸和上半身完整入镜，镜头与眼睛接近同高，环境安静且正面光充足。"],
  ["内容结构", "用“开场主题—三个观点—总结收束”搭骨架，每个观点只表达一个核心意思。"],
  ["声音节奏", "重点句前后停顿半秒到一秒，用停顿代替“嗯、啊、然后”等填充词。"],
  ["视觉表达", "双脚与肩同宽，手势服务关键词；每个观点结束时重新看向镜头。"],
];

export default function TrainingGuide({ onStart, onShowOnboarding }) {
  return (
    <section className="guide-layout">
      <header className="section-hero">
        <p className="eyebrow">训练指南</p><h1>录得更准，也练得更有效</h1>
        <p>这些准备会直接影响语音识别与视觉关键点质量。正式比赛展示前，建议先做一次完整演练。</p>
      </header>
      <div className="guide-grid">
        {guides.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{text}</p></article>)}
      </div>
      <article className="practice-protocol">
        <div><p className="eyebrow">推荐训练法</p><h2>三遍训练闭环</h2></div>
        <ol><li><strong>第一遍：</strong>自然讲完，建立基线。</li><li><strong>第二遍：</strong>只改善最低的两个维度。</li><li><strong>第三遍：</strong>按正式比赛状态完整复测。</li></ol>
        <div className="guide-actions"><button className="secondary-button" type="button" onClick={onShowOnboarding}>重看新手指南</button><button className="primary-compact" type="button" onClick={onStart}>开始训练</button></div>
      </article>
    </section>
  );
}
