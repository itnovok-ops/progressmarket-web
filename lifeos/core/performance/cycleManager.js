/**
 * Cycle Manager — centralized control for all LifeOS runtime loops.
 */

import { safeExecute, safeExecuteAsync } from "../safety/safeExecute.js";

const CYCLE_CONFIG = {
  renderCycle: { intervalMs: 50 },
  nikaCycle: { intervalMs: 500 },
  diagnosticsCycle: { intervalMs: 400 },
  analyticsCycle: { intervalMs: 500 }
};

const cycleState = {
  renderCycle: { running: false, lastRun: 0, overlaps: 0 },
  nikaCycle: { running: false, lastRun: 0, overlaps: 0 },
  diagnosticsCycle: { running: false, lastRun: 0, overlaps: 0 },
  analyticsCycle: { running: false, lastRun: 0, overlaps: 0 }
};

function updateSystemHealth() {
  const overlaps = Object.keys(cycleState).reduce(function (sum, key) {
    return sum + (cycleState[key].overlaps || 0);
  }, 0);

  const errorCount = Array.isArray(window.__SYSTEM_ERRORS__) ? window.__SYSTEM_ERRORS__.length : 0;
  const queueSize = Array.isArray(window.__EVENT_BATCH__) ? window.__EVENT_BATCH__.length : 0;
  const renderLag = window.__RENDER_LAG_MS__ || 0;

  let stabilityScore = 100;
  stabilityScore -= Math.min(overlaps * 5, 30);
  stabilityScore -= Math.min(errorCount * 3, 30);
  stabilityScore -= Math.min(queueSize, 20);
  stabilityScore -= Math.min(Math.floor(renderLag / 50), 20);

  window.__SYSTEM_HEALTH__ = {
    renderLag: renderLag,
    cycleOverlaps: overlaps,
    errorCount: errorCount,
    eventQueueSize: queueSize,
    stabilityScore: Math.max(0, Math.min(100, stabilityScore)),
    updatedAt: new Date().toISOString()
  };
}

/**
 * @param {string} cycleName
 * @param {Function} fn
 * @param {{ force?: boolean, async?: boolean }} [options]
 * @returns {*}
 */
export function runCycle(cycleName, fn, options) {
  const config = CYCLE_CONFIG[cycleName];
  const state = cycleState[cycleName];

  if (!config || !state) {
    return options?.async ? safeExecuteAsync(fn, cycleName) : safeExecute(fn, cycleName);
  }

  if (state.running) {
    state.overlaps += 1;
    updateSystemHealth();
    const skipped = { ok: false, skipped: true, reason: "cycle_overlap", cycle: cycleName };
    return options?.async ? Promise.resolve(skipped) : skipped;
  }

  const now = Date.now();
  if (!options?.force && now - state.lastRun < config.intervalMs) {
    const throttled = { ok: false, skipped: true, reason: "throttled", cycle: cycleName };
    return options?.async ? Promise.resolve(throttled) : throttled;
  }

  state.running = true;
  state.lastRun = now;

  let outcome;
  if (options?.async) {
    return safeExecuteAsync(fn, cycleName).then(function (result) {
      state.running = false;
      updateSystemHealth();
      return result;
    });
  }

  outcome = safeExecute(fn, cycleName);
  state.running = false;
  updateSystemHealth();
  return outcome;
}

/**
 * @param {string} [context]
 */
export function recordCycleError(context) {
  if (!window.__SYSTEM_HEALTH__) {
    updateSystemHealth();
  }
  updateSystemHealth();
}

/**
 * Install global cycle manager API.
 */
export function installCycleManager() {
  window.__CYCLE_MANAGER__ = {
    run: runCycle,
    getState: function () {
      return Object.assign({}, cycleState);
    },
    recordError: recordCycleError,
    config: CYCLE_CONFIG
  };

  updateSystemHealth();
}

if (typeof window !== "undefined") {
  window.runCycle = runCycle;
  window.installCycleManager = installCycleManager;
}
