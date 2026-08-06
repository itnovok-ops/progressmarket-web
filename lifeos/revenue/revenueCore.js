/**
 * Revenue Core — read-only data collection for financial intelligence (SAFE MODE).
 */

/**
 * @returns {object}
 */
export function collectRevenueSources() {
  try {
    const session = resolveSession();
    const landing = window.__LIFEOS_LANDING_STATS__ || null;
    const funnel = window.__LIFEOS_FUNNEL_METRICS__ || null;
    const growth = window.__LIFEOS_GROWTH_REPORT__ || null;
    const intent = window.__LIFEOS_INTENT_MAP__ || null;
    const events = getUnifiedEvents();
    const conversion = window.__LIFEOS_CONVERSION_REPORT__ || window.__LIFEOS_CONVERSION__ || null;
    const leadState = window.__LIFEOS_LEAD_STATE__ || null;
    const config = window.__LIFEOS_REVENUE_CONFIG__ || {};

    return {
      session: session,
      landing: landing,
      funnel: funnel,
      growth: growth,
      intent: intent,
      events: events,
      conversion: conversion,
      lead_state: leadState,
      config: config,
      boot_state: window.__BOOT_STATE__ || "unknown",
      growth_active: window.__LIFEOS_GROWTH_ACTIVE__ === true,
      collected_at: Date.now()
    };
  } catch (_error) {
    return {
      session: null,
      landing: null,
      funnel: null,
      growth: null,
      intent: null,
      events: [],
      conversion: null,
      lead_state: null,
      config: {},
      collected_at: Date.now(),
      error: "revenue_collection_failed_safely"
    };
  }
}

/**
 * @returns {object|null}
 */
function resolveSession() {
  try {
    return (
      window.__LIFEOS_SESSION__ ||
      (typeof window.__LIFEOS_GET_SESSION__ === "function" ? window.__LIFEOS_GET_SESSION__() : null)
    );
  } catch (_error) {
    return null;
  }
}

/**
 * @returns {object[]}
 */
function getUnifiedEvents() {
  try {
    if (typeof window.__LIFEOS_GET_UNIFIED_EVENTS__ === "function") {
      const unified = window.__LIFEOS_GET_UNIFIED_EVENTS__();
      if (unified.length > 0) {
        return unified;
      }
    }

    if (window.__LIFEOS_EVENTS_UNIFIED__?.length) {
      return window.__LIFEOS_EVENTS_UNIFIED__;
    }

    return (window.__LIFEOS_EVENTS__ || []).map(function (entry) {
      return {
        event: entry.event,
        type: entry.event,
        timestamp: entry.timestamp,
        metadata: entry.meta || {}
      };
    });
  } catch (_error) {
    return [];
  }
}

/**
 * @param {object} config
 * @returns {number}
 */
export function getAssumedLeadValue(config) {
  const value = config?.assumed_lead_value ?? config?.lead_value ?? 15000;
  return typeof value === "number" && value > 0 ? value : 15000;
}

/**
 * @param {object} config
 * @returns {number}
 */
export function getAssumedTrafficCost(config) {
  const value = config?.assumed_traffic_cost ?? config?.traffic_cost_per_session ?? 50;
  return typeof value === "number" && value >= 0 ? value : 50;
}
