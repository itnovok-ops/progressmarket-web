/**
 * Landing performance snapshot for the active session.
 * Publishes window.__LIFEOS_LANDING_STATS__
 */

import { getPageContext } from "./eventSchema.js";
import { getIntentMap } from "./intentEngineClient.js";
import { getFunnelMetrics } from "./funnelEngine.js";

const counters = {
  visits: 0,
  scrolls: 0,
  videoViews: 0,
  videoClicks: 0,
  ctaClicks: 0,
  formStarts: 0,
  formSubmits: 0
};

/**
 * @param {string} eventName
 */
export function ingestLandingEvent(eventName) {
  try {
    if (eventName === "visit") counters.visits += 1;
    if (eventName === "scroll") counters.scrolls += 1;
    if (eventName === "video_view" || eventName === "video_play") counters.videoViews += 1;
    if (eventName === "video_click") counters.videoClicks += 1;
    if (eventName === "cta_click") counters.ctaClicks += 1;
    if (eventName === "form_start" || eventName === "form_focus") counters.formStarts += 1;
    if (eventName === "form_submit") counters.formSubmits += 1;

    publishLandingStats();
  } catch (_error) {
    /* silent */
  }
}

function publishLandingStats() {
  const page = getPageContext();
  const funnel = getFunnelMetrics();
  const intent = getIntentMap();
  const sessions = Math.max(counters.visits, 1);

  const stats = {
    landing_id: page.landing_id,
    sessions: sessions,
    ctr: Number((counters.ctaClicks > 0 ? 1 : 0).toFixed(4)),
    video_engagement_rate: Number(
      ((counters.videoViews > 0 || counters.videoClicks > 0 ? 1 : 0) / sessions).toFixed(4)
    ),
    conversion_rate: Number((funnel.conversion_rate || 0).toFixed(4)),
    average_intent_score: intent.score,
    intent_level: intent.level,
    counters: Object.assign({}, counters),
    calculated_at: Date.now()
  };

  if (typeof window !== "undefined") {
    window.__LIFEOS_LANDING_STATS__ = stats;
  }

  return stats;
}

export function getLandingStats() {
  return publishLandingStats();
}

if (typeof window !== "undefined") {
  publishLandingStats();
}
