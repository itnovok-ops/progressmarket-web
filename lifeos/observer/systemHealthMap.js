/**
 * System health map — aggregates UI, structure, boot, growth, session state.
 */

import { scanUI } from "./uiScanner.js";
import { analyzeMenuStructure } from "./menuStructureAnalyzer.js";
import { trackChanges } from "./cursorChangeTracker.js";

/**
 * @returns {number}
 */
function getUnifiedEventCount() {
  try {
    if (typeof window.__LIFEOS_GET_UNIFIED_EVENTS__ === "function") {
      return window.__LIFEOS_GET_UNIFIED_EVENTS__().length;
    }
    return (window.__LIFEOS_EVENTS_UNIFIED__ || []).length;
  } catch (_error) {
    return 0;
  }
}

/**
 * @param {ParentNode} [root]
 * @returns {object}
 */
export function buildSystemHealthMap(root) {
  const ui = scanUI(root);
  const structure = analyzeMenuStructure(root);
  const changes = trackChanges(root);

  const boot = {
    state: window.__BOOT_STATE__ || "unknown",
    lock: window.__LIFEOS_BUILD_LOCK__ === true,
    telemetry: window.__LIFEOS_FULL_REPORT__?.telemetry || null
  };

  const session = window.__LIFEOS_SESSION__
    ? {
        status: window.__LIFEOS_SESSION__.status,
        source: window.__LIFEOS_SESSION__.context?.source || "unknown"
      }
    : { status: "guest", source: "unknown" };

  const growth = {
    active: Boolean(window.__LIFEOS_GROWTH_ACTIVE__),
    report: window.__LIFEOS_GROWTH_REPORT__ || null,
    funnel: window.__LIFEOS_FUNNEL_METRICS__ || null,
    landing_stats: window.__LIFEOS_LANDING_STATS__ || null
  };

  const conversionFlow = {
    events_count: getUnifiedEventCount(),
    conversion_summary: window.__LIFEOS_FULL_REPORT__?.conversionSummary || null,
    funnel_conversion_rate: growth.funnel?.conversion_rate ?? null,
    form_present: Boolean(document.getElementById("lead-form"))
  };

  const uiScore = scoreUI(ui, structure);
  const structureScore = structure.ok ? 100 : Math.max(0, 100 - structure.deviations.length * 25 - structure.missing.length * 15);
  const conversionScore = scoreConversion(conversionFlow, growth);

  const overall = Math.round((uiScore + structureScore + conversionScore) / 3);

  return {
    overall_score: overall,
    status: overall >= 80 ? "healthy" : overall >= 55 ? "degraded" : "critical",
    ui: {
      score: uiScore,
      state: ui.ok ? "stable" : "issues_detected",
      issues: ui.issues.length,
      details: ui
    },
    structure: {
      score: structureScore,
      state: structure.chaotic ? "chaotic" : "stable",
      flow_status: structure.flow_status,
      details: structure
    },
    conversion_flow: {
      score: conversionScore,
      state: conversionFlow.form_present ? "wired" : "incomplete",
      details: conversionFlow
    },
    boot: boot,
    session: session,
    growth: growth,
    changes: changes,
    generated_at: Date.now()
  };
}

/**
 * @param {object} ui
 * @param {object} structure
 * @returns {number}
 */
function scoreUI(ui, structure) {
  let score = 100;
  (ui.issues || []).forEach(function (issue) {
    if (issue.severity === "high") {
      score -= 25;
    } else if (issue.severity === "medium") {
      score -= 10;
    } else {
      score -= 3;
    }
  });
  if (structure.chaotic) {
    score -= 20;
  }
  return Math.max(0, Math.min(100, score));
}

/**
 * @param {object} conversionFlow
 * @param {object} growth
 * @returns {number}
 */
function scoreConversion(conversionFlow, growth) {
  let score = 50;
  if (conversionFlow.form_present) {
    score += 25;
  }
  if (growth.active) {
    score += 15;
  }
  if ((conversionFlow.events_count || 0) > 0) {
    score += 10;
  }
  if (window.__BOOT_STATE__ === "PASS") {
    score += 10;
  }
  return Math.max(0, Math.min(100, score));
}
