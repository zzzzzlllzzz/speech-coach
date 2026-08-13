export const MAX_VIDEO_DURATION_SECONDS = 30 * 60;
export const LONG_VIDEO_THRESHOLD_SECONDS = 5 * 60;
export const LONG_VIDEO_SIZE_BYTES = 180 * 1024 * 1024;

export function getVideoSamplingPlan(durationSeconds, lightMode = false) {
  const duration = Math.max(0, Math.min(Number(durationSeconds) || 0, MAX_VIDEO_DURATION_SECONDS));
  const targetFrames = lightMode ? 120 : 240;
  const minimumInterval = lightMode ? 2 : 1;
  const frameInterval = Math.max(minimumInterval, duration / targetFrames);
  return {
    duration,
    frameInterval,
    frameCount: Math.max(1, Math.ceil(duration / frameInterval)),
  };
}

export function shouldStreamFullVideo(durationSeconds, fileSize) {
  return Number(durationSeconds || 0) > LONG_VIDEO_THRESHOLD_SECONDS || Number(fileSize || 0) > LONG_VIDEO_SIZE_BYTES;
}
