/**
 * CTA Booster — increases CTA visibility on conversion drop (soft classes only).
 */

import { applyClasses, ensureAutopilotStyles, getAppRoot, removeClasses } from "./autopilotStyles.js";
import { logAction } from "./actionLog.js";

const APPLIED = new Set();

/**
 * @param {ParentNode} [root]
 * @param {{ level?: string, sticky?: boolean, pulse?: boolean }} [params]
 * @returns {object}
 */
export function boostCta(root, params) {
  try {
    ensureAutopilotStyles();
    const scope = getAppRoot(root);
    if (!scope) {
      return { ok: false, reason: "no_root" };
    }

    const level = params?.level || "medium";
    const targets = scope.querySelectorAll(
      "#lead-submit, .btn-primary, a[href*='#cta'], a[href*='cta']"
    );

    if (!targets.length) {
      return { ok: false, reason: "no_cta_targets" };
    }

    const classes = ["lifeos-ap-emphasis"];
    if (level === "high") {
      classes.push("lifeos-ap-cta-glow", "lifeos-ap-emphasis-strong");
    }
    if (params?.pulse !== false) {
      classes.push("lifeos-ap-cta-pulse");
    }

    targets.forEach(function (el) {
      applyClasses(el, classes);
      if (params?.sticky) {
        const section = el.closest("#cta, section") || el.parentElement;
        if (section) {
          applyClasses(section, ["lifeos-ap-cta-sticky"]);
        }
      }
      APPLIED.add(el);
    });

    logAction("info", "CTA boost applied", { level: level, count: targets.length });
    return { ok: true, count: targets.length, level: level };
  } catch (error) {
    logAction("warn", "CTA boost failed safely", { error: String(error) });
    return { ok: false, reason: "exception" };
  }
}

/**
 * @param {ParentNode} [root]
 */
export function resetCtaBoost(root) {
  try {
    const scope = getAppRoot(root);
    if (!scope) {
      return;
    }
    scope.querySelectorAll(".lifeos-ap-cta-pulse, .lifeos-ap-cta-glow, .lifeos-ap-cta-sticky").forEach(function (el) {
      removeClasses(el, [
        "lifeos-ap-cta-pulse",
        "lifeos-ap-cta-glow",
        "lifeos-ap-cta-sticky",
        "lifeos-ap-emphasis",
        "lifeos-ap-emphasis-strong"
      ]);
    });
  } catch (_error) {
    /* silent */
  }
}
