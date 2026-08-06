/**
 * Action Engine — emits ACTION intents only (no DOM).
 */

import { logAction, publishActionState } from "./actionLog.js";
import { enqueueIntent } from "../core/intentLayer.js";
import { runPipeline } from "../core/pipeline.js";

/**
 * @param {object} decision
 * @returns {object|null}
 */
export function decisionToAction(decision) {
  if (!decision || !decision.type) {
    return null;
  }

  const params = decision.params || {};
  const target = decision.target || "";
  const actionText = String(decision.action || "").toLowerCase();
  const priority = decision.priority || "LOW";

  if (decision.executable && decision.code) {
    return {
      code: decision.code,
      type: decision.type,
      target: target,
      params: params,
      priority: priority,
      source_id: decision.id
    };
  }

  if (decision.type === "TRAFFIC") {
    if (priority === "HIGH" || actionText.indexOf("ctr") !== -1) {
      return { code: "cta_boost", type: "TRAFFIC", target: "cta", params: params, priority: priority, source_id: decision.id };
    }
    return { code: "ui_emphasis_light", type: "TRAFFIC", target: "hero", params: params, priority: priority, source_id: decision.id };
  }

  if (decision.type === "FUNNEL") {
    return {
      code: "funnel_rewrite",
      type: "FUNNEL",
      target: params.stage || target || "cta",
      params: params,
      priority: priority,
      source_id: decision.id
    };
  }

  if (decision.type === "UI") {
    return {
      code: "ui_optimize",
      type: "UI",
      target: target || "hero",
      params: params,
      priority: priority,
      source_id: decision.id
    };
  }

  if (decision.type === "AGENT") {
    return { code: "agent_resync", type: "AGENT", target: "agents", params: params, priority: priority, source_id: decision.id };
  }

  return null;
}

/**
 * @param {object} action
 * @returns {object|null}
 */
function actionToIntentPayload(action) {
  switch (action.code) {
    case "cta_boost":
      return { ui: { ctaBoost: true } };
    case "ui_emphasis_light":
    case "ui_optimize":
      return { ui: { emphasis: action.params?.emphasize || ["hero", "video"] } };
    case "funnel_rewrite": {
      const stage = action.target || "cta";
      const key = stage === "video" ? "video" : stage === "cta" ? "cta" : "hero";
      return { ui: { emphasis: [key], ctaBoost: key === "cta" } };
    }
    case "layout_rebalance":
      return { ui: { emphasis: ["hero", "video", "cta"] } };
    case "agent_resync":
      return { meta: { agent_resync: true, target: action.target } };
    default:
      return null;
  }
}

/**
 * @param {object} action
 * @param {ParentNode} [_root]
 * @param {object} [_decision]
 * @returns {object}
 */
export function executeAction(action, _root, _decision) {
  return executeActionDirect(action);
}

/**
 * @param {object} action
 * @returns {object}
 */
function executeActionDirect(action) {
  try {
    const payload = actionToIntentPayload(action);
    if (!payload) {
      logAction("skip", "Unknown action code", { code: action.code });
      return { ok: false, skipped: true, reason: "unknown_code" };
    }

    enqueueIntent({
      type: "ACTION",
      source: "autopilot",
      payload: payload
    });

    const pipeline = runPipeline();
    logAction("exec", "Intent queued and pipeline executed", { code: action.code });
    return { ok: pipeline.ok !== false, mode: "intent_pipeline", pipeline: pipeline };
  } catch (error) {
    logAction("error", "Action intent failed safely", { code: action.code, error: String(error) });
    return { ok: false, reason: "execution_exception" };
  }
}

/**
 * @param {object[]} decisions
 * @param {ParentNode} [_root]
 * @param {{ maxActions?: number }} [options]
 * @returns {object}
 */
export function executeDecisionBatch(decisions, _root, options) {
  const maxActions = options?.maxActions || 3;
  const applied = [];
  const skipped = [];

  (decisions || []).slice(0, maxActions * 2).forEach(function (decision) {
    if (applied.length >= maxActions) {
      return;
    }

    const action = decisionToAction(decision);
    if (!action) {
      skipped.push({ id: decision.id, reason: "not_executable" });
      return;
    }

    const result = executeActionDirect(action);
    if (result.ok) {
      applied.push({ decision_id: decision.id, code: action.code, result: result });
    } else {
      skipped.push({ id: decision.id, code: action.code, reason: result.reason || "failed" });
    }
  });

  publishActionState({
    active: true,
    applied: applied,
    skipped: skipped,
    last_cycle_at: Date.now()
  });

  return { applied: applied, skipped: skipped };
}
