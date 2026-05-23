const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function analyzeVideo(file, clientVisualMetrics = null) {
  const formData = new FormData();
  formData.append("file", file);
  if (clientVisualMetrics) {
    formData.append("client_visual_metrics", JSON.stringify(clientVisualMetrics));
  }

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    body: formData,
  });

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
