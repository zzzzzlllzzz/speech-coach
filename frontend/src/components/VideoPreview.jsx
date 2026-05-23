import { useEffect, useState } from "react";

export default function VideoPreview({ src }) {
  const [hasPreviewError, setHasPreviewError] = useState(false);

  useEffect(() => {
    setHasPreviewError(false);
  }, [src]);

  if (hasPreviewError) {
    return (
      <div className="video-preview preview-fallback">
        <strong>视频已选择，但当前浏览器无法预览这个编码。</strong>
        <span>这通常出现在部分 MOV 或手机拍摄视频中，不影响点击“开始分析”。</span>
      </div>
    );
  }

  return (
    <div className="video-preview">
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        onError={() => setHasPreviewError(true)}
      />
    </div>
  );
}
