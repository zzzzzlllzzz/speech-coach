import assert from "node:assert/strict";
import { getVideoSamplingPlan, shouldStreamFullVideo } from "../src/analysisPlan.js";
import { buildBeginnerDrill, getPrimaryTrainingDimension } from "../src/trainingPlan.js";

const longPlan = getVideoSamplingPlan(355.8, false);
assert.equal(longPlan.duration, 355.8);
assert.equal(longPlan.frameCount, 240);
assert.ok(longPlan.frameInterval > 1.4 && longPlan.frameInterval < 1.5);

const maximumPlan = getVideoSamplingPlan(1800, false);
assert.equal(maximumPlan.duration, 1800);
assert.equal(maximumPlan.frameCount, 240);
assert.equal(maximumPlan.frameInterval, 7.5);

assert.equal(shouldStreamFullVideo(301, 1), true);
assert.equal(shouldStreamFullVideo(120, 181 * 1024 * 1024), true);
assert.equal(shouldStreamFullVideo(120, 20 * 1024 * 1024), false);

const scores = { content: 76, voice: 68, gesture: 72, posture: 81, camera_contact: 61 };
assert.equal(getPrimaryTrainingDimension(scores, "baseline"), "camera_contact");
assert.equal(getPrimaryTrainingDimension(scores, "voice"), "voice");
assert.equal(buildBeginnerDrill(scores, "baseline").steps.length, 3);

console.log("analysisPlan tests passed");
