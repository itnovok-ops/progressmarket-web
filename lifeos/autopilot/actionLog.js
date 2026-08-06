/**
 * LifeOS Autopilot — action log and global state.
 */

import { canExecuteAutopilot, isBootExecutionReady } from "../control/executionGuard.js";

const MAX_LOG = 100;

/**
 * @param {string} level
 * @param {string} message
 * @param {object} [meta]
 */
export function logAction(level, message, meta) {
  try {
    window.__LIFEOS_ACTION_LOG__ = window.__LIFEOS_ACTION_LOG__ || [];
    window.__LIFEOS_ACTION_LOG__.push({
      level: level,
      message: message,
      meta: meta || {},
      at: Date.now()
    });
    if (window.__LIFEOS_ACTION_LOG__.length > MAX_LOG) {
      window.__LIFEOS_ACTION_LOG__ = window.__LIFEOS_ACTION_LOG__.slice(-MAX_LOG);
    }
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {object} patch
 */
export function publishActionState(patch) {
  try {
    const current = window.__LIFEOS_ACTION_STATE__ || {
      active: false,
      applied: [],
      skipped: [],
      last_cycle_at: 0
    };
    window.__LIFEOS_ACTION_STATE__ = Object.assign({}, current, patch, {
      updated_at: Date.now()
    });
  } catch (_error) {
    /* silent */
  }
}

/**
 * @returns {boolean}
 */
export function isExecutionAllowed() {
  try {
    if (!isBootExecutionReady()) {
      return false;
    }
    if (!canExecuteAutopilot()) {
      return false;
    }
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * @param {object} action
 * @returns {{ ok: boolean, reason?: string }}
 */
export function assessRisk(action) {
  if (!action || typeof action !== "object") {
    return { ok: false, reason: "invalid_action" };
  }

  if (action.hard === true || action.remove === true) {
    return { ok: false, reason: "hard_mutation_blocked" };
  }

  const blocked = ["innerHTML", "outerHTML", "document.write", "removeChild"];
  const code = String(action.code || action.action || "");
  if (blocked.some(function (b) { return code.indexOf(b) !== -1; })) {
    return { ok: false, reason: "destructive_pattern" };
  }

  if (!isExecutionAllowed()) {
    return { ok: false, reason: "execution_not_allowed" };
  }

  return { ok: true };
}
