function parseTimeToSeconds(value) {
  if (!value) return 0;
  const parts = String(value).split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function waitForEvent(target, event) {
  return new Promise((resolve, reject) => {
    const onError = () => reject(new Error("视频画面读取失败。"));
    const onEvent = () => {
      target.removeEventListener(event, onEvent);
      target.removeEventListener("error", onError);
      resolve();
    };
    target.addEventListener(event, onEvent, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

async function seekVideo(video, time) {
  video.currentTime = time;
  await waitForEvent(video, "seeked");
}

export async function getVideoInfo(file) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await waitForEvent(video, "loadedmetadata");
    return {
      duration: Number((video.duration || 0).toFixed(2)),
      width: video.videoWidth || 1280,
      height: video.videoHeight || 720,
      fps: 30,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function attachIssueFrames(file, issues = []) {
  if (!issues.length) return issues;

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await waitForEvent(video, "loadedmetadata");
    const duration = video.duration || 0;
    const width = 240;
    const height = Math.max(120, Math.round(width / ((video.videoWidth || 16) / (video.videoHeight || 9))));
    canvas.width = width;
    canvas.height = height;

    const framedIssues = [];
    for (const issue of issues) {
      const rawSeconds = parseTimeToSeconds(issue.time);
      const seconds = duration ? Math.min(Math.max(rawSeconds, 0), Math.max(duration - 0.1, 0)) : rawSeconds;
      try {
        await seekVideo(video, seconds);
        context.drawImage(video, 0, 0, width, height);
        framedIssues.push({
          ...issue,
          frame_image: canvas.toDataURL("image/jpeg", 0.72),
        });
      } catch {
        framedIssues.push(issue);
      }
    }
    return framedIssues;
  } finally {
    URL.revokeObjectURL(url);
  }
}
