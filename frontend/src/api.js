const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");
const ANALYZE_TIMEOUT_MS = 2100000;
const JSON_TIMEOUT_MS = 60000;

export async function getServiceStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/status`, { cache: "no-store" });
    if (!response.ok) throw new Error("分析服务状态检查失败。");
    return response.json();
  } catch (error) {
    if (error.message === "分析服务状态检查失败。") throw error;
    throw new Error("无法连接分析服务，请检查后端是否已启动或稍后重试。");
  }
}

function createAbortError() {
  return new DOMException("分析已取消。", "AbortError");
}

function postFormData(path, formData, { timeoutMessage, defaultError, onUploadProgress = null, signal = null }) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    let settled = false;

    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const finish = (callback) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", handleAbort);
      callback();
    };

    const handleAbort = () => {
      request.abort();
      finish(() => reject(createAbortError()));
    };

    const timeoutId = window.setTimeout(() => {
      request.abort();
      finish(() => reject(new Error(timeoutMessage)));
    }, ANALYZE_TIMEOUT_MS);

    request.open("POST", `${API_BASE_URL}${path}`);
    request.responseType = "json";
    signal?.addEventListener("abort", handleAbort, { once: true });

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onUploadProgress) {
        onUploadProgress(event.loaded / event.total);
      }
    };

    request.onload = () => {
      finish(() => {
        if (request.status >= 200 && request.status < 300) {
          resolve(request.response);
          return;
        }
        const message = request.response?.detail || defaultError;
        reject(new Error(message));
      });
    };

    request.onerror = () => {
      finish(() => reject(new Error("无法连接后端分析服务，请稍后重试。")));
    };

    request.onabort = () => {
      if (signal?.aborted) return;
      finish(() => reject(createAbortError()));
    };

    request.send(formData);
  });
}

export async function analyzeVideo(file, clientVisualMetrics = null, onUploadProgress = null, signal = null) {
  const formData = new FormData();
  formData.append("file", file);
  if (clientVisualMetrics) {
    formData.append("client_visual_metrics", JSON.stringify(clientVisualMetrics));
  }

  return postFormData("/api/analyze", formData, {
    timeoutMessage: "完整视频分析超过 35 分钟仍未完成，请保留原视频并稍后重试。",
    defaultError: "视频分析失败，请确认后端服务已启动。",
    onUploadProgress,
    signal,
  });
}

export async function startVideoAnalysisJob(file, clientVisualMetrics = null, onUploadProgress = null, signal = null) {
  const formData = new FormData();
  formData.append("file", file);
  if (clientVisualMetrics) {
    formData.append("client_visual_metrics", JSON.stringify(clientVisualMetrics));
  }

  return postFormData("/api/analyze-jobs", formData, {
    timeoutMessage: "视频上传超过 35 分钟仍未完成，请检查网络后重试。",
    defaultError: "视频后台分析任务创建失败，请稍后重试。",
    onUploadProgress,
    signal,
  });
}

function waitForDelay(delayMs, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }
    const handleAbort = () => {
      window.clearTimeout(timer);
      reject(createAbortError());
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

export async function waitForVideoAnalysisJob(jobId, onStatus = null, signal = null) {
  const deadline = Date.now() + ANALYZE_TIMEOUT_MS;
  const safeJobId = encodeURIComponent(jobId);

  while (Date.now() < deadline) {
    if (signal?.aborted) throw createAbortError();
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/analyze-jobs/${safeJobId}`, {
        cache: "no-store",
        signal,
      });
    } catch (error) {
      if (error.name === "AbortError") throw error;
      await waitForDelay(3000, signal);
      continue;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.detail || "无法读取后台分析进度，请重新上传视频。");
    }
    onStatus?.(payload);
    if (payload.status === "completed" && payload.result) return payload.result;
    if (payload.status === "failed") {
      throw new Error(payload.error || "视频后台分析失败，请检查视频后重试。");
    }
    await waitForDelay(3000, signal);
  }

  throw new Error("视频后台分析超过 35 分钟仍未完成，请保留原视频并稍后重试。");
}

export async function analyzeFastVideo({ file, clientVisualMetrics, videoInfo, audioFile = null, onUploadProgress = null, signal = null }) {
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
    timeoutMessage: "音频转写超过 35 分钟仍未完成，请保留原视频并稍后重试。",
    defaultError: "快速分析失败，请稍后重试。",
    onUploadProgress,
    signal,
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
