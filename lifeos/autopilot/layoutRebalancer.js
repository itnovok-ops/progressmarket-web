/**
 * Layout Rebalancer — intent-only (no DOM).
 */

import { ensureAutopilotStyles, getAppRoot } from "./autopilotStyles.js";
import { logAction } from "./actionLog.js";
import { enqueueIntent } from "../core/intentLayer.js";
import { runPipeline } from "../core/pipeline.js";

/**
 * @param {ParentNode} [root]
 * @param {{ priority?: string[] }} [params]
 * @returns {object}
 */
export function rebalanceLayout(root, params) {
  try {
    ensureAutopilotStyles();
    const scope = getAppRoot(root);
    if (!scope) {
      return { ok: false, reason: "no_root" };
    }

    const priority = params?.priority || ["hero", "video", "problem", "insight", "cta"];
    enqueueIntent({
      type: "ACTION",
      source: "autopilot",
      payload: { ui: { emphasis: priority.slice(0, 3) } }
    });
    runPipeline();

    logAction("info", "Layout intent queued", { priority: priority });
    return { ok: true, mode: "intent_only", priority: priority };
  } catch (error) {
    logAction("warn", "Layout intent failed safely", { error: String(error) });
    return { ok: false };
  }
}

export function normalizeChaoticFlow(root) {
  const observer = window.__LIFEOS_OBSERVER_REPORT__;
  if (observer?.flags?.chaotic_ui_flow) {
    return rebalanceLayout(root, { priority: ["hero", "video", "problem", "insight", "cta"] });
  }
  return { ok: true, skipped: true };
}
