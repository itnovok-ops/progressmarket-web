/**
 * Routing data collector — read-only inputs from Traffic Foundation, SuperSite, Revenue SAFE, Growth.
 */

import { buildSegmentSummary } from "../traffic-foundation/abcSegmentation.js";
import { bindSegmentsToRevenue } from "../traffic-foundation/revenueBinding.js";
import { mapSessionVisitor } from "../traffic-foundation/clientMapping.js";

/**
 * @returns {object[]}
 */
function getEvents() {
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
 * @param {object[]} events
 * @returns {object[]}
 */
function buildSyntheticClients(events, session, leadState) {
  const clients = [];
  const visitor = mapSessionVisitor(session, leadState);
  const eventCounts = countEvents(events);

  clients.push({
    id: visitor.lifeos_id,
    pm_client_id: visitor.pm_client_id,
    source: visitor.source,
    engagement_score: leadState?.score ?? eventCounts.engagement_score,
    activity_score: eventCounts.activity_score,
    revenue_total: leadState?.estimated_value ?? 0,
    sessions_30d: 1,
    nika_score: leadState?.score ?? 0
  });

  const pmClients = window.__LIFEOS_PM_CLIENTS__ || window.__PROGRESS_MARKET_CLIENTS__;
  if (Array.isArray(pmClients)) {
    pmClients.forEach(function (client) {
      clients.push(client);
    });
  }

  return clients;
}

/**
 * @param {object[]} events
 * @returns {object}
 */
function countEvents(events) {
  let cta = 0;
  let formStart = 0;
  let formSubmit = 0;
  let scroll = 0;
  let video = 0;

  events.forEach(function (event) {
    const name = event.event || event.type || "";
    if (name.indexOf("scroll") !== -1) {
      scroll += 1;
    }
    if (name === "cta_click") {
      cta += 1;
    }
    if (name === "form_focus" || name === "form_start") {
      formStart += 1;
    }
    if (name.indexOf("form_submit") !== -1 || name === "form_submit") {
      formSubmit += 1;
    }
    if (name.indexOf("video") !== -1) {
      video += 1;
    }
  });

  const activity = Math.min(100, events.length * 4 + scroll * 2);
  const engagement = Math.min(100, cta * 15 + formStart * 20 + video * 10 + scroll * 5);

  return {
    cta_clicks: cta,
    form_starts: formStart,
    form_submits: formSubmit,
    scroll_events: scroll,
    video_events: video,
    activity_score: activity,
    engagement_score: engagement
  };
}

/**
 * @returns {object}
 */
export function collectRoutingInputs() {
  try {
    const session =
      window.__LIFEOS_SESSION__ ||
      (typeof window.__LIFEOS_GET_SESSION__ === "function" ? window.__LIFEOS_GET_SESSION__() : null);
    const leadState = window.__LIFEOS_LEAD_STATE__ || null;
    const revenueSafe = window.__LIFEOS_REVENUE_SAFE__ || null;
    const revenueFull = window.__LIFEOS_REVENUE_SAFE_FULL__ || null;
    const events = getEvents();
    const eventCounts = countEvents(events);

    const clients = buildSyntheticClients(events, session, leadState);
    const segmentSummary = buildSegmentSummary(clients);
    const revenueBinding = bindSegmentsToRevenue(segmentSummary, revenueSafe, window.__LIFEOS_REVENUE_CONFIG__);

    return {
      session: session,
      lead_state: leadState,
      revenue_safe: revenueSafe,
      revenue_full: revenueFull,
      growth: {
        report: window.__LIFEOS_GROWTH_REPORT__ || null,
        landing_stats: window.__LIFEOS_LANDING_STATS__ || null,
        funnel_metrics: window.__LIFEOS_FUNNEL_METRICS__ || null,
        pipeline: window.__LIFEOS_GROWTH_PIPELINE__ || null,
        active: window.__LIFEOS_GROWTH_ACTIVE__ === true
      },
      events: events,
      event_counts: eventCounts,
      segment_summary: segmentSummary,
      revenue_binding: revenueBinding,
      conversion: window.__LIFEOS_CONVERSION_REPORT__ || window.__LIFEOS_CONVERSION__ || null,
      intent: window.__LIFEOS_INTENT_MAP__ || window.__LIFEOS_INTENT__ || null,
      landing_id: "wb-fbs-v1",
      collected_at: Date.now()
    };
  } catch (_error) {
    return {
      session: null,
      lead_state: null,
      revenue_safe: null,
      events: [],
      segment_summary: null,
      revenue_binding: null,
      collected_at: Date.now(),
      error: "routing_input_collection_failed_safely"
    };
  }
}
