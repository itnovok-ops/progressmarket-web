/**
 * Load Balancer — controls cycle frequencies per system mode.
 */

import { getMode, MODES } from "./modeManager.js";
import { detectInstability } from "./safetyEngine.js";

const BASE_INTERVALS = {
  nika: 15000,
  autopilot: 20000,
  audit: 45000,
  competitive: 60000,
  agents: 10000,
  control: 30000
};

const REDUCED_INTERVALS = {
  nika: 30000,
  autopilot: 20000,
  audit: 90000,
  competitive: 120000,
  agents: 15000,
  control: 45000
};

/**
 * @returns {object}
 */
function resolveBaseIntervals() {
  try {
    if (window.__LIFEOS_OBSERVABILITY_MODE__ === "REDUCED") {
      return REDUCED_INTERVALS;
    }
  } catch (_error) {
    /* silent */
  }
  return BASE_INTERVALS;
}

const MODE_MULTIPLIERS = {
  PRODUCTION: { nika: 2, autopilot: 0, audit: 1.5, competitive: 2, agents: 1.2, control: 1 },
  SAFE_OPTIMIZATION: { nika: 1, autopilot: 1, audit: 1, competitive: 1, agents: 1, control: 1 },
  ANALYTICS: { nika: 1.8, autopilot: 0, audit: 1.2, competitive: 1.5, agents: 1, control: 1 },
  OBSERVABILITY: { nika: 2.5, autopilot: 0, audit: 0.8, competitive: 2, agents: 1.5, control: 1 }
};

/**
 * @returns {object}
 */
export function getIntervals() {
  const mode = getMode();
  const mult = MODE_MULTIPLIERS[mode] || MODE_MULTIPLIERS.SAFE_OPTIMIZATION;
  const instability = detectInstability();
  const instabilityMult = instability.unstable ? 2 : 1;

  const intervals = {};
  const baseIntervals = resolveBaseIntervals();
  Object.keys(baseIntervals).forEach(function (key) {
    const base = baseIntervals[key];
    const modeFactor = mult[key] ?? 1;
    if (modeFactor === 0) {
      intervals[key] = 0;
      return;
    }
    intervals[key] = Math.round(base * modeFactor * instabilityMult);
  });

  if (instability.unstable) {
    intervals.autopilot = 0;
    intervals.nika = Math.max(intervals.nika, 30000);
  }

  if (mode === MODES.PRODUCTION) {
    intervals.autopilot = 0;
  }

  return intervals;
}

/**
 * @returns {object}
 */
export function getPerformanceSnapshot() {
  const intervals = getIntervals();
  const mode = getMode();
  const instability = detectInstability();

  return {
    mode: mode,
    intervals_ms: intervals,
    instability_throttled: instability.unstable,
    load_level: instability.unstable ? "reduced" : mode === MODES.OBSERVABILITY ? "introspection" : "normal",
    evaluated_at: Date.now()
  };
}

/**
 * @param {string} system
 * @returns {number}
 */
export function getIntervalFor(system) {
  const baseIntervals = resolveBaseIntervals();
  return getIntervals()[system] || baseIntervals[system] || 30000;
}
