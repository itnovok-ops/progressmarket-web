/**
 * Funnel Rewriter — soft funnel flow adjustments based on conversion data.
 */

import { applyClasses, ensureAutopilotStyles, getAppRoot } from "./autopilotStyles.js";
import { logAction } from "./actionLog.js";
import { boostCta } from "./ctaBooster.js";
import { optimizeUI } from "./uiOptimizer.js";

const STAGE_SECTION = {
  visit: "hero",
  scroll: "hero",
  video: "video",
  video_view: "video",
  video_click: "video",
  cta: "cta",
  cta_click: "cta",
  form_start: "cta",
  form_submit: "cta"
};

/**
 * @param {ParentNode} [root]
 * @param {{ stage?: string, weakest?: string }} [params]
 * @returns {object}
 */
export function rewriteFunnelFlow(root, params) {
  try {
    ensureAutopilotStyles();
    const scope = getAppRoot(root);
    if (!scope) {
      return { ok: false };
    }

    const funnel = window.__LIFEOS_FUNNEL_METRICS__ || {};
    const weakest = params?.stage || params?.weakest || funnel.weakest_stage || funnel.bottleneck;
    const stage = weakest || "cta";

    const sectionKey = STAGE_SECTION[stage] || "cta";
    optimizeUI(scope, { emphasize: [sectionKey] });

    const section = scope.querySelector(
      sectionKey === "video" ? "#video" : sectionKey === "cta" ? "#cta" : '[data-track-section="hero"]'
    );
    if (section) {
      applyClasses(section, ["lifeos-ap-funnel-focus"]);
    }

    if (stage === "cta" || stage === "cta_click" || stage === "form_start" || stage === "form_submit") {
      boostCta(scope, { level: "high", sticky: true, pulse: true });
    }

    if (stage === "video" || stage === "video_view" || stage === "video_click") {
      optimizeUI(scope, { emphasize: ["video", "hero"] });
    }

    logAction("info", "Funnel flow adjusted", { weakest: stage, emphasis: sectionKey });
    return { ok: true, weakest: stage, emphasis: sectionKey };
  } catch (error) {
    logAction("warn", "Funnel rewriter failed safely", { error: String(error) });
    return { ok: false };
  }
}

/**
 * @param {ParentNode} [root]
 * @returns {object}
 */
export function applyFunnelFromMetrics(root) {
  const funnel = window.__LIFEOS_FUNNEL_METRICS__ || {};
  return rewriteFunnelFlow(root, { stage: funnel.weakest_stage || funnel.bottleneck });
}
