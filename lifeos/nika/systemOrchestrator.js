/**
 * Nika System Orchestrator — combines insights, anomalies, decisions into global state.
 * Consolidation v2: cycle governor, trigger filter, no audit-in-cycle recursion.
 */

import { collectDataSources, resolveSystemHealth, summarizeAgents } from "./nikaCore.js";
import { generateInsights } from "./insightEngine.js";
import { detectAnomalies } from "./anomalyDetector.js";
import { produceDecisions } from "./decisionEngine.js";
import { generateRecommendations } from "./recommendationEngine.js";
import { runCompetitiveCycleSync, startCompetitiveIntel } from "../competitive/competitiveCore.js";
import { startSystemAudit } from "../audit/systemAudit.js";
import { throttleCycle } from "../integration/loopThrottle.js";
import { getIntervalFor } from "../control/loadBalancer.js";

const NIKA_EVENT = "lifeos:nika:update";
const NIKA_COOLDOWN_MS = 8000;
const ALLOWED_SOURCES = new Set(["timer", "boot", "session", "agent", "control", "manual", "orchestrator"]);

let started = false;
let cycleTimer = 0;
let cycleInProgress = false;
let lastCycleFinishedAt = 0;

/**
 * @param {string} [source]
 * @returns {{ ok: boolean, reason?: string }}
 */
function canRunNikaCycle(source) {
  const src = source || "orchestrator";

  if (cycleInProgress) {
    return { ok: false, reason: "cycle_in_progress" };
  }

  if (src === "observer" || src === "audit") {
    return { ok: false, reason: "trigger_blocked" };
  }

  if (!ALLOWED_SOURCES.has(src)) {
    return { ok: false, reason: "trigger_not_allowed" };
  }

  const now = Date.now();
  if (now - lastCycleFinishedAt < NIKA_COOLDOWN_MS && src !== "manual") {
    return { ok: false, reason: "cooldown" };
  }

  return { ok: true };
}

/**
 * @returns {object}
 */
function getConsolidatedIntervals() {
  const reduced = window.__LIFEOS_OBSERVABILITY_MODE__ === "REDUCED";
  if (reduced) {
    return { nika: 30000, audit: 90000, competitive: 120000 };
  }
  return {
    nika: getIntervalFor("nika") || 15000,
    audit: getIntervalFor("audit") || 45000,
    competitive: getIntervalFor("competitive") || 60000
  };
}

/**
 * @param {string} [source]
 * @returns {object}
 */
export function runNikaCycle(source) {
  if (window.__LIFEOS_ULTRA_PATCH__ && typeof window.__LIFEOS_RUN_NIKA_SAFE__ === "function") {
    let result;
    window.__LIFEOS_RUN_NIKA_SAFE__(function () {
      result = runNikaCycleBody(source);
    });
    return result !== undefined ? result : window.__NIKA_REPORT__ || { ok: true, skipped: true, reason: "nika_ultra_lock" };
  }
  return runNikaCycleBody(source);
}

/**
 * @param {string} [source]
 * @returns {object}
 */
