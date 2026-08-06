/**
 * Safety Engine — evaluates risk and system instability (read-only inputs).
 */

import { getModePolicy, MODES, setFrozen } from "./modeManager.js";
import { CLASS_SAFE, inferActionCode } from "../nika/approval/decisionClassifier.js";

/**
 * @returns {object}
 */
export function detectInstability() {
  const signals = [];
  let score = 100;

  const bootPass = window.__BOOT_STATE__ === "PASS";
  if (!bootPass) {
    signals.push({ code: "boot_not_pass", weight: 30 });
    score -= 30;
  }

  const systemReport = window.__LIFEOS_SYSTEM_REPORT__ || null;
  if (systemReport && typeof systemReport.health_score === "number" && systemReport.health_score < 50) {
    signals.push({ code: "low_health_score", weight: 25, value: systemReport.health_score });
    score -= 25;
  }

  const agentHealth = window.__LIFEOS_AGENT_REPORT__?.systemHealth;
  if (agentHealth === "FAIL") {
    signals.push({ code: "agent_network_fail", weight: 20 });
    score -= 20;
  }

  const nikaHealth = window.__NIKA_REPORT__?.systemHealth;
  if (nikaHealth === "FAIL") {
    signals.push({ code: "nika_fail", weight: 15 });
    score -= 15;
  }

  const autopilotErrors = countLogLevel("error");
  if (autopilotErrors >= 5) {
    signals.push({ code: "autopilot_errors", weight: 15, value: autopilotErrors });
    score -= 15;
  }

  const criticalRisks = (systemReport?.risks || []).filter(function (r) {
    return r.severity === "critical" || r.severity === "high";
  }).length;
  if (criticalRisks >= 3) {
    signals.push({ code: "critical_risks", weight: 10, value: criticalRisks });
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));
  const unstable = score < 55 || signals.some(function (s) {
    return s.code === "boot_not_pass" || s.code === "agent_network_fail";
  });

  return {
    unstable: unstable,
    stability_score: score,
    signals: signals,
    autopilot_frozen: unstable,
    recommended_mode: unstable ? MODES.ANALYTICS : null
  };
}

/**
 * @param {string} level
 * @returns {number}
 */
function countLogLevel(level) {
  const log = window.__LIFEOS_ACTION_LOG__ || [];
  return log.filter(function (e) { return e.level === level; }).length;
}

/**
 * Apply instability response.
 * @returns {object}
 */
export function applyInstabilityResponse() {
  const detection = detectInstability();
  if (detection.unstable) {
    setFrozen(true, "instability:" + (detection.signals[0]?.code || "unknown"));
  }
  return detection;
}

/**
 * @param {object} action
 * @param {object} [context]
 * @returns {{ allowed: boolean, risk: string, reason?: string }}
 */
export function evaluateActionSafety(action, context) {
  const policy = getModePolicy();
  const code = action?.code || inferActionCode(action) || context?.code || "";
  const classification = context?.classification || inferClassification(code, action);

  if (!policy.autopilot_enabled && context?.type === "autopilot") {
    return { allowed: false, risk: "high", reason: "autopilot_disabled_by_mode" };
  }

  if (!policy.ui_modifications && isUiAction(code)) {
    return { allowed: false, risk: "high", reason: "ui_modifications_disabled" };
  }

  if (policy.safe_actions_only && classification !== CLASS_SAFE) {
    return { allowed: false, risk: "medium", reason: "safe_actions_only_mode" };
  }

  if (action?.hard === true || action?.remove === true) {
    return { allowed: false, risk: "critical", reason: "destructive_action" };
  }

  const instability = detectInstability();
  if (instability.unstable && context?.type === "autopilot") {
    return { allowed: false, risk: "high", reason: "system_instability" };
  }

  return { allowed: true, risk: classification === CLASS_SAFE ? "low" : "medium" };
}

/**
 * @param {object} decision
 * @returns {{ allowed: boolean, risk: string, reason?: string }}
 */
export function evaluateDecisionSafety(decision) {
  const policy = getModePolicy();
  if (!policy.nika_advisory && decision?.executable) {
    return { allowed: false, risk: "medium", reason: "nika_execution_disabled" };
  }

  if (decision?.executable && !policy.autopilot_enabled) {
    return { allowed: false, risk: "medium", reason: "execution_disabled_by_mode" };
  }

  return evaluateActionSafety(decision, {
    type: "nika_decision",
    code: decision?.code || inferActionCode(decision)
  });
}

/**
 * @param {string} code
 * @param {object} action
 * @returns {string}
 */
function inferClassification(code, action) {
  if (code === "cta_boost" || code === "ui_emphasis_light") {
    return CLASS_SAFE;
  }
  if (action?.classification) {
    return action.classification;
  }
  return "REVIEW";
}

/**
 * @param {string} code
 * @returns {boolean}
 */
function isUiAction(code) {
  return [
    "cta_boost",
    "ui_emphasis_light",
    "ui_optimize",
    "layout_rebalance",
    "funnel_rewrite"
  ].indexOf(code) !== -1;
}

/**
 * @returns {object}
 */
export function getSafetySnapshot() {
  const instability = detectInstability();
  const policy = getModePolicy();

  return {
    stability_score: instability.stability_score,
    unstable: instability.unstable,
    signals: instability.signals,
    autopilot_frozen: instability.autopilot_frozen || !policy.autopilot_enabled,
    safe_actions_only: policy.safe_actions_only,
    ui_modifications: policy.ui_modifications,
    evaluated_at: Date.now()
  };
}
