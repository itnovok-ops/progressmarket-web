/**
 * Market Linker — connects Progress Market / CRM data to LifeOS (SAFE MODE).
 * Publishes window.__LIFEOS_TRAFFIC_FOUNDATION__
 */

import { buildSegmentSummary, classifyClient, scoreClient } from "./abcSegmentation.js";
import { mapClientsBatch, mapSessionVisitor } from "./clientMapping.js";
import { bindSegmentsToRevenue } from "./revenueBinding.js";
import { classifyInboundSources, aggregateClientSources } from "./trafficIntake.js";
import { analyzeCohorts } from "./cohortAnalyzer.js";

const FOUNDATION_EVENT = "lifeos:traffic-foundation:update";

let started = false;
let cycleTimer = 0;

/**
 * @returns {object}
 */
function collectFoundationSources() {
  try {
    return {
      session:
        window.__LIFEOS_SESSION__ ||
        (typeof window.__LIFEOS_GET_SESSION__ === "function" ? window.__LIFEOS_GET_SESSION__() : null),
      lead_state: window.__LIFEOS_LEAD_STATE__ || null,
      revenue: window.__LIFEOS_REVENUE_SAFE__ || null,
      events: getUnifiedEvents(),
      config: window.__LIFEOS_TRAFFIC_FOUNDATION_CONFIG__ || {},
      pm_snapshot: window.__LIFEOS_PROGRESS_MARKET_CLIENTS__ || null,
      crm_snapshot: window.__LIFEOS_CRM_CLIENTS__ || null,
      collected_at: Date.now()
    };
  } catch (_error) {
    return {
      session: null,
      lead_state: null,
      revenue: null,
      events: [],
      config: {},
      collected_at: Date.now()
    };
  }
}

/**
 * @returns {object[]}
 */
function getUnifiedEvents() {
  try {
    if (typeof window.__LIFEOS_GET_UNIFIED_EVENTS__ === "function") {
      return window.__LIFEOS_GET_UNIFIED_EVENTS__();
    }
    return window.__LIFEOS_EVENTS_UNIFIED__ || [];
  } catch (_error) {
    return [];
  }
}

/**
 * @param {object} sources
 * @returns {Promise<object[]>}
 */
async function linkExternalCrm(sources) {
  const config = sources.config || {};
  const inline =
    sources.pm_snapshot ||
    sources.crm_snapshot ||
    config.client_snapshot ||
    null;

  if (Array.isArray(inline) && inline.length > 0) {
    return inline;
  }

  const endpoint = config.crm_endpoint || config.pm_clients_endpoint || null;
  if (!endpoint) {
    return [];
  }

  try {
    const headers = { Accept: "application/json" };
    const token = sources.session?.token;
    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    const response = await fetch(endpoint, {
      method: "GET",
      headers: headers,
      credentials: "same-origin"
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data.clients)) {
      return data.clients;
    }
    if (Array.isArray(data.items)) {
      return data.items;
    }
    return [];
  } catch (_error) {
    return [];
  }
}

/**
 * @param {object[]} externalClients
 * @param {object} sources
 * @returns {object[]}
 */
function buildClientUniverse(externalClients, sources) {
  const context = {
    session_id: sources.session?.user?.id || null,
    user_id: sources.session?.user?.id || null,
    source: sources.session?.context?.source || "direct",
    session: sources.session
  };

  if (externalClients.length > 0) {
    return mapClientsBatch(externalClients, context);
  }

  const visitor = mapSessionVisitor(sources.session, sources.lead_state);
  return visitor.lifeos_id ? [visitor] : [];
}

/**
 * @param {object[]} mappedClients
 * @param {object[]} externalRaw
 * @returns {object[]}
 */
function enrichClientsWithAbc(mappedClients, externalRaw) {
  const rawById = {};
  (externalRaw || []).forEach(function (row) {
    const id = row.id ?? row.client_id;
    if (id != null) {
      rawById[String(id)] = row;
    }
  });

  return mappedClients.map(function (mapped) {
    const raw = mapped.pm_client_id ? rawById[mapped.pm_client_id] : {};
    const merged = Object.assign({}, raw, mapped);
    return Object.assign({}, merged, {
      abc_segment: classifyClient(merged),
      abc_scores: scoreClient(merged)
    });
  });
}

/**
 * @param {object} segments
 * @param {object} traffic
 * @param {object} revenueBinding
 * @param {object} cohorts
 * @param {number} clientCount
 * @returns {object[]}
 */
