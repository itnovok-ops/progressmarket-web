/**
 * Revenue Orchestrator — aggregates revenue intelligence (SAFE MODE, read-only).
 */

import { collectRevenueSources } from "./revenueCore.js";
import { analyzeFunnel } from "./funnelAnalyzer.js";
import { calculateRoi } from "./roiCalculator.js";
import { attributeTraffic } from "./trafficAttribution.js";
import { detectLeaks, summarizeLeaks } from "./leakDetector.js";
import { generateRevenueInsights, toRecommendations } from "./revenueInsights.js";
import { routeRevenuePayload, getRevenueRoutingSnapshot } from "./revenueRoutingEngine.js";
import { runRevenueRoutingCycle } from "../revenue-routing/routingEngine.js";
import { guardRevenueCycle } from "../control/executionGuard.js";

const REVENUE_EVENT = "lifeos:revenue:update";
const FUNNEL_MILESTONES = new Set(["cta_click", "form_start", "form_submit", "form_focus"]);

let started = false;
let cycleTimer = 0;
let eventWatchTimer = 0;
let lastEventCount = 0;
let debounceTimer = 0;

/**
 * @returns {object}
 */
export function runRevenueCycle() {
  try {
    const guard = guardRevenueCycle("cycle");
    if (!guard.allowed) {
      const skipped = window.__LIFEOS_REVENUE_SAFE_FULL__ || {
        ok: true,
        mode: "safe",
        advisory_only: true,
        executable: false,
        skipped: true,
        reason: guard.reason,
        generated_at: Date.now()
      };
      publishRevenueState(skipped);
      return skipped;
    }

    const sources = collectRevenueSources();
    const funnels = analyzeFunnel(sources);
    const traffic = attributeTraffic(sources);
    const revenue = calculateRoi(sources, funnels, traffic);
    const leaks = detectLeaks(sources, funnels, traffic);
    const insights = generateRevenueInsights(revenue, funnels, traffic, leaks);
    const recommendations = toRecommendations(insights);

    const payload = {
      ok: true,
      mode: "safe",
      advisory_only: true,
      executable: false,
      revenue: revenue,
      funnels: funnels,
      traffic: traffic,
      leaks: {
        items: leaks,
        summary: summarizeLeaks(leaks)
      },
      insights: insights,
      recommendations: recommendations,
      sources_snapshot: {
        growth_active: sources.growth_active,
        events_count: sources.events?.length || 0,
        landing_id: sources.landing?.landing_id || "wb-fbs-v1"
      },
      generated_at: Date.now()
    };

    publishRevenueState(payload);
    runRevenueRoutingCycle();
    routeRevenuePayload(payload);
    return payload;
  } catch (_error) {
    const fallback = {
      ok: false,
      mode: "safe",
      revenue: null,
      funnels: null,
      traffic: null,
      leaks: { items: [], summary: { total: 0 } },
      recommendations: [],
      generated_at: Date.now()
    };
    publishRevenueState(fallback);
    return fallback;
  }
}

/**
 * @param {object} payload
 */
function publishRevenueState(payload) {
  try {
    window.__LIFEOS_REVENUE_SAFE__ = {
      revenue: payload.revenue,
      funnels: payload.funnels,
      traffic: payload.traffic,
      leaks: payload.leaks,
      recommendations: payload.recommendations
    };

    window.__LIFEOS_REVENUE_SAFE_FULL__ = payload;
    window.__LIFEOS_GET_REVENUE_SAFE__ = function () {
      return window.__LIFEOS_REVENUE_SAFE__;
    };
    window.__LIFEOS_RUN_REVENUE_CYCLE__ = runRevenueCycle;
    window.__LIFEOS_GET_REVENUE_ROUTING__ = getRevenueRoutingSnapshot;

    document.dispatchEvent(new CustomEvent(REVENUE_EVENT, { detail: payload }));
  } catch (_error) {
    /* silent */
  }
}

/**
 * Debounced refresh for funnel milestone detection.
 */
function scheduleRevenueRefresh() {
  if (debounceTimer) {
    window.clearTimeout(debounceTimer);
  }
  debounceTimer = window.setTimeout(function () {
    runRevenueCycle();
  }, 1500);
}

/**
 * Watch event buffers for major funnel milestones (read-only poll).
 */
function installFunnelEventWatch() {
  if (eventWatchTimer) {
    return;
  }

  eventWatchTimer = window.setInterval(function () {
    const events =
      window.__LIFEOS_EVENTS_UNIFIED__ ||
      window.__LIFEOS_GET_UNIFIED_EVENTS__?.() ||
      [];

    if (events.length <= lastEventCount) {
      return;
    }

    const newEvents = events.slice(lastEventCount);
    lastEventCount = events.length;

    const milestone = newEvents.some(function (e) {
      return FUNNEL_MILESTONES.has(e.type || e.event);
    });

    if (milestone) {
      scheduleRevenueRefresh();
    }
  }, 2000);
}

/**
 * @param {{ intervalMs?: number }} [options]
 * @returns {object}
 */
export function startRevenueIntelligence(options) {
  const interval = options?.intervalMs || 60000;

  if (!started) {
    started = true;

    cycleTimer = window.setInterval(runRevenueCycle, interval);

    document.addEventListener("lifeos:session:update", scheduleRevenueRefresh);
    document.addEventListener("lifeos:integration:update", scheduleRevenueRefresh);

    installFunnelEventWatch();
  }

  return runRevenueCycle();
}

/**
 * Stop revenue intelligence timers.
 */
export function stopRevenueIntelligence() {
  if (cycleTimer) {
    window.clearInterval(cycleTimer);
    cycleTimer = 0;
  }
  if (eventWatchTimer) {
    window.clearInterval(eventWatchTimer);
    eventWatchTimer = 0;
  }
  if (debounceTimer) {
    window.clearTimeout(debounceTimer);
    debounceTimer = 0;
  }
  started = false;
}
