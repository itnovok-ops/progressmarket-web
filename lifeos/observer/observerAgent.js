/**
 * LifeOS System Observer Agent — read-only diagnostics layer.
 */

import { scanUI } from "./uiScanner.js";
import { analyzeMenuStructure } from "./menuStructureAnalyzer.js";
import { trackChanges } from "./cursorChangeTracker.js";
import { buildSystemHealthMap } from "./systemHealthMap.js";

const OBSERVER_EVENT = "lifeos:observer:update";
let started = false;
let mutationObserver = null;
let rescanTimer = 0;

/**
 * @param {ParentNode} [root]
 * @returns {object}
 */
export function runObserver(root) {
  try {
    const scope = root || document.getElementById("app") || document;

    const ui = scanUI(scope);
    const menu = analyzeMenuStructure(scope);
    const changes = trackChanges(scope);
    const health = buildSystemHealthMap(scope);

    const report = {
      ok: health.status !== "critical",
      agent: "lifeos-observer",
      version: "1.0.0",
      ui_scan: ui,
      menu_structure: menu,
      change_tracker: changes,
      system_health: health,
      flags: {
        chaotic_ui_flow: menu.chaotic === true,
        dom_changed: changes.changed === true,
        high_severity_ui_issues: ui.issues.filter(function (i) {
          return i.severity === "high";
        }).length
      },
      generated_at: Date.now()
    };

    window.__LIFEOS_OBSERVER_REPORT__ = report;
    window.__LIFEOS_GET_OBSERVER_REPORT__ = function () {
      return window.__LIFEOS_OBSERVER_REPORT__;
    };
    window.__LIFEOS_RUN_OBSERVER__ = function (target) {
      return runObserver(target || scope);
    };

    document.dispatchEvent(
      new CustomEvent(OBSERVER_EVENT, { detail: { report: report } })
    );

    return report;
  } catch (_error) {
    const fallback = {
      ok: false,
      agent: "lifeos-observer",
      error: "observer_failed_safely",
      generated_at: Date.now()
    };
    window.__LIFEOS_OBSERVER_REPORT__ = fallback;
    return fallback;
  }
}

/**
 * @param {ParentNode} [root]
 */
export function startObserver(root) {
  if (started) {
    return runObserver(root);
  }

  started = true;
  const scope = root || document.getElementById("app") || document;
  const reduced = window.__LIFEOS_OBSERVABILITY_MODE__ === "REDUCED";
  const debounceMs = reduced ? 3500 : 1200;

  runObserver(scope);

  if (typeof MutationObserver !== "undefined" && scope && scope.nodeType === 1) {
    mutationObserver = new MutationObserver(function () {
      if (rescanTimer) {
        window.clearTimeout(rescanTimer);
      }
      rescanTimer = window.setTimeout(function () {
        runObserver(scope);
      }, debounceMs);
    });

    mutationObserver.observe(scope, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "id", "hidden", "style"]
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      runObserver(scope);
    }
  });

  window.addEventListener("lifeos:session:update", function () {
    if (window.__LIFEOS_OBSERVABILITY_MODE__ !== "REDUCED") {
      runObserver(scope);
    }
  });

  return window.__LIFEOS_OBSERVER_REPORT__;
}

/**
 * Stop mutation observer (tests / teardown).
 */
export function stopObserver() {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  if (rescanTimer) {
    window.clearTimeout(rescanTimer);
  }
  started = false;
}
