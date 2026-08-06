/**
 * Revenue Routing Engine — SAFE MODE only.
 * Routes revenue intelligence to advisory consumers; never executes actions.
 */

import { guardRevenueRoute } from "../control/executionGuard.js";

const ROUTED_EVENT = "lifeos:revenue:routed";

/** @type {Set<string>} */
const BLOCKED_DESTINATIONS = new Set([
  "autopilot_execute",
  "dom_modify",
  "api_call",
  "direct_execution",
  "ui_patch"
]);

/** @type {Set<string>} */
const ALLOWED_DESTINATIONS = new Set([
  "nika_advisory",
  "integration_snapshot",
  "dashboard_readonly"
]);

/**
 * @param {object} payload
 * @returns {object}
 */
function sanitizeRevenuePayload(payload) {
  const source = payload && typeof payload === "object" ? payload : {};

  const insights = (source.insights || []).map(function (insight) {
    return Object.assign({}, insight, {
      advisory: true,
      executable: false,
      mode: "safe",
      routed: true
    });
  });

  const recommendations = (source.recommendations || []).map(function (rec) {
    return Object.assign({}, rec, {
      advisory: true,
      executable: false,
      mode: "safe",
      routed: true,
      action: String(rec.action || "").slice(0, 500)
    });
  });

  return Object.assign({}, source, {
    mode: "safe",
    advisory_only: true,
    executable: false,
    insights: insights,
    recommendations: recommendations
  });
}

/**
 * @param {object} payload
 * @returns {object[]}
 */
function buildSafeRoutes(payload) {
  const routes = [];

  if ((payload.insights || []).length > 0) {
    routes.push({
      destination: "nika_advisory",
      allowed: true,
      count: payload.insights.length,
      severity_max: maxSeverity(payload.insights)
    });
  }

  if (payload.revenue || payload.funnels || payload.traffic) {
    routes.push({
      destination: "integration_snapshot",
      allowed: true,
      fields: ["revenue", "funnels", "traffic", "leaks"]
    });
  }

  if ((payload.recommendations || []).length > 0) {
    routes.push({
      destination: "dashboard_readonly",
      allowed: true,
      count: payload.recommendations.length
    });
  }

  return routes.filter(function (route) {
    return ALLOWED_DESTINATIONS.has(route.destination);
  });
}

/**
 * @param {object[]} items
 * @returns {string}
 */
function maxSeverity(items) {
  if (items.some(function (i) { return i.severity === "high"; })) {
    return "high";
  }
  if (items.some(function (i) { return i.severity === "medium"; })) {
    return "medium";
  }
  return "low";
}

/**
 * @param {object} safePayload
 * @param {object[]} routes
 */
function publishAdvisoryTargets(safePayload, routes) {
  try {
    window.__NIKA_REVENUE_ADVISORY__ = {
      insights: safePayload.insights || [],
      recommendations: safePayload.recommendations || [],
      routing: window.__LIFEOS_REVENUE_ROUTING__?.recommendations || [],
      leaks_summary: safePayload.leaks?.summary || null,
      generated_at: safePayload.generated_at || Date.now(),
      mode: "safe",
      executable: false
    };

    window.__LIFEOS_REVENUE_ROUTES__ = {
      safe: true,
      executable: false,
      routes: routes,
      blocked_destinations: Array.from(BLOCKED_DESTINATIONS),
      last_routed_at: Date.now(),
      payload_ref: "window.__LIFEOS_REVENUE_SAFE__"
    };

    window.__LIFEOS_GET_REVENUE_ROUTES__ = function () {
      return window.__LIFEOS_REVENUE_ROUTES__;
    };
  } catch (_error) {
    /* silent */
  }
}

/**
 * Route sanitized revenue payload to safe advisory channels only.
 * @param {object} payload
 * @returns {object}
 */
export function routeRevenuePayload(payload) {
  try {
    const guard = guardRevenueRoute(payload);
    if (!guard.allowed) {
      const blocked = {
        routed: false,
        blocked: true,
        reason: guard.reason || "route_blocked",
        mode: "safe",
        executable: false,
        at: Date.now()
      };

      window.__LIFEOS_REVENUE_ROUTES__ = Object.assign({}, window.__LIFEOS_REVENUE_ROUTES__ || {}, blocked);
      return blocked;
    }

    const safePayload = sanitizeRevenuePayload(payload);
    const routes = buildSafeRoutes(safePayload);

    publishAdvisoryTargets(safePayload, routes);

    const result = {
      routed: true,
      blocked: false,
      mode: "safe",
      advisory_only: true,
      executable: false,
      routes: routes,
      destinations: routes.map(function (r) { return r.destination; }),
      at: Date.now()
    };

    try {
      document.dispatchEvent(new CustomEvent(ROUTED_EVENT, { detail: result }));
    } catch (_error) {
      /* silent */
    }

    return result;
  } catch (_error) {
    return {
      routed: false,
      blocked: true,
      reason: "routing_failed_safely",
      mode: "safe",
      executable: false,
      at: Date.now()
    };
  }
}

/**
 * @param {string} destination
 * @returns {boolean}
 */
export function isRevenueDestinationAllowed(destination) {
  if (BLOCKED_DESTINATIONS.has(destination)) {
    return false;
  }
  return ALLOWED_DESTINATIONS.has(destination);
}

/**
 * @returns {object}
 */
export function getRevenueRoutingSnapshot() {
  return {
    mode: "safe",
    executable: false,
    allowed: Array.from(ALLOWED_DESTINATIONS),
    blocked: Array.from(BLOCKED_DESTINATIONS),
    last: window.__LIFEOS_REVENUE_ROUTES__ || null,
    advisory: window.__NIKA_REVENUE_ADVISORY__ || null
  };
}
