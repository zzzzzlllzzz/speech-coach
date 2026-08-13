import assert from "node:assert/strict";
import { getVideoSamplingPlan, shouldStreamFullVideo } from "../src/analysisPlan.js";

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

console.log("analysisPlan tests passed");
