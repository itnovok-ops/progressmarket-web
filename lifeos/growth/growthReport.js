/**
 * Growth debug report — aggregates client analytics state.
 */

import { getFunnelMetrics } from "./funnelEngine.js";
import { getIntentMap } from "./intentEngineClient.js";
import { getLandingStats } from "./landingStatsEngine.js";

const counters = {
  eventsStored: 0,
  sessionsTracked: 0,
  funnelsCalculated: 0,
  conversionsRecorded: 0
};

export function recordEventStored() {
  counters.eventsStored += 1;
  publishGrowthReport();
}

export function recordSessionTracked() {
  counters.sessionsTracked = Math.max(counters.sessionsTracked, 1);
  publishGrowthReport();
}

export function recordFunnelCalculated() {
  counters.funnelsCalculated += 1;
  publishGrowthReport();
}

export function recordConversion() {
  counters.conversionsRecorded += 1;
  publishGrowthReport();
}

export function publishGrowthReport() {
  try {
    const intent = getIntentMap();
    const funnel = getFunnelMetrics();
    const landing = getLandingStats();
    const growthEvents = window.__LIFEOS_GROWTH_EVENTS__ || [];

    const report = {
      eventsStored: Math.max(counters.eventsStored, growthEvents.length),
      sessionsTracked: Math.max(counters.sessionsTracked, landing.sessions || 0),
      funnelsCalculated: Math.max(counters.funnelsCalculated, 1),
      conversionsRecorded: Math.max(
        counters.conversionsRecorded,
        landing.counters?.formSubmits || 0
      ),
      intentDistribution: intent.distribution || { LOW: 0, MEDIUM: 0, HIGH: 0 },
      funnel: {
        weakest_stage: funnel.weakest_stage,
        conversion_rate: funnel.conversion_rate
      },
      landing_id: landing.landing_id,
      active: Boolean(window.__LIFEOS_GROWTH_ACTIVE__),
      generated_at: Date.now()
    };

    if (typeof window !== "undefined") {
      window.__LIFEOS_GROWTH_REPORT__ = report;
    }

    return report;
  } catch (_error) {
    const fallback = {
      eventsStored: 0,
      sessionsTracked: 0,
      funnelsCalculated: 0,
      intentDistribution: { LOW: 0, MEDIUM: 0, HIGH: 0 },
      generated_at: Date.now()
    };

    if (typeof window !== "undefined") {
      window.__LIFEOS_GROWTH_REPORT__ = fallback;
    }

    return fallback;
  }
}

export function getGrowthReport() {
  return publishGrowthReport();
}

if (typeof window !== "undefined") {
  publishGrowthReport();
}
