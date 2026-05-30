import { useState } from "react";

import { optimizeScript } from "../api";
import RadarChart from "./RadarChart";
import ScoreCard from "./ScoreCard";
import TimelineIssues from "./TimelineIssues";

const scoreKeys = ["content", "voice", "gesture", "posture", "camera_contact", "overall"];

const scoreLabels = {
  content: "内容表达",
  voice: "声音语速",
  gesture: "手势表现",
  posture: "身体姿态",
  camera_contact: "镜头交流",
  overall: "综合表现",
};

const dimensionVideoExamples = {
  content: {
    title: "乔布斯 2005 斯坦福大学毕业演讲",
    url: "https://www.bilibili.com/video/BV1wv411j7Ux/",
    intro: "适合学习用三个故事组织内容、用清晰主线承接个人经历与核心观点。",
  },
  voice: {
    title: "马丁·路德·金《我有一个梦想》",
    url: "https://www.bilibili.com/video/BV1pE411g7Q8/",
    intro: "适合观察重音、停顿、排比句节奏和情绪递进如何增强表达感染力。",
  },
  gesture: {
    title: "TED 演讲：肢体语言塑造你自己",
    url: "https://www.bilibili.com/video/BV1ZJ411W7tJ/",
    intro: "适合学习手势、身体开放度和舞台动作如何服务观点表达。",
  },
  posture: {
    title: "TED 演讲：你的肢体语言可能决定你是谁",
    url: "https://www.bilibili.com/video/BV1VW411x7vf/",
    intro: "适合对照站姿、肩颈放松、身体稳定性与表达状态之间的关系。",
  },
  camera_contact: {
    title: "六个超实用的眼神交流技巧",
    url: "https://www.bilibili.com/video/BV1QQ4y1B7UY/",
    intro: "适合练习看镜头、环视和停留时长，减少低头读稿带来的距离感。",
  },
  overall: {
    title: "TED 演讲的奥秘：伟大演讲的核心法则",
    url: "https://www.bilibili.com/video/BV1HC4y1b7bq/",
    intro: "适合综合学习观点选择、结构设计、语言表达和现场呈现的整体配合。",
  },
};

const metricLabels = {
  speech_rate: "语速",
  filler_total: "口头禅总数",
  face_visible_ratio: "人脸可见比例",
  looking_camera_ratio: "近似镜头交流",
  head_down_count: "低头次数",
  body_sway_score: "身体稳定分",
  gesture_activity: "手势活跃度",
  hand_visible_ratio: "手部可见比例",
  face_block_count: "遮脸次数",
  expression_change_score: "表情变化分",
};

const keyMetricKeys = [
  "speech_rate",
  "filler_total",
  "looking_camera_ratio",
  "head_down_count",
  "gesture_activity",
  "body_sway_score",
];

const visualMetricKeys = [
  "face_visible_ratio",
  "hand_visible_ratio",
  "face_block_count",
  "expression_change_score",
];

function getSpeechSourceLabel(transcript) {
  if (transcript?.mock_mode) return "未检测到文本";
  const polished = transcript.polish_source === "deepseek" ? " + AI 上下文校正" : "";
  if (transcript.source === "aliyun_nls") return `阿里云 ASR 真实识别${polished}`;
  if (transcript.source === "vosk_zh") return "Vosk 中文离线识别";
  if (transcript.source === "vosk_en") return "Vosk 英文离线识别";
  if (transcript.source === "sample_demo") return "示例视频语音转写";
  return "真实语音识别";
}

function formatMetric(key, value, transcript) {
  if (value === null || value === undefined) {
    return "未检测";
  }
  if (key.includes("ratio") || key === "gesture_activity") {
    return `${Math.round(value * 100)}%`;
  }
  if (key === "speech_rate") {
    return transcript?.speech_rate_reliable === false
      ? `${value} 字/分钟（演示估算）`
      : `${value} 字/分钟`;
  }
  return value;
}

function yesNo(value) {
  return value ? "有" : "未检测到";
}

