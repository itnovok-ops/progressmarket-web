/**
 * Loop Throttle — prevents recursive loops (ISP v1).
 * Extends control/cycleController with integration-level protection.
 */

import { requestCycle as controlRequestCycle, getCycleSnapshot } from "../control/cycleController.js";

const ISP_WINDOW_MS = 15000;
const ISP_MAX_BURST = 6;
const COOLDOWN_MS = 3000;

/** @type {{ name: string, source: string, at: number }[]} */
const ispHistory = [];

/** @type {Record<string, number>} */
const lastRunAt = {};

const EXTENDED_PING_PONG = [
  ["nika", "audit"],
  ["audit", "nika"],
  ["nika", "autopilot"],
  ["autopilot", "nika"],
  ["agents", "nika"],
  ["nika", "agents"],
  ["growth", "nika"],
  ["nika", "growth"],
  ["observability", "nika"],
  ["nika", "observability"],
  ["audit", "growth"],
  ["growth", "audit"],
  ["agents", "audit"],
  ["audit", "agents"],
  ["revenue", "nika"],
  ["nika", "revenue"],
  ["revenue", "autopilot"],
  ["autopilot", "revenue"]
];

/**
 * @param {string} name
 * @param {string} [source]
 * @returns {{ allowed: boolean, reason?: string, layer?: string }}
 */
export function throttleCycle(name, source) {
  const now = Date.now();
  pruneIspHistory(now);

  const burst = ispHistory.filter(function (h) {
    return now - h.at < ISP_WINDOW_MS;
  });

  if (burst.length >= ISP_MAX_BURST) {
    return { allowed: false, reason: "isp_burst_limit", layer: "integration" };
  }

  const last = lastRunAt[name] || 0;
  if (now - last < COOLDOWN_MS && source !== "manual" && source !== "boot") {
    return { allowed: false, reason: "isp_cooldown:" + name, layer: "integration" };
  }

  if (detectIspLoop(name, source, now)) {
    return { allowed: false, reason: "isp_loop_detected:" + name, layer: "integration" };
  }

  const control = controlRequestCycle(name, source);
  if (!control.allowed) {
    return Object.assign({ layer: "control" }, control);
  }

  ispHistory.push({ name: name, source: source || "unknown", at: now });
  lastRunAt[name] = now;

  return { allowed: true };
}

/**
 * @param {number} now
 */
function pruneIspHistory(now) {
  while (ispHistory.length > 0 && now - ispHistory[0].at > ISP_WINDOW_MS * 3) {
    ispHistory.shift();
  }
}

/**
 * @param {string} name
 * @param {string} source
 * @param {number} now
 * @returns {boolean}
 */
function detectIspLoop(name, source, now) {
  const recent = ispHistory.filter(function (h) { return now - h.at < 5000; });
  if (recent.length < 2) {
    return false;
  }

  const last = recent[recent.length - 1];
  for (let i = 0; i < EXTENDED_PING_PONG.length; i++) {
    const pair = EXTENDED_PING_PONG[i];
    if (last.name === pair[0] && name === pair[1] && source !== "manual") {
      return true;
    }
  }

  const sameChain = recent.filter(function (h) { return h.name === name; });
  return sameChain.length >= 3;
}

/**
 * @returns {object}
 */
export function getLoopProtectionSnapshot() {
  const control = getCycleSnapshot();
  const now = Date.now();

  return {
    integration_window_ms: ISP_WINDOW_MS,
    burst_limit: ISP_MAX_BURST,
    cooldown_ms: COOLDOWN_MS,
    recent_isp_cycles: ispHistory.slice(-12),
    counts_in_window: ispHistory.filter(function (h) { return now - h.at < ISP_WINDOW_MS; }).length,
    control_layer: control,
    active: true
  };
}

/**
 * Reset ISP throttle history.
 */
export function resetLoopThrottle() {
  ispHistory.length = 0;
  Object.keys(lastRunAt).forEach(function (k) {
    delete lastRunAt[k];
  });
}
