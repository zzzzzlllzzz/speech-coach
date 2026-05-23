const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const ANALYZE_TIMEOUT_MS = 150000;

export async function analyzeVideo(file, clientVisualMetrics = null) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
  const formData = new FormData();
  formData.append("file", file);
  if (clientVisualMetrics) {
    formData.append("client_visual_metrics", JSON.stringify(clientVisualMetrics));
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("分析等待时间较长，请换用 1 分钟左右的视频，或稍后重新上传。");
    }
    throw new Error("无法连接后端分析服务，请稍后重试。");
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let message = "视频分析失败，请确认后端服务已启动。";
    try {
      const errorData = await response.json();
      message = errorData.detail || message;
    } catch {
      // Keep the default message when the backend does not return JSON.
    }
    throw new Error(message);
  }

  return response.json();
}

export async function analyzeFastVideo({ file, clientVisualMetrics, videoInfo, audioFile = null }) {
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

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/analyze-fast`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("音频转写等待时间较长，请换用 1 到 3 分钟的视频，或稍后重新上传。");
    }
    throw new Error("无法连接后端分析服务，请稍后重试。");
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let message = "快速分析失败，请稍后重试。";
    try {
      const errorData = await response.json();
      message = errorData.detail || message;
    } catch {
      // Keep the default message when the backend does not return JSON.
    }
    throw new Error(message);
  }

  return response.json();
}

export async function analyzeFastVideoJson({ file, clientVisualMetrics, videoInfo }) {
  const response = await fetch(`${API_BASE_URL}/api/analyze-fast-json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: file.name,
      file_size: file.size,
      client_visual_metrics: clientVisualMetrics,
      video_info: videoInfo,
    }),
  });

  if (!response.ok) {
    let message = "快速分析失败，请稍后重试。";
    try {
      const errorData = await response.json();
      message = errorData.detail || message;
    } catch {
      // Keep the default message when the backend does not return JSON.
    }
    throw new Error(message);
  }

  return response.json();
}
