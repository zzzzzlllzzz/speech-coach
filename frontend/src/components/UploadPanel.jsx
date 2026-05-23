import VideoPreview from "./VideoPreview";

export default function UploadPanel({ error, file, onAnalyze, onFileSelect, previewUrl }) {
  const handleChange = (event) => {
    const nextFile = event.target.files?.[0];
    if (nextFile) {
      onFileSelect(nextFile);
    }
  };

  return (
    <section className="hero-layout">
      <div className="hero-copy">
        <p className="eyebrow">AI Speech Coach</p>
        <h1>言镜 AI</h1>
        <p className="subtitle">多模态公众表达训练助手</p>
        <p className="tagline">不只听你说了什么，也看你怎么说</p>
        <p className="intro">
          上传一段演讲视频，系统将生成语言表达、动作手势和镜头交流的可视化训练报告。
        </p>
        <div className="hero-highlights">
          <span>语音转写</span>
          <span>动作分析</span>
          <span>可解释评分</span>
        </div>
      </div>

      <div className="upload-card">
        <div className="upload-card-header">
          <span>比赛演示入口</span>
          <strong>上传演讲视频</strong>
        </div>
        <label className="upload-zone">
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.mov,.avi,.mkv"
            onChange={handleChange}
          />
          <span className="upload-icon">+</span>
          <strong>{file ? file.name : "上传视频文件"}</strong>
          <small>支持格式：mp4、mov、avi、mkv · 1GB 以内 · 大视频会自动启用快速分析</small>
        </label>

        {previewUrl && <VideoPreview src={previewUrl} />}

        {error && <p className="error-text">{error}</p>}

        <button className="primary-button" onClick={onAnalyze} disabled={!file}>
          开始分析
        </button>
      </div>
    </section>
  );
}
