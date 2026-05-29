const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");
const ANALYZE_TIMEOUT_MS = 240000;
const JSON_TIMEOUT_MS = 60000;

function postFormData(path, formData, { timeoutMessage, defaultError, onUploadProgress = null }) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const timeoutId = window.setTimeout(() => {
      request.abort();
      reject(new Error(timeoutMessage));
    }, ANALYZE_TIMEOUT_MS);

    request.open("POST", `${API_BASE_URL}${path}`);
    request.responseType = "json";

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onUploadProgress) {
        onUploadProgress(event.loaded / event.total);
      }
    };

    request.onload = () => {
      window.clearTimeout(timeoutId);
      if (request.status >= 200 && request.status < 300) {
        resolve(request.response);
        return;
      }
      const message = request.response?.detail || defaultError;
      reject(new Error(message));
    };

    request.onerror = () => {
      window.clearTimeout(timeoutId);
      reject(new Error("无法连接后端分析服务，请稍后重试。"));
    };

    request.onabort = () => {
      window.clearTimeout(timeoutId);
    };

    request.send(formData);
  });
}

export async function analyzeVideo(file, clientVisualMetrics = null, onUploadProgress = null) {
  const formData = new FormData();
  formData.append("file", file);
  if (clientVisualMetrics) {
    formData.append("client_visual_metrics", JSON.stringify(clientVisualMetrics));
  }

  return postFormData("/api/analyze", formData, {
    timeoutMessage: "分析等待时间较长，请换用 1 到 3 分钟、声音清晰的视频，或稍后重新上传。",
    defaultError: "视频分析失败，请确认后端服务已启动。",
    onUploadProgress,
  });
}

export async function analyzeFastVideo({ file, clientVisualMetrics, videoInfo, audioFile = null, onUploadProgress = null }) {
  const formData = new FormData();
  formData.append("filename", file.name);
  formData.append("file_size", String(file.size));
  formData.append("video_info", JSON.stringify(videoInfo || {}));
  if (clientVisualMetrics) {
    formData.append("client_visual_metrics", JSON.stringify(clientVisualMetrics));
  }
  if (audioFile) {
    formData.append("audio_file", audioFile);
  }

  return postFormData("/api/analyze-fast", formData, {
    timeoutMessage: "音频转写等待时间较长，请换用 1 到 3 分钟、声音清晰的视频，或稍后重新上传。",
    defaultError: "快速分析失败，请稍后重试。",
    onUploadProgress,
  });
}

export async function optimizeScript(payload) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), JSON_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/optimize-script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || "演讲稿优化失败，请稍后重试。");
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("演讲稿优化等待时间较长，请稍后重试。");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
