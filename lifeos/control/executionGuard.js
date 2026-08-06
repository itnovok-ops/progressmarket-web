/**
 * Execution Guard — intercepts Nika, Autopilot, and UI modifications.
 */

import { evaluateActionSafety, evaluateDecisionSafety } from "./safetyEngine.js";
import { getModePolicy } from "./modeManager.js";
import { hasExplicitAutopilotApproval, isProductionMode } from "../core/productionMode.js";
import { throttleCycle } from "../integration/loopThrottle.js";

/** @type {object[]} */
const blocks = [];
const MAX_BLOCKS = 80;

/**
 * @param {string} domain
 * @param {string} reason
 * @param {object} [meta]
 */
function recordBlock(domain, reason, meta) {
  blocks.push({
    domain: domain,
    reason: reason,
    meta: meta || {},
    at: Date.now()
  });
  if (blocks.length > MAX_BLOCKS) {
    blocks.splice(0, blocks.length - MAX_BLOCKS);
  }
}

/**
 * @returns {boolean}
 */
export function isBootExecutionReady() {
  try {
    if (window.__BOOT_STATE__ !== "PASS") {
      return false;
    }
    if (window.__LIFEOS_BUILD_LOCK__ !== true) {
      return false;
    }
    const mount = document.getElementById("app");
    if (!mount || !mount.classList.contains("ready")) {
      return false;
    }
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * @returns {{ ok: boolean, reason?: string }}
 */
export function guardSystemBoot() {
  if (!isBootExecutionReady()) {
    return { ok: false, reason: "boot_not_ready" };
  }
  return { ok: true };
}

/**
 * @param {object} decision
 * @param {string} [source]
 * @returns {{ allowed: boolean, reason?: string, risk?: string }}
 */
export function guardNikaDecision(decision, source) {
  const cycle = throttleCycle("nika", source || "decision");
  if (!cycle.allowed) {
    recordBlock("nika", cycle.reason, { decision_id: decision?.id });
    return { allowed: false, reason: cycle.reason };
  }

  const safety = evaluateDecisionSafety(decision);
  if (!safety.allowed) {
    recordBlock("nika", safety.reason, { decision_id: decision?.id });
  }

  return { allowed: safety.allowed, reason: safety.reason, risk: safety.risk };
}

/**
 * @param {object} action
 * @param {object} [decision]
 * @returns {{ allowed: boolean, reason?: string, risk?: string }}
 */
export function guardAutopilotAction(action, decision) {
  const boot = guardSystemBoot();
  if (!boot.ok) {
    recordBlock("autopilot", boot.reason, { code: action?.code });
    return { allowed: false, reason: boot.reason };
  }

  if (isProductionMode() && !hasExplicitAutopilotApproval(decision)) {
    recordBlock("autopilot", "production_requires_explicit_approval", { code: action?.code });
    return { allowed: false, reason: "production_requires_explicit_approval" };
  }

  const cycle = throttleCycle("autopilot", "execution");
  if (!cycle.allowed) {
    recordBlock("autopilot", cycle.reason, { code: action?.code });
    return { allowed: false, reason: cycle.reason };
  }

  const policy = getModePolicy();
  if (!policy.autopilot_enabled) {
    recordBlock("autopilot", "autopilot_disabled_by_mode", { mode: policy.mode });
    return { allowed: false, reason: "autopilot_disabled_by_mode" };
  }

  const safety = evaluateActionSafety(action || decision, {
    type: "autopilot",
    code: action?.code,
    classification: decision?.classification
  });

  if (!safety.allowed) {
    recordBlock("autopilot", safety.reason, { code: action?.code });
  }

  return { allowed: safety.allowed, reason: safety.reason, risk: safety.risk };
}

/**
 * @param {object} action
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function guardUIModification(action) {
  const policy = getModePolicy();
  if (!policy.ui_modifications) {
    recordBlock("ui", "ui_modifications_disabled", { code: action?.code });
    return { allowed: false, reason: "ui_modifications_disabled" };
  }

  const safety = evaluateActionSafety(action, { type: "autopilot", code: action?.code });
  if (!safety.allowed) {
    recordBlock("ui", safety.reason, { code: action?.code });
  }

  return { allowed: safety.allowed, reason: safety.reason };
}

/**
 * @param {string} cycleName
 * @param {string} [source]
 * @returns {boolean}
 */
export function guardObservabilityCycle(cycleName, source) {
  const cycle = throttleCycle(cycleName === "audit" ? "observability" : cycleName, source || "observability");
  if (!cycle.allowed) {
    recordBlock("observability", cycle.reason, { cycle: cycleName });
    return false;
  }
  return true;
}

/**
 * @param {string} [source]
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function guardRevenueCycle(source) {
  const boot = guardSystemBoot();
  if (!boot.ok && source !== "manual" && source !== "boot") {
    recordBlock("revenue", boot.reason, { source: source || "cycle" });
    return { allowed: false, reason: boot.reason };
  }

  const cycle = throttleCycle("revenue", source || "cycle");
  if (!cycle.allowed) {
    recordBlock("revenue", cycle.reason, { source: source || "cycle" });
    return { allowed: false, reason: cycle.reason };
  }

  return { allowed: true };
}

/**
 * @param {object} [payload]
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function guardRevenueRoute(payload) {
  if (payload && payload.executable === true) {
    recordBlock("revenue", "executable_revenue_route_blocked");
    return { allowed: false, reason: "executable_revenue_route_blocked" };
  }

  const recommendations = payload?.recommendations || [];
  const hasExecutableRec = recommendations.some(function (rec) {
    return rec && rec.executable === true;
  });

  if (hasExecutableRec) {
    recordBlock("revenue", "executable_recommendation_blocked");
    return { allowed: false, reason: "executable_recommendation_blocked" };
  }

  return { allowed: true };
}

/**
 * @returns {boolean}
 */
export function canExecuteAutopilot() {
  const boot = guardSystemBoot();
  if (!boot.ok) {
    return false;
  }
  const policy = getModePolicy();
  if (policy.autopilot_enabled !== true) {
    return false;
  }
  if (isProductionMode()) {
    if (policy.explicit_approval_required === true) {
      const approved = window.__NIKA_APPROVED_DECISIONS__ || [];
      return approved.some(function (decision) {
        return hasExplicitAutopilotApproval(decision);
      });
    }
    return false;
  }
  return true;
}

/**
 * @returns {object[]}
 */
export function getBlocks() {
  return blocks.slice();
}

/**
 * @returns {object}
 */
export function getGuardSnapshot() {
  return {
    boot_ready: isBootExecutionReady(),
    autopilot_permitted: canExecuteAutopilot(),
    recent_blocks: blocks.slice(-12),
    total_blocks: blocks.length
  };
}