function buildFoundationInsights(segments, traffic, revenueBinding, cohorts, clientCount) {
  const insights = [];

  if (clientCount >= 2000) {
    insights.push({
      type: "scale",
      priority: "HIGH",
      message: "Progress Market client base (" + clientCount + "+) linked to LifeOS identity map.",
      advisory: true
    });
  } else if (clientCount === 0) {
    insights.push({
      type: "data_gap",
      priority: "MEDIUM",
      message:
        "No external CRM snapshot detected. Inject __LIFEOS_PROGRESS_MARKET_CLIENTS__ or configure crm_endpoint.",
      advisory: true
    });
  }

  const aShare = segments.distribution?.A || 0;
  if (aShare >= 0.2) {
    insights.push({
      type: "segment",
      priority: "HIGH",
      message:
        "A-segment share " + Math.round(aShare * 100) + "% — prioritize retention routing in future phases.",
      advisory: true
    });
  }

  const primary = traffic.primary_source || "direct";
  insights.push({
    type: "traffic",
    priority: "MEDIUM",
    message:
      "Primary inbound source: " + (traffic.primary_label || primary) + ". Foundation ready for future routing.",
    advisory: true
  });

  if (revenueBinding.totals?.annual_potential) {
    insights.push({
      type: "revenue",
      priority: "MEDIUM",
      message:
        "Estimated annual revenue potential: " +
        revenueBinding.totals.annual_potential.toLocaleString("ru-RU") +
        " " +
        (revenueBinding.totals.currency || "RUB"),
      advisory: true
    });
  }

  if (cohorts.engagement_trend?.direction === "falling") {
    insights.push({
      type: "cohort",
      priority: "LOW",
      message: "7-day engagement trend is falling — monitor before traffic optimization.",
      advisory: true
    });
  }

  return insights;
}

/**
 * @returns {Promise<object>}
 */
export async function runTrafficFoundationCycle() {
  try {
    const sources = collectFoundationSources();
    const externalRaw = await linkExternalCrm(sources);
    const mapped = buildClientUniverse(externalRaw, sources);
    const clients = enrichClientsWithAbc(mapped, externalRaw);
    const segments = buildSegmentSummary(clients);
    const trafficSources = classifyInboundSources(sources.session, sources.events);
    const clientTraffic = aggregateClientSources(clients);
    const revenuePotential = bindSegmentsToRevenue(segments, sources.revenue, sources.config);
    const cohorts = analyzeCohorts(clients, sources.events);
    const linkedCount = Math.max(clients.length, externalRaw.length);

    const payload = {
      ok: true,
      mode: "safe",
      advisory_only: true,
      executable: false,
      segments: segments,
      clients: {
        total: clients.length,
        mapped: clients.slice(0, 100),
        external_loaded: externalRaw.length,
        identity_coverage:
          clients.length > 0
            ? Number(
                (
                  clients.filter(function (c) {
                    return c.pm_client_id;
                  }).length / clients.length
                ).toFixed(4)
              )
            : 0
      },
      revenue_potential: revenuePotential,
      traffic_sources: Object.assign({}, trafficSources, { client_aggregate: clientTraffic }),
      cohorts: cohorts,
      insights: buildFoundationInsights(
        segments,
        trafficSources,
        revenuePotential,
        cohorts,
        linkedCount
      ),
      generated_at: Date.now()
    };

    publishFoundationState(payload);
    return payload;
  } catch (_error) {
    const emptySegments = buildSegmentSummary([]);
    const fallback = {
      ok: false,
      mode: "safe",
      segments: emptySegments,
      clients: { total: 0, mapped: [], external_loaded: 0 },
      revenue_potential: bindSegmentsToRevenue(emptySegments, null),
      traffic_sources: classifyInboundSources(null, []),
      insights: [],
      generated_at: Date.now()
    };
    publishFoundationState(fallback);
    return fallback;
  }
}

/**
 * @param {object} payload
 */
function publishFoundationState(payload) {
  try {
    window.__LIFEOS_TRAFFIC_FOUNDATION__ = {
      segments: payload.segments,
      clients: payload.clients,
      revenue_potential: payload.revenue_potential,
      traffic_sources: payload.traffic_sources,
      insights: payload.insights
    };

    window.__LIFEOS_TRAFFIC_FOUNDATION_FULL__ = payload;
    window.__LIFEOS_GET_TRAFFIC_FOUNDATION__ = function () {
      return window.__LIFEOS_TRAFFIC_FOUNDATION__;
    };
    window.__LIFEOS_RUN_TRAFFIC_FOUNDATION_CYCLE__ = runTrafficFoundationCycle;

    document.dispatchEvent(new CustomEvent(FOUNDATION_EVENT, { detail: payload }));
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {{ intervalMs?: number }} [options]
 * @returns {Promise<object>}
 */
export async function startTrafficFoundation(options) {
  const interval = options?.intervalMs || 120000;

  if (!started) {
    started = true;
    cycleTimer = window.setInterval(function () {
      runTrafficFoundationCycle();
    }, interval);

    document.addEventListener("lifeos:session:update", function () {
      runTrafficFoundationCycle();
    });
    document.addEventListener("lifeos:revenue:update", function () {
      runTrafficFoundationCycle();
    });
  }

  return runTrafficFoundationCycle();
}

/**
 * Stop traffic foundation timers.
 */
export function stopTrafficFoundation() {
  if (cycleTimer) {
    window.clearInterval(cycleTimer);
    cycleTimer = 0;
  }
  started = false;
}