function runNikaCycleBody(source) {
  const gate = canRunNikaCycle(source);
  if (!gate.ok) {
    return window.__NIKA_REPORT__ || { ok: true, skipped: true, reason: gate.reason };
  }

  const cycle = throttleCycle("nika", source || "orchestrator");
  if (!cycle.allowed) {
    return window.__NIKA_REPORT__ || { ok: true, skipped: true, reason: cycle.reason };
  }

  cycleInProgress = true;

  try {
    const sources = collectDataSources();
    const competitive = runCompetitiveCycleSync(sources);
    sources.competitive = competitive;
    const systemHealth = resolveSystemHealth(sources);
    const agentsStatus = summarizeAgents(sources);
    const insights = generateInsights(sources);
    const anomalies = detectAnomalies(sources);
    const decisions = produceDecisions(insights, anomalies, sources);
    const recommendations = generateRecommendations(insights, anomalies, decisions, sources);

    const state = {
      mode: "advisory",
      governed: true,
      systemHealth: systemHealth,
      agents: agentsStatus,
      insights: insights,
      decisions: decisions,
      anomalies: anomalies,
      recommendations: recommendations,
      sources_snapshot: {
        has_landing_stats: Boolean(sources.landing_stats),
        has_growth_report: Boolean(sources.growth_report),
        has_funnel: Boolean(sources.funnel),
        has_session: Boolean(sources.session),
        has_competitive: Boolean(sources.competitive),
        events_count: sources.events_count || 0
      },
      updated_at: Date.now()
    };

    const report = {
      ok: systemHealth !== "critical",
      mode: "advisory",
      governed: true,
      systemHealth: mapHealthLabel(systemHealth),
      agents: agentsStatus,
      insights: insights,
      anomalies: anomalies,
      decisions: decisions,
      recommendations: recommendations,
      competitive: {
        marketScore: competitive.marketScore,
        gaps_count: (competitive.gaps || []).length,
        recommendations_count: (competitive.recommendations || []).length,
        competitors_analyzed: competitive.competitors_analyzed || 0
      },
      summary: buildSummary(systemHealth, insights, anomalies, decisions),
      generated_at: Date.now()
    };

    window.__NIKA_STATE__ = state;
    window.__NIKA_DECISIONS__ = decisions;
    window.__NIKA_REPORT__ = report;

    const uiLayer = window.__ENQUEUE_APP_INTENT__;
    if (typeof uiLayer === "function") {
      decisions.forEach(function (decision) {
        uiLayer({
          type: "ACTION",
          source: "nika",
          payload: {
            meta: {
              code: decision.code || decision.id,
              type: decision.type || "advisory",
              target: decision.target || null,
              priority: decision.priority,
              message: decision.message || decision.summary
            }
          }
        });
      });
    }

    window.__NIKA_GET_STATE__ = function () {
      return window.__NIKA_STATE__;
    };
    window.__NIKA_GET_DECISIONS__ = function () {
      return window.__NIKA_DECISIONS__;
    };
    window.__NIKA_GET_REPORT__ = function () {
      return runNikaCycle("manual");
    };
    window.__NIKA_RUN_CYCLE__ = function (src) {
      return runNikaCycle(src || "manual");
    };

    document.dispatchEvent(
      new CustomEvent(NIKA_EVENT, { detail: { state: state, report: report } })
    );

    return report;
  } catch (_error) {
    const fallback = {
      ok: false,
      mode: "advisory",
      systemHealth: "WARN",
      insights: [],
      anomalies: [],
      decisions: [],
      recommendations: [],
      generated_at: Date.now()
    };
    window.__NIKA_STATE__ = { mode: "advisory", systemHealth: "degraded", insights: [], decisions: [] };
    window.__NIKA_DECISIONS__ = [];
    window.__NIKA_REPORT__ = fallback;
    return fallback;
  } finally {
    cycleInProgress = false;
    lastCycleFinishedAt = Date.now();
  }
}

/**
 * @param {string} health
 * @returns {string}
 */
function mapHealthLabel(health) {
  if (health === "healthy") {
    return "OK";
  }
  if (health === "degraded") {
    return "WARN";
  }
  return "FAIL";
}

/**
 * @param {string} systemHealth
 * @param {object[]} insights
 * @param {object[]} anomalies
 * @param {object[]} decisions
 * @returns {string}
 */
function buildSummary(systemHealth, insights, anomalies, decisions) {
  const high = decisions.filter(function (d) { return d.priority === "HIGH"; }).length;
  return (
    "Nika advisory (governed): system " +
    systemHealth +
    ", " +
    insights.length +
    " insight(s), " +
    anomalies.length +
    " anomaly(ies), " +
    high +
    " high-priority decision(s)"
  );
}

/**
 * @param {{ intervalMs?: number }} [options]
 */
export function startNika(options) {
  if (started) {
    return runNikaCycle("boot");
  }

  started = true;
  const intervals = getConsolidatedIntervals();
  const nikaInterval = options?.intervalMs || intervals.nika;
  const auditInterval = options?.auditIntervalMs || intervals.audit;
  const competitiveInterval = options?.competitiveIntervalMs || intervals.competitive;

  startCompetitiveIntel({ intervalMs: competitiveInterval });
  startSystemAudit({ intervalMs: auditInterval, probeStorage: true });
  runNikaCycle("boot");

  cycleTimer = window.setInterval(function () {
    runNikaCycle("timer");
  }, nikaInterval);

  document.addEventListener("lifeos:session:update", function () {
    runNikaCycle("session");
  });

  document.addEventListener("lifeos:agents:update", function (event) {
    const report = event.detail?.report;
    const alerts = report?.alerts || [];
    const hasHigh = alerts.some(function (a) { return a.severity === "high"; });
    if (hasHigh) {
      runNikaCycle("agent");
    }
  });

  return window.__NIKA_REPORT__;
}

/**
 * Stop Nika cycle timer.
 */
export function stopNika() {
  if (cycleTimer) {
    window.clearInterval(cycleTimer);
    cycleTimer = 0;
  }
  started = false;
}
