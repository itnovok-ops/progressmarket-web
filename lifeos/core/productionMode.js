/**
 * Production Mode — deterministic runtime contract for SuperSite + LifeOS.
 */

let mutationLock = false;

const BLOCKED_AGENT_SOURCES = new Set([
  "nika",
  "uiAutoRepair",
  "conversionBoost",
  "playButtonVisibility",
  "autoAction",
  "uiOptimizer",
  "competitive"
]);

const VIDEO_ACTIONS = new Set([
  "VIDEO_INIT",
  "VIDEO_PLAY",
  "VIDEO_PAUSE",
  "SHOW_VIDEO",
  "HIDE_OVERLAY"
]);

/**
 * @returns {boolean}
 */
export function isProductionMode() {
  return window.__LIFEOS_PRODUCTION_MODE__ === true;
}

/**
 * @returns {object}
 */
export function initProductionMode() {
  window.__LIFEOS_PRODUCTION_MODE__ = true;
  window.__LIFEOS_EXPERIMENTAL_DISABLED__ = true;
  window.__LIFEOS_LEGACY_EVENT_ROUTER__ = false;
  window.__LIFEOS_AGENTS_READONLY__ = true;
  window.__LIFEOS_NIKA_ADVISORY_ONLY__ = true;
  return { ok: true, mode: "PRODUCTION" };
}

/**
 * @returns {boolean}
 */
export function isAgentReadOnly() {
  return isProductionMode() && window.__LIFEOS_AGENTS_READONLY__ === true;
}

/**
 * @returns {boolean}
 */
export function requiresExplicitAutopilotApproval() {
  return isProductionMode();
}

/**
 * @param {string} source
 * @returns {boolean}
 */
export function isBlockedAgentSource(source) {
  return isProductionMode() && BLOCKED_AGENT_SOURCES.has(String(source || ""));
}

/**
 * @param {object} [decision]
 * @returns {boolean}
 */
export function hasExplicitAutopilotApproval(decision) {
  if (!decision) {
    return false;
  }
  if (decision.explicit_approval === true || decision.user_approved === true) {
    return true;
  }
  const proposals = window.__NIKA_PROPOSALS__ || [];
  const proposal = proposals.find(function (p) {
    return p.id === decision.proposal_id || p.decision_id === decision.id;
  });
  return Boolean(proposal && proposal.status === "approved" && proposal.auto !== true);
}

/**
 * @returns {boolean}
 */
export function acquireMutationLock() {
  if (mutationLock) {
    return false;
  }
  mutationLock = true;
  return true;
}

/**
 * Release concurrent mutation lock.
 */
export function releaseMutationLock() {
  mutationLock = false;
}

/**
 * @returns {boolean}
 */
export function isMutationLocked() {
  return mutationLock;
}

/**
 * @param {object} action
 * @param {string} source
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function validateUIMutation(action, source) {
  if (!action || !action.type) {
    return { allowed: false, reason: "invalid_action" };
  }

  if (!isProductionMode()) {
    return { allowed: true };
  }

  if (isMutationLocked() && !isLayerBypassSource(source)) {
    return { allowed: false, reason: "mutation_lock_active" };
  }

  if (VIDEO_ACTIONS.has(action.type)) {
    if (window.__LIFEOS_VIDEO_IMMUTABLE__ === true && action.type === "VIDEO_INIT") {
      return { allowed: false, reason: "video_immutable" };
    }
    const allowedVideoSources = ["videoController", "boot", "videoOrchestrator"];
    if (allowedVideoSources.indexOf(source) === -1) {
      return { allowed: false, reason: "video_source_blocked" };
    }
  }

  if (isBlockedAgentSource(source)) {
    return { allowed: false, reason: "production_agent_blocked" };
  }

  if (source === "autopilot" && window.__LIFEOS_APPROVED_AUTOPILOT_ACTIVE__ !== true) {
    return { allowed: false, reason: "autopilot_requires_approval_gate" };
  }

  return { allowed: true };
}

/**
 * @param {string} source
 * @returns {boolean}
 */
function isLayerBypassSource(source) {
  return source === "boot" || source === "videoController";
}

/**
 * @returns {object}
 */
export function getProductionSnapshot() {
  return {
    production_mode: isProductionMode(),
    experimental_disabled: window.__LIFEOS_EXPERIMENTAL_DISABLED__ === true,
    legacy_event_router: window.__LIFEOS_LEGACY_EVENT_ROUTER__ === true,
    agents_readonly: window.__LIFEOS_AGENTS_READONLY__ === true,
    nika_advisory_only: window.__LIFEOS_NIKA_ADVISORY_ONLY__ === true,
    video_immutable: window.__LIFEOS_VIDEO_IMMUTABLE__ === true,
    mutation_locked: mutationLock
  };
}

if (typeof window !== "undefined" && window.__LIFEOS_PRODUCTION_MODE__ === true) {
  initProductionMode();
}
