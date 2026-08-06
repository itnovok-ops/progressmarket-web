/**
 * Decision Classifier — SAFE / REVIEW / CRITICAL.
 */

export const CLASS_SAFE = "SAFE";
export const CLASS_REVIEW = "REVIEW";
export const CLASS_CRITICAL = "CRITICAL";

const SAFE_CODES = new Set([
  "cta_boost",
  "ui_emphasis_light"
]);

const REVIEW_CODES = new Set([
  "layout_rebalance",
  "funnel_rewrite",
  "ui_optimize"
]);

const CRITICAL_CODES = new Set([
  "agent_resync",
  "form_logic",
  "api_change",
  "backend_change",
  "component_delete"
]);

const SAFE_KEYWORDS = [
  "cta", "pulse", "glow", "sticky", "animation", "emphasis", "visual",
  "button size", "styling", "contrast"
];

const REVIEW_KEYWORDS = [
  "headline", "section order", "reorder", "layout", "video placement",
  "funnel", "bottleneck", "stage", "chaotic", "rebalance", "hero hook"
];

const CRITICAL_KEYWORDS = [
  "form logic", "lead form", "api", "backend", "delete", "removal",
  "pipeline", "events.php", "component delete", "authentication"
];

/**
 * Infer executable action code from a Nika decision (mirrors autopilot mapping).
 * @param {object} decision
 * @returns {string}
 */
export function inferActionCode(decision) {
  if (!decision) {
    return "";
  }
  if (decision.code) {
    return decision.code;
  }

  const params = decision.params || {};
  const actionText = String(decision.action || "").toLowerCase();
  const priority = decision.priority || "LOW";

  if (decision.type === "TRAFFIC") {
    if (params.emphasize && Array.isArray(params.emphasize)) {
      return "ui_optimize";
    }
    if (priority === "HIGH" || actionText.indexOf("ctr") !== -1) {
      return "cta_boost";
    }
    return "ui_emphasis_light";
  }

  if (decision.type === "FUNNEL") {
    if (actionText.indexOf("pipeline") !== -1 || actionText.indexOf("events") !== -1) {
      return "agent_resync";
    }
    return "funnel_rewrite";
  }

  if (decision.type === "UI") {
    if (actionText.indexOf("chaotic") !== -1 || actionText.indexOf("section") !== -1) {
      return "layout_rebalance";
    }
    if (priority === "LOW" && actionText.indexOf("monitoring") !== -1) {
      return "noop";
    }
    if (priority === "LOW") {
      return "ui_emphasis_light";
    }
    return "ui_optimize";
  }

  if (decision.type === "AGENT") {
    return "agent_resync";
  }

  return "";
}

/**
 * @param {object} decision
 * @param {string} [actionCode]
 * @returns {string}
 */
export function classifyDecision(decision, actionCode) {
  const code = actionCode || inferActionCode(decision);
  const actionText = String(decision?.action || "").toLowerCase();
  const target = String(decision?.target || "").toLowerCase();

  if (code === "noop" || !code) {
    if (decision?.priority === "LOW" && actionText.indexOf("monitoring") !== -1) {
      return CLASS_SAFE;
    }
    return CLASS_REVIEW;
  }

  if (CRITICAL_CODES.has(code)) {
    return CLASS_CRITICAL;
  }

  if (SAFE_CODES.has(code)) {
    return CLASS_SAFE;
  }

  if (REVIEW_CODES.has(code)) {
    return CLASS_REVIEW;
  }

  if (CRITICAL_KEYWORDS.some(function (k) { return actionText.indexOf(k) !== -1; })) {
    return CLASS_CRITICAL;
  }

  if (target === "growth" || target.indexOf("form") !== -1) {
    return CLASS_CRITICAL;
  }

  if (REVIEW_KEYWORDS.some(function (k) { return actionText.indexOf(k) !== -1; })) {
    return CLASS_REVIEW;
  }

  if (SAFE_KEYWORDS.some(function (k) { return actionText.indexOf(k) !== -1; })) {
    return CLASS_SAFE;
  }

  if (decision?.type === "AGENT") {
    return CLASS_CRITICAL;
  }

  if (decision?.type === "FUNNEL") {
    return CLASS_REVIEW;
  }

  if (decision?.type === "UI" || decision?.type === "TRAFFIC") {
    return code === "cta_boost" || code === "ui_emphasis_light" ? CLASS_SAFE : CLASS_REVIEW;
  }

  return CLASS_REVIEW;
}
