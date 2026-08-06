/**
 * UI Optimizer — section priority and layout emphasis (no redesign).
 */

import { applyClasses, ensureAutopilotStyles, getAppRoot } from "./autopilotStyles.js";
import { logAction } from "./actionLog.js";

const SECTION_MAP = {
  hero: ['[data-track-section="hero"]', "section.hero"],
  video: ["#video", ".section--video"],
  problem: ["#problem"],
  insight: ["#insight"],
  cta: ["#cta", "#lead-form-wrap"],
  footer: ["footer.site-footer"]
};

/**
 * @param {ParentNode} scope
 * @param {string} key
 * @returns {Element|null}
 */
function findSection(scope, key) {
  const selectors = SECTION_MAP[key] || [key];
  for (let i = 0; i < selectors.length; i++) {
    const el = scope.querySelector(selectors[i]);
    if (el) {
      return el;
    }
  }
  return null;
}

/**
 * @param {ParentNode} [root]
 * @param {{ emphasize?: string[], deemphasize?: string[] }} [params]
 * @returns {object}
 */
export function optimizeUI(root, params) {
  try {
    ensureAutopilotStyles();
    const scope = getAppRoot(root);
    if (!scope) {
      return { ok: false };
    }

    const emphasize = params?.emphasize || [];
    let count = 0;

    emphasize.forEach(function (key) {
      const section = findSection(scope, key);
      if (section) {
        applyClasses(section, ["lifeos-ap-emphasis", "lifeos-ap-section-priority"]);
        count += 1;
      }
    });

    if (params?.scroll_to) {
      const target = findSection(scope, params.scroll_to);
      if (target && typeof target.scrollIntoView === "function") {
        try {
          target.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch (_e) {
          /* silent */
        }
      }
    }

    logAction("info", "UI optimizer applied emphasis", { sections: emphasize, count: count });
    return { ok: true, emphasized: count };
  } catch (error) {
    logAction("warn", "UI optimizer failed safely", { error: String(error) });
    return { ok: false };
  }
}

/**
 * @param {ParentNode} [root]
 * @returns {object}
 */
export function emphasizeHeroVideo(root) {
  return optimizeUI(root, { emphasize: ["hero", "video"] });
}
