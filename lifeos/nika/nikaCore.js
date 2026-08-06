/**
 * Nika data snapshot — read-only inputs from LifeOS globals.
 */

/**
 * @returns {object}
 */
export function collectDataSources() {
  try {
    return {
      agents: window.__LIFEOS_AGENTS__ || window.__LIFEOS_AGENT_REPORT__ || null,
      agent_report: window.__LIFEOS_AGENT_REPORT__ || null,
      landing_stats: window.__LIFEOS_LANDING_STATS__ || null,
      growth_report: window.__LIFEOS_GROWTH_REPORT__ || null,
      session: window.__LIFEOS_SESSION__ || (typeof window.__LIFEOS_GET_SESSION__ === "function" ? window.__LIFEOS_GET_SESSION__() : null),
      funnel: window.__LIFEOS_FUNNEL_METRICS__ || null,
      intent: window.__LIFEOS_INTENT_MAP__ || null,
      observer: window.__LIFEOS_OBSERVER_REPORT__ || null,
      revenue: window.__LIFEOS_REVENUE_SAFE__ || null,
      revenue_routes: window.__LIFEOS_REVENUE_ROUTES__ || null,
      revenue_routing: window.__LIFEOS_REVENUE_ROUTING__ || null,
      competitive: window.__LIFEOS_COMPETITIVE__ || null,
      boot_state: window.__BOOT_STATE__ || "unknown",
      growth_active: window.__LIFEOS_GROWTH_ACTIVE__ === true,
      events_count: getUnifiedEventCount(),
      collected_at: Date.now()
    };
  } catch (_error) {
    return {
      agents: null,
      landing_stats: null,
      growth_report: null,
      session: null,
      funnel: null,
      collected_at: Date.now(),
      error: "data_collection_failed_safely"
    };
  }
}

/**
 * @param {object} sources
 * @returns {string}
 */
export function resolveSystemHealth(sources) {
  const agentHealth = sources.agent_report?.systemHealth;
  if (agentHealth === "FAIL") {
    return "critical";
  }
  if (agentHealth === "WARN") {
    return "degraded";
  }
  if (sources.boot_state !== "PASS") {
    return "degraded";
  }
  if (sources.observer?.system_health?.status === "critical") {
    return "critical";
  }
  if (sources.observer?.system_health?.status === "degraded") {
    return "degraded";
  }
  return "healthy";
}

/**
 * @param {object} sources
 * @returns {object}
 */
export function summarizeAgents(sources) {
  const report = sources.agent_report;
  const registry = sources.agents;

  if (report) {
    return {
      systemHealth: report.systemHealth || "OK",
      count: Object.keys(report.agents || {}).length,
      alerts: report.alerts || [],
      by_system: report.by_system || {}
    };
  }

  if (registry?.agents) {
    return {
      systemHealth: "OK",
      count: registry.count || Object.keys(registry.agents).length,
      alerts: [],
      by_system: {}
    };
  }

  return { systemHealth: "WARN", count: 0, alerts: [], by_system: {} };
}

/**
 * @returns {number}
 */
function getUnifiedEventCount() {
  try {
    if (typeof window.__LIFEOS_GET_UNIFIED_EVENTS__ === "function") {
      return window.__LIFEOS_GET_UNIFIED_EVENTS__().length;
    }
    const unified = window.__LIFEOS_EVENTS_UNIFIED__;
    if (Array.isArray(unified)) {
      return unified.length;
    }
  } catch (_error) {
    /* silent */
  }
  return 0;
}
