import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";

const WASM_URL = "/mediapipe/wasm";
const POSE_MODEL_URL = "/mediapipe/models/pose_landmarker_lite.task";
const HAND_MODEL_URL = "/mediapipe/models/hand_landmarker.task";
const FACE_MODEL_URL = "/mediapipe/models/face_landmarker.task";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function createAbortError() {
  return new DOMException("分析已取消。", "AbortError");
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function waitForEvent(target, event, signal = null) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const onError = () => reject(new Error("视频读取失败。"));
    const onAbort = () => {
      cleanup();
      reject(createAbortError());
    };
    const cleanup = () => {
      target.removeEventListener(event, onEvent);
      target.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    target.addEventListener(event, onEvent, { once: true });
    target.addEventListener("error", onError, { once: true });
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function createVideo(file, signal = null) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  await waitForEvent(video, "loadedmetadata", signal);
  return { video, url };
}

async function seekVideo(video, time, signal = null) {
  if (Math.abs(video.currentTime - time) < 0.03) return;
  video.currentTime = time;
  await waitForEvent(video, "seeked", signal);
}

function faceBox(faceLandmarks) {
  const xs = faceLandmarks.map((point) => point.x);
  const ys = faceLandmarks.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function isPointNearFace(point, box) {
  const padX = (box.maxX - box.minX) * 0.2;
  const padY = (box.maxY - box.minY) * 0.2;
  return (
    point.x >= box.minX - padX &&
    point.x <= box.maxX + padX &&
    point.y >= box.minY - padY &&
    point.y <= box.maxY + padY
  );
}

function expressionFeature(faceLandmarks, box) {
  const faceW = Math.max(box.maxX - box.minX, 0.001);
  const faceH = Math.max(box.maxY - box.minY, 0.001);
  return [
    Math.abs(faceLandmarks[13].y - faceLandmarks[14].y) / faceH,
    Math.abs(faceLandmarks[61].x - faceLandmarks[291].x) / faceW,
    Math.abs(faceLandmarks[159].y - faceLandmarks[65].y) / faceH,
  ];
}

export async function analyzeVideoWithMediaPipe(file, onProgress = () => {}, options = {}) {
  const signal = options.signal || null;
  throwIfAborted(signal);
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  throwIfAborted(signal);
  const [poseLandmarker, handLandmarker, faceLandmarker] = await Promise.all([
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "CPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    }),
    HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: "CPU" },
      runningMode: "VIDEO",
      numHands: 2,
    }),
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "CPU" },
      runningMode: "VIDEO",
      numFaces: 1,
    }),
  ]);

  throwIfAborted(signal);
  const { video, url } = await createVideo(file, signal);
  const duration = Math.min(video.duration || 0, 180);
  const frameInterval = options.lightMode ? 2.5 : options.fastMode || duration > 90 ? 2 : 1;
  const frameCount = Math.max(1, Math.ceil(duration / frameInterval));

  let faceVisible = 0;
  let lookingCamera = 0;
  let handVisible = 0;
  let headDownCount = 0;
  let faceBlockCount = 0;
  let wasHeadDown = false;
  let wasFaceBlocked = false;
  const headDownEvents = [];
  const faceBlockEvents = [];
  const bodyCenters = [];
  const handCenters = [];
  const gestureMovements = [];
  const expressionFeatures = [];

  try {
    for (let index = 0; index < frameCount; index += 1) {
      throwIfAborted(signal);
      const time = Math.min(index * frameInterval, Math.max(duration - 0.05, 0));
      await seekVideo(video, time, signal);
      throwIfAborted(signal);
      const timestampMs = Math.round(time * 1000);
      const poseResult = poseLandmarker.detectForVideo(video, timestampMs);
      const handResult = handLandmarker.detectForVideo(video, timestampMs);
      const faceResult = faceLandmarker.detectForVideo(video, timestampMs);

      let box = null;
      let headDown = false;
      if (faceResult.faceLandmarks?.length) {
        faceVisible += 1;
        const landmarks = faceResult.faceLandmarks[0];
        box = faceBox(landmarks);
        const centerX = (box.minX + box.maxX) / 2;
        const centerY = (box.minY + box.maxY) / 2;
        const faceH = Math.max(box.maxY - box.minY, 0.001);
        const eyeY = (landmarks[33].y + landmarks[263].y) / 2;
        const noseY = landmarks[1].y;
        headDown = centerY > 0.58 || noseY > eyeY + faceH * 0.38;
        expressionFeatures.push(expressionFeature(landmarks, box));
        if (centerX >= 0.35 && centerX <= 0.65 && centerY >= 0.18 && centerY <= 0.72 && !headDown) {
          lookingCamera += 1;
        }
      }

      const poseLandmarks = poseResult.landmarks?.[0] || [];
      if (poseLandmarks.length) {
        const leftShoulder = poseLandmarks[11];
        const rightShoulder = poseLandmarks[12];
        const nose = poseLandmarks[0];
        if (leftShoulder && rightShoulder) {
          const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
          const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
          bodyCenters.push(shoulderCenterX);
          headDown = headDown || (nose && nose.y > shoulderCenterY - 0.16);
        }
      }

      const handPoints = (handResult.landmarks || []).flat();
      const poseHands = [poseLandmarks[15], poseLandmarks[16]].filter(Boolean);
      const allHandPoints = handPoints.length ? handPoints : poseHands;
      if (allHandPoints.length) {
        handVisible += 1;
        const handCenter = {
          x: allHandPoints.reduce((sum, point) => sum + point.x, 0) / allHandPoints.length,
          y: allHandPoints.reduce((sum, point) => sum + point.y, 0) / allHandPoints.length,
        };
        if (handCenters.length) {
          gestureMovements.push(distance(handCenters[handCenters.length - 1], handCenter));
        }
        handCenters.push(handCenter);
      }

      const faceBlocked = Boolean(box && allHandPoints.some((point) => isPointNearFace(point, box)));
      if (faceBlocked && !wasFaceBlocked) {
        faceBlockCount += 1;
        faceBlockEvents.push(formatTime(time));
      }
      wasFaceBlocked = faceBlocked;

      if (headDown && !wasHeadDown) {
        headDownCount += 1;
        headDownEvents.push(formatTime(time));
      }
      wasHeadDown = headDown;
      onProgress(Math.round(((index + 1) / frameCount) * 100));
    }
  } finally {
    URL.revokeObjectURL(url);
    poseLandmarker.close();
    handLandmarker.close();
    faceLandmarker.close();
  }

  const swayRange = bodyCenters.length ? Math.max(...bodyCenters) - Math.min(...bodyCenters) : 0;
  const expressionDeltas = expressionFeatures.slice(1).map((feature, index) => {
    const previous = expressionFeatures[index];
    return feature.reduce((sum, value, featureIndex) => sum + Math.abs(value - previous[featureIndex]), 0) / 3;
  });

  return {
    face_visible_ratio: Number((faceVisible / frameCount).toFixed(2)),
    looking_camera_ratio: Number((lookingCamera / frameCount).toFixed(2)),
    head_down_count: headDownCount,
    body_sway_score: Math.round(clamp(100 - swayRange * 260, 0, 100)),
    gesture_activity: Number(clamp((gestureMovements.reduce((sum, value) => sum + value, 0) / Math.max(gestureMovements.length, 1)) * 8, 0, 1).toFixed(2)),
    hand_visible_ratio: Number((handVisible / frameCount).toFixed(2)),
    face_block_count: faceBlockCount,
    expression_change_score: Math.round(clamp((expressionDeltas.reduce((sum, value) => sum + value, 0) / Math.max(expressionDeltas.length, 1)) * 450, 0, 100)),
    analysis_frame_count: frameCount,
    sample_interval_seconds: frameInterval,
    head_down_events: headDownEvents.slice(0, 5),
    face_block_events: faceBlockEvents.slice(0, 5),
    mock_mode: false,
    fallback_mode: "browser_mediapipe",
    analysis_note: `浏览器端 MediaPipe Tasks Vision 已分析 ${frameCount} 帧上传视频。`,
    metric_sources: {
      face_visible_ratio: "browser_mediapipe_face_landmarker",
      looking_camera_ratio: "browser_mediapipe_face_center",
      head_down_count: "browser_mediapipe_face_pose",
      body_sway_score: "browser_mediapipe_pose_shoulders",
      gesture_activity: "browser_mediapipe_hand_motion",
      hand_visible_ratio: "browser_mediapipe_hand_landmarker",
      face_block_count: "browser_mediapipe_hand_face_distance",
      expression_change_score: "browser_mediapipe_face_landmark_change",
    },
  };
}
