/**
 * Autopilot shared styles — intent-only (no DOM).
 */

import { enqueueIntent } from "../core/intentLayer.js";

export function ensureAutopilotStyles() {
  enqueueIntent({
    type: "ACTION",
    source: "autopilot",
    payload: { meta: { autopilot_styles: true } }
  });
}

/**
 * @param {Element|null} _el
 * @param {string[]} classes
 */
export function applyClasses(_el, classes) {
  const emphasis = [];
  if (classes && classes.indexOf("lifeos-ap-section-priority") !== -1) {
    emphasis.push("hero");
  }
  enqueueIntent({
    type: "ACTION",
    source: "autopilot",
    payload: {
      ui: {
        ctaBoost: classes && classes.indexOf("lifeos-ap-cta-pulse") !== -1,
        emphasis: emphasis.length ? emphasis : ["hero"]
      }
    }
  });
}

/**
 * @param {Element|null} _el
 * @param {string[]} _classes
 */
export function removeClasses(_el, _classes) {
  enqueueIntent({
    type: "ACTION",
    source: "autopilot",
    payload: { ui: { ctaBoost: false, emphasis: [] } }
  });
}

/**
 * @param {ParentNode} [root]
 * @returns {HTMLElement|null}
 */
export function getAppRoot(root) {
  if (root && root.nodeType === 1) {
    return /** @type {HTMLElement} */ (root);
  }
  return document.getElementById("app");
}