function getScoreLevel(score) {
  if (score >= 85) return "表现较稳，可以继续打磨细节。";
  if (score >= 70) return "已经具备基础表现，但还有清晰可练的提升点。";
  if (score >= 55) return "该维度需要重点训练，先解决最明显的问题。";
  return "该维度目前是主要短板，建议用小目标分步练习。";
}

function uniqueItems(items) {
  return [...new Set(items.filter(Boolean))];
}

function buildDimensionDetail(key, context) {
  const { transcript, visualMetrics, scores, fillerTotal, suggestions, reportSummary } = context;
  const score = Number.isFinite(scores[key]) ? scores[key] : 0;
  const wordCount = transcript.word_count ?? 0;
  const speechRate = transcript.speech_rate ?? 0;
  const duration = transcript.duration ?? 0;
  const logicCount = transcript.logic_words_count ?? 0;
  const gestureActivity = visualMetrics.gesture_activity ?? 0;
  const handVisibleRatio = visualMetrics.hand_visible_ratio ?? 0;
  const faceBlockCount = visualMetrics.face_block_count ?? 0;
  const bodySwayScore = visualMetrics.body_sway_score ?? 0;
  const headDownCount = visualMetrics.head_down_count ?? 0;
  const faceVisibleRatio = visualMetrics.face_visible_ratio ?? 0;
  const lookingCameraRatio = visualMetrics.looking_camera_ratio ?? 0;
  const lowScoreItems = scoreKeys
    .filter((itemKey) => itemKey !== "overall" && Number.isFinite(scores[itemKey]) && scores[itemKey] < 70)
    .map((itemKey) => `${scoreLabels[itemKey]} ${scores[itemKey]} 分`);

  const detailMap = {
    content: {
      label: scoreLabels.content,
      overview: getScoreLevel(score),
      evidence: [
        `转写字数：${wordCount} 字`,
        `逻辑连接词：${logicCount} 个`,
        `开头：${yesNo(transcript.has_opening)}，结尾：${yesNo(transcript.has_ending)}，主题句：${yesNo(transcript.has_topic)}`,
        `口头禅总数：${fillerTotal} 次`,
      ],
      problems: uniqueItems([
        wordCount < 80 && "内容量偏少，报告中可用于判断结构的信息不足。",
        !transcript.has_opening && "没有检测到明确开场，观众可能较难快速进入主题。",
        !transcript.has_topic && "主题句不够明显，核心观点需要更早出现。",
        !transcript.has_ending && "结尾标志不够明确，收束感可以加强。",
        logicCount < 3 && "逻辑连接词偏少，观点之间的顺序关系不够清晰。",
        fillerTotal > 10 && "口头禅较多，可能削弱表达的简洁度。",
      ]),
      advice: uniqueItems([
        "开头用一句话交代主题，例如“今天我想分享的是……”。",
        "主体部分按“首先、其次、最后”组织，每个观点后补一句例子或解释。",
        "结尾用一句总结加一句感谢，例如“以上就是我的分享，谢谢大家”。",
        fillerTotal > 5 && "把“然后、就是、嗯”等填充词换成短暂停顿。",
      ]),
    },
    voice: {
      label: scoreLabels.voice,
      overview: getScoreLevel(score),
      evidence: [
        `语速：${speechRate} 字/分钟`,
        `有效时长：${duration} 秒`,
        `口头禅总数：${fillerTotal} 次`,
        transcript.speech_rate_reliable === false ? "语速当前带有估算成分。" : "语速来自转写文本和视频时长计算。",
      ],
      problems: uniqueItems([
        transcript.mock_mode && "本次没有检测到有效语音文本，声音维度只能做有限判断。",
        speechRate > 200 && "语速偏快，重点信息可能来不及被听清。",
        speechRate > 0 && speechRate < 120 && "语速偏慢，表达节奏可以更紧凑。",
        fillerTotal > 10 && "口头禅偏多，容易让句子显得拖沓。",
        duration < 20 && "视频时长较短，语音表现样本不足。",
      ]),
      advice: uniqueItems([
        speechRate > 200 && "每讲完一个重点观点后停顿 1 秒，再进入下一句。",
        speechRate < 120 && "提前标出关键词，练习用更稳定的节奏读完一句完整观点。",
        fillerTotal > 5 && "用吸气和停顿代替口头禅，先从减少“然后”开始。",
        "练习时录一段 30 秒音频，回听是否每句话都有清楚的落点。",
      ]),
    },
    gesture: {
      label: scoreLabels.gesture,
      overview: getScoreLevel(score),
      evidence: [
        `手势活跃度：${Math.round(gestureActivity * 100)}%`,
        `手部可见比例：${Math.round(handVisibleRatio * 100)}%`,
        `遮脸次数：${faceBlockCount} 次`,
      ],
      problems: uniqueItems([
        gestureActivity < 0.2 && "手势活动偏少，重点观点缺少动作配合。",
        gestureActivity > 0.55 && "手势活动偏频繁，可能出现无意义摆动。",
        handVisibleRatio < 0.25 && "手部出现在画面中的比例偏低，手势信息不明显。",
        faceBlockCount > 3 && "检测到多次手部靠近面部，可能影响面部可见性。",
      ]),
      advice: uniqueItems([
        "列举观点时使用开放式手势，例如掌心自然向外或向上。",
        gestureActivity < 0.2 && "每个段落只设计 1 到 2 个重点手势，先保证自然。",
        gestureActivity > 0.55 && "把手放回身体两侧或腹前，减少连续小幅摆动。",
        faceBlockCount > 0 && "避免摸脸、托腮或遮挡口鼻，让面部保持可见。",
      ]),
    },
    posture: {
      label: scoreLabels.posture,
      overview: getScoreLevel(score),
      evidence: [
        `身体稳定分：${bodySwayScore}`,
        `低头次数：${headDownCount} 次`,
        `人脸可见比例：${Math.round(faceVisibleRatio * 100)}%`,
      ],
      problems: uniqueItems([
        bodySwayScore < 70 && "身体横向移动较明显，重心稳定性需要加强。",
        headDownCount > 5 && "低头次数较多，可能影响表达稳定感。",
        faceVisibleRatio < 0.5 && "人脸可见比例偏低，画面中的主体信息不足。",
      ]),
      advice: uniqueItems([
        "双脚与肩同宽站稳，开始前先固定站姿再开口。",
        headDownCount > 3 && "把提纲放到接近镜头高度的位置，减少长时间看稿。",
        bodySwayScore < 70 && "练习时给脚下设定固定站位，只允许上半身自然配合表达。",
        "录制前确认人脸和上半身位于画面中央。",
      ]),
    },
    camera_contact: {
      label: scoreLabels.camera_contact,
      overview: getScoreLevel(score),
      evidence: [
        `近似镜头交流比例：${Math.round(lookingCameraRatio * 100)}%`,
        `低头次数：${headDownCount} 次`,
        `人脸可见比例：${Math.round(faceVisibleRatio * 100)}%`,
      ],
      problems: uniqueItems([
        lookingCameraRatio < 0.35 && "镜头交流比例明显偏低，面向镜头的时间不足。",
        lookingCameraRatio >= 0.35 && lookingCameraRatio < 0.6 && "镜头交流比例偏低，需要减少长时间偏离镜头。",
        headDownCount > 5 && "低头看稿较多，会降低与观众的连接感。",
        faceVisibleRatio < 0.5 && "人脸可见比例偏低，镜头交流判断会受影响。",
      ]),
      advice: uniqueItems([
        "每讲完一个观点后看向镜头 1 秒，再继续下一句。",
        "把稿子改成关键词提纲，避免逐字低头读稿。",
        "练习“三点法”：开头看镜头，观点转换看镜头，结尾看镜头。",
      ]),
    },
    overall: {
      label: scoreLabels.overall,
      overview: reportSummary || getScoreLevel(score),
      evidence: [
        `内容表达：${scores.content ?? 0} 分`,
        `声音语速：${scores.voice ?? 0} 分`,
        `手势表现：${scores.gesture ?? 0} 分`,
        `身体姿态：${scores.posture ?? 0} 分`,
        `镜头交流：${scores.camera_contact ?? 0} 分`,
      ],
      problems: uniqueItems([
        lowScoreItems.length > 0 && `当前主要短板：${lowScoreItems.join("、")}。`,
        transcript.mock_mode && "语音文本未充分识别时，综合分会受到文本维度影响。",
        suggestions.length > 0 && "报告中已生成多条可执行建议，建议优先处理低分维度。",
      ]),
      advice: uniqueItems([
        "下一次训练先只选 1 到 2 个维度改进，避免一次修改过多。",
        lowScoreItems.length > 0 && `优先训练：${lowScoreItems[0]}。`,
        "建议录制同一主题的第二版视频，对比综合分和问题时间点变化。",
      ]),
    },
  };

  const detail = detailMap[key] || detailMap.overall;
  return {
    ...detail,
    videoExample: dimensionVideoExamples[key] || dimensionVideoExamples.overall,
    score,
    problems:
      detail.problems.length > 0
        ? detail.problems
        : ["该维度没有检测到特别突出的单项问题，可以继续保持，并做细节优化。"],
    advice:
      detail.advice.length > 0
        ? detail.advice
        : ["保持当前表达方式，同时尝试让每个观点都有更清晰的停顿和收束。"],
  };
}

