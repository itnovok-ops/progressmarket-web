/**
 * Revenue Routing Engine — core decision intelligence (SAFE MODE).
 * Analyzes traffic, offers, segments, and conversion paths without executing any actions.
 */

import { guardRevenueCycle, guardRevenueRoute } from "../control/executionGuard.js";
import { collectRoutingInputs } from "./routingData.js";
import { scoreOffers } from "./offerScoring.js";
import { allocateTraffic } from "./trafficAllocator.js";
import { routeSegments } from "./segmentRouter.js";
import { buildRevenueDecisionMap } from "./revenueDecisionMap.js";
import { optimizeConversions, toRoutingRecommendations } from "./conversionOptimizer.js";

const ROUTING_EVENT = "lifeos:revenue-routing:update";

let started = false;
let cycleTimer = 0;

/**
 * @returns {object}
 */
export function runRevenueRoutingCycle() {
  try {
    const guard = guardRevenueCycle("routing");
    if (!guard.allowed) {
      const skipped = window.__LIFEOS_REVENUE_ROUTING__ || buildEmptyRouting();
      skipped.skipped = true;
      skipped.reason = guard.reason;
      publishRoutingState(skipped);
      return skipped;
    }

    const inputs = collectRoutingInputs();
    const offers = scoreOffers(inputs);
    const traffic_allocation = allocateTraffic(inputs);
    const routing = routeSegments(inputs, offers, traffic_allocation);
    const revenue_map = buildRevenueDecisionMap(inputs, offers, routing);
    const optimization = optimizeConversions(inputs, offers, routing, revenue_map);
    const recommendations = toRoutingRecommendations(optimization);

    const payload = {
      ok: true,
      mode: "safe",
      advisory_only: true,
      executable: false,
      routing: routing,
      offers: offers,
      traffic_allocation: traffic_allocation,
      revenue_map: revenue_map,
      recommendations: recommendations,
      optimization: optimization,
      inputs_snapshot: {
        events_count: inputs.events?.length || 0,
        segment_distribution: inputs.segment_summary?.distribution || null,
        growth_active: inputs.growth?.active === true
      },
      generated_at: Date.now()
    };

    const routeGuard = guardRevenueRoute({ recommendations: recommendations });
    if (!routeGuard.allowed) {
      payload.blocked = true;
      payload.block_reason = routeGuard.reason;
    }

    publishRoutingState(payload);
    return payload;
  } catch (_error) {
    const fallback = buildEmptyRouting();
    fallback.ok = false;
    publishRoutingState(fallback);
    return fallback;
  }
}

/**
 * @returns {object}
 */
function buildEmptyRouting() {
  return {
    ok: true,
    mode: "safe",
    advisory_only: true,
    executable: false,
    routing: null,
    offers: null,
    traffic_allocation: null,
    revenue_map: null,
    recommendations: [],
    generated_at: Date.now()
  };
}

/**
 * @param {object} payload
 */
function publishRoutingState(payload) {
  try {
    window.__LIFEOS_REVENUE_ROUTING__ = {
      routing: payload.routing,
      offers: payload.offers,
      traffic_allocation: payload.traffic_allocation,
      revenue_map: payload.revenue_map,
      recommendations: payload.recommendations
    };

    window.__LIFEOS_REVENUE_ROUTING_FULL__ = payload;
    window.__LIFEOS_GET_REVENUE_ROUTING__ = function () {
      return window.__LIFEOS_REVENUE_ROUTING__;
    };
    window.__LIFEOS_RUN_REVENUE_ROUTING__ = runRevenueRoutingCycle;

    document.dispatchEvent(new CustomEvent(ROUTING_EVENT, { detail: payload }));
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {{ intervalMs?: number }} [options]
 * @returns {object}
 */
export function startRevenueRouting(options) {
  const interval = options?.intervalMs || 90000;

  if (!started) {
    started = true;
    cycleTimer = window.setInterval(runRevenueRoutingCycle, interval);
    document.addEventListener("lifeos:revenue:update", function () {
      runRevenueRoutingCycle();
    });
  }

  return runRevenueRoutingCycle();
}

/**
 * Stop routing timers.
 */
export function stopRevenueRouting() {
  if (cycleTimer) {
    window.clearInterval(cycleTimer);
    cycleTimer = 0;
  }
  started = false;
}
