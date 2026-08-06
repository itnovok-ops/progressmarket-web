/**
 * Mode Manager — PRODUCTION / SAFE_OPTIMIZATION / ANALYTICS / OBSERVABILITY.
 */

export const MODES = {
  PRODUCTION: "PRODUCTION",
  SAFE_OPTIMIZATION: "SAFE_OPTIMIZATION",
  ANALYTICS: "ANALYTICS",
  OBSERVABILITY: "OBSERVABILITY"
};

const MODE_POLICIES = {
  PRODUCTION: {
    autopilot_enabled: true,
    ui_modifications: false,
    safe_actions_only: true,
    analytics_collection: true,
    observability_full: false,
    nika_advisory: true,
    explicit_approval_required: true
  },
  SAFE_OPTIMIZATION: {
    autopilot_enabled: true,
    ui_modifications: true,
    safe_actions_only: true,
    analytics_collection: true,
    observability_full: true,
    nika_advisory: true
  },
  ANALYTICS: {
    autopilot_enabled: false,
    ui_modifications: false,
    safe_actions_only: false,
    analytics_collection: true,
    observability_full: false,
    nika_advisory: true
  },
  OBSERVABILITY: {
    autopilot_enabled: false,
    ui_modifications: false,
    safe_actions_only: false,
    analytics_collection: true,
    observability_full: true,
    nika_advisory: true
  }
};

let currentMode = typeof window !== "undefined" && window.__LIFEOS_PRODUCTION_MODE__ === true
  ? MODES.PRODUCTION
  : MODES.SAFE_OPTIMIZATION;
let modeReason = "default";
let frozen = false;

/**
 * @returns {string}
 */
export function getMode() {
  try {
    const config = window.__LIFEOS_CONTROL_CONFIG__ || {};
    if (config.mode && MODE_POLICIES[config.mode]) {
      return config.mode;
    }
  } catch (_error) {
    /* silent */
  }
  return currentMode;
}

/**
 * @param {string} mode
 * @param {string} [reason]
 * @returns {string}
 */
export function setMode(mode, reason) {
  if (!MODE_POLICIES[mode]) {
    return currentMode;
  }
  if (typeof window !== "undefined" && window.__LIFEOS_PRODUCTION_MODE__ === true) {
    if (mode === MODES.SAFE_OPTIMIZATION) {
      mode = MODES.PRODUCTION;
    }
  }
  if (frozen && mode !== MODES.ANALYTICS && mode !== MODES.OBSERVABILITY) {
    currentMode = MODES.ANALYTICS;
    modeReason = reason || "instability_freeze";
    return currentMode;
  }
  currentMode = mode;
  modeReason = reason || "manual";
  return currentMode;
}

/**
 * @param {boolean} value
 * @param {string} [reason]
 */
export function setFrozen(value, reason) {
  frozen = value === true;
  if (frozen) {
    currentMode = MODES.ANALYTICS;
    modeReason = reason || "instability_detected";
  }
}

/**
 * @returns {boolean}
 */
export function isFrozen() {
  return frozen;
}

/**
 * @returns {object}
 */
export function getModePolicy() {
  const mode = getMode();
  return Object.assign({ mode: mode, reason: modeReason, frozen: frozen }, MODE_POLICIES[mode]);
}

/**
 * @returns {object}
 */
export function getModeSnapshot() {
  return {
    current: getMode(),
    reason: modeReason,
    frozen: frozen,
    policy: getModePolicy()
  };
}