export default function ReportDashboard({ report, onReset, analysisActive = false }) {
  const [scriptOptimization, setScriptOptimization] = useState(null);
  const [isOptimizingScript, setIsOptimizingScript] = useState(false);
  const [scriptOptimizationError, setScriptOptimizationError] = useState("");
  const [selectedScoreKey, setSelectedScoreKey] = useState(null);
  const transcript = report.transcript || {};
  const visualMetrics = report.visual_metrics || {};
  const scores = report.scores || {};
  const issues = report.issues || [];
  const suggestions = report.suggestions || [];
  const fillerEntries = Object.entries(transcript.filler_words || {});
  const fillerTotal = fillerEntries.reduce((total, [, count]) => total + count, 0);
  const hasDemoMode = transcript.mock_mode || visualMetrics.mock_mode;
  const analysisStatus = report.analysis_status || {};
  const keyMetrics = {
    speech_rate: transcript.speech_rate,
    filler_total: fillerTotal,
    looking_camera_ratio: visualMetrics.looking_camera_ratio,
    head_down_count: visualMetrics.head_down_count,
    gesture_activity: visualMetrics.gesture_activity,
    body_sway_score: visualMetrics.body_sway_score,
  };
  const structureAnalysis = transcript.structure_analysis || {};
  const analysisFlags = [
    ["开头", transcript.has_opening, structureAnalysis.opening?.reason],
    ["结尾", transcript.has_ending, structureAnalysis.ending?.reason],
    ["主题句", transcript.has_topic, structureAnalysis.topic?.reason],
  ];
  const visualMode = analysisStatus.visual?.mode || (visualMetrics.mock_mode ? "mock" : "real");
  const visualSourceLabel =
    visualMode === "browser_mediapipe"
      ? "浏览器 MediaPipe 真实分析"
      : visualMode === "sample_demo"
      ? "示例视频视觉分析"
      : visualMode === "opencv"
      ? "OpenCV 真实近似分析"
      : visualMetrics.mock_mode
        ? "Fallback 指标"
        : "MediaPipe 真实分析";
  const canOptimizeScript = Boolean(!transcript.mock_mode && transcript.text?.trim());
  const selectedScoreDetail = selectedScoreKey
    ? buildDimensionDetail(selectedScoreKey, {
        transcript,
        visualMetrics,
        scores,
        fillerTotal,
        suggestions,
        reportSummary: report.summary,
      })
    : null;

  async function handleOptimizeScript() {
    if (!canOptimizeScript || isOptimizingScript) return;

    setIsOptimizingScript(true);
    setScriptOptimizationError("");
    try {
      const result = await optimizeScript({
        text: transcript.text,
        summary: report.summary || "",
        suggestions,
        structure_analysis: structureAnalysis,
      });
      setScriptOptimization(result);
    } catch (error) {
      setScriptOptimizationError(error.message || "演讲稿优化失败，请稍后重试。");
    } finally {
      setIsOptimizingScript(false);
    }
  }

  return (
    <section className="report-layout">
      <header className="report-header">
        <div>
          <p className="eyebrow">训练报告</p>
          <h1>Speech Coach 分析结果</h1>
          <p>{report.summary}</p>
        </div>
        <div className="report-actions">
          <button className="secondary-button" onClick={() => window.print()}>
            导出演示报告
          </button>
          <button className="secondary-button" onClick={onReset} disabled={analysisActive}>
            {analysisActive ? "分析进行中" : "重新上传并分析"}
          </button>
        </div>
      </header>

      {hasDemoMode && (
        <div className="demo-notice">
          部分模块启用了 fallback：页面会继续给出可解释建议，但带有“演示估算”的指标不作为真实能力判断。
        </div>
      )}

      <div className="source-grid">
        {analysisStatus.upload && (
          <article className="source-card">
            <span>上传处理</span>
            <strong>大视频快速分析</strong>
            <p>{analysisStatus.upload.message}</p>
          </article>
        )}
        <article className={transcript.mock_mode ? "source-card mock" : "source-card"}>
          <span>语音识别来源</span>
          <strong>{getSpeechSourceLabel(transcript)}</strong>
          <p>{analysisStatus.speech?.message || transcript.mock_reason}</p>
        </article>
        <article className={visualMetrics.mock_mode ? "source-card mock" : "source-card"}>
          <span>视觉分析来源</span>
          <strong>{visualSourceLabel}</strong>
          <p>{analysisStatus.visual?.message}</p>
        </article>
      </div>

      <div className="overall-card">
        <span>综合分</span>
        <strong>{scores.overall ?? "未评分"}</strong>
        <p>{report.summary}</p>
      </div>

      <div className="score-grid">
        {scoreKeys.map((key) => (
          <ScoreCard key={key} name={key} value={scores[key]} onClick={() => setSelectedScoreKey(key)} />
        ))}
      </div>

      <div className="dashboard-grid">
        <article className="panel chart-panel">
          <h2>六维能力雷达图</h2>
          <RadarChart scores={scores} />
        </article>

        <article className="panel">
          <h2>关键指标</h2>
          <div className="metric-grid">
            {keyMetricKeys.map((key) => (
              <div className="metric-item" key={key}>
                <span>{metricLabels[key]}</span>
                <strong>{formatMetric(key, keyMetrics[key], transcript)}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="panel">
        <div className="panel-title-row">
          <h2>视觉关键指标</h2>
          <span className={visualMetrics.mock_mode ? "status-pill mock" : "status-pill"}>
            {visualMetrics.mock_mode ? "Mock 模式" : "视觉分析"}
          </span>
        </div>
        <div className="metric-grid">
          {visualMetricKeys.map((key) => (
            <div className="metric-item" key={key}>
              <span>{metricLabels[key]}</span>
              <strong>{formatMetric(key, visualMetrics[key], transcript)}</strong>
            </div>
          ))}
        </div>
      </article>

      <div className="dashboard-grid">
        <article className="panel">
          <h2>问题时间点</h2>
          <TimelineIssues issues={issues} />
        </article>

        <article className="panel">
          <h2>个性化建议</h2>
          <ul className="suggestion-list">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </article>
      </div>

      <article className="panel transcript-panel">
        <div className="panel-title-row">
          <h2>演讲文字转写</h2>
          <div className="panel-actions">
            <button
              className="inline-action-button"
              type="button"
              onClick={handleOptimizeScript}
              disabled={!canOptimizeScript || isOptimizingScript}
            >
              {isOptimizingScript ? "优化中..." : "优化演讲稿"}
            </button>
            <span className={transcript.mock_mode ? "status-pill mock" : "status-pill"}>
              {transcript.mock_mode ? "Mock 模式" : "真实识别"}
            </span>
          </div>
        </div>
        <div className="transcript-meta">
          <span>字数：{transcript.word_count ?? 0}</span>
          <span>语速：{transcript.speech_rate ?? 0} 字/分钟</span>
          <span>时长：{transcript.duration ?? 0} 秒</span>
          <span>逻辑连接词：{transcript.logic_words_count ?? 0}</span>
        </div>

        <div className="text-analysis-grid">
          <div>
            <h3>口头禅统计</h3>
            {fillerEntries.length > 0 ? (
              <div className="filler-list">
                {fillerEntries.map(([word, count]) => (
                  <span key={word}>
                    {word}：{count}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted-text">未检测到明显口头禅。</p>
            )}
          </div>

          <div>
            <h3>结构提示</h3>
            <div className="flag-list">
              {analysisFlags.map(([label, enabled, reason]) => (
                <span className={enabled ? "flag enabled" : "flag"} key={label} title={reason || ""}>
                  {label}：{enabled ? "有" : "未检测到"}
                </span>
              ))}
            </div>
            {analysisFlags.some(([, , reason]) => reason) && (
              <ul className="structure-reasons">
                {analysisFlags.map(([label, , reason]) =>
                  reason ? <li key={label}>{label}：{reason}</li> : null
                )}
              </ul>
            )}
          </div>
        </div>

        <p>{transcript.mock_mode ? "未检测到文本" : transcript.text}</p>
        {scriptOptimizationError && <p className="error-text">{scriptOptimizationError}</p>}
        {scriptOptimization && (
          <div className="optimized-script-card">
            <div className="optimized-script-header">
              <div>
                <span>DeepSeek 优化结果</span>
                <h3>优化后的演讲稿</h3>
              </div>
              <small>{scriptOptimization.model}</small>
            </div>
            <p>{scriptOptimization.optimized_text}</p>
            <div className="optimized-script-grid">
              {scriptOptimization.outline?.length > 0 && (
                <div>
                  <h4>结构建议</h4>
                  <ul>
                    {scriptOptimization.outline.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {scriptOptimization.delivery_tips?.length > 0 && (
                <div>
                  <h4>表达建议</h4>
                  <ul>
                    {scriptOptimization.delivery_tips.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {scriptOptimization.revision_notes?.length > 0 && (
              <div className="revision-notes">
                <h4>优化说明</h4>
                <ul>
                  {scriptOptimization.revision_notes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </article>

      {selectedScoreDetail && (
        <div
          className="score-detail-backdrop"
          role="presentation"
          onClick={() => setSelectedScoreKey(null)}
        >
          <article
            className="score-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="score-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="score-detail-close"
              type="button"
              onClick={() => setSelectedScoreKey(null)}
              aria-label="关闭维度诊断"
            >
              ×
            </button>
            <div className="score-detail-header">
              <span>维度诊断</span>
              <h2 id="score-detail-title">{selectedScoreDetail.label}</h2>
              <strong>{selectedScoreDetail.score}</strong>
              <p>{selectedScoreDetail.overview}</p>
            </div>
            <div className="score-detail-grid">
              <section>
                <h3>主要依据</h3>
                <ul>
                  {selectedScoreDetail.evidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>发现的问题</h3>
                <ul>
                  {selectedScoreDetail.problems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <section className="score-detail-wide">
                <h3>针对性改进建议</h3>
                <ol>
                  {selectedScoreDetail.advice.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </section>
              {selectedScoreDetail.videoExample && (
                <section className="score-detail-wide reference-video-card">
                  <div>
                    <h3>优秀案例参考</h3>
                    <strong>{selectedScoreDetail.videoExample.title}</strong>
                    <p>{selectedScoreDetail.videoExample.intro}</p>
                  </div>
                  <a
                    href={selectedScoreDetail.videoExample.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    打开视频
                  </a>
                </section>
              )}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
