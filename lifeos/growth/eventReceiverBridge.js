/**
 * Frontend bridge for LifeOS Growth event receiver.
 * Posts client schema to /lifeos/growth/api/events.php and syncs analytics globals.
 */

import { getFunnelMetrics } from "./funnelEngine.js";
import { getIntentMap } from "./intentEngineClient.js";

const RECEIVER_PATH = "/lifeos/growth/api/events.php";

/**
 * @returns {string}
 */
function receiverUrl() {
  try {
    return window.location.origin + RECEIVER_PATH;
  } catch (_error) {
    return RECEIVER_PATH;
  }
}

/**
 * @param {object} response
 */
function applyReceiverResponse(response) {
  try {
    if (!response || typeof response !== "object") {
      return;
    }

    window.__LIFEOS_LAST_EVENTS_BATCH__ = {
      status: response.status || "ok",
      accepted: response.accepted || 0,
      batch: response.batch || [],
      analytics: response.analytics || null,
      received_at: Date.now()
    };

    const analytics = response.analytics;
    if (!analytics) {
      return;
    }

    if (analytics.landing_stats) {
      window.__LIFEOS_LANDING_STATS__ = Object.assign(
        {},
        window.__LIFEOS_LANDING_STATS__ || {},
        analytics.landing_stats
      );
    }

    if (analytics.funnel_metrics) {
      window.__LIFEOS_FUNNEL_METRICS__ = Object.assign(
        {},
        getFunnelMetrics(),
        analytics.funnel_metrics
      );
    }

    if (analytics.intent_distribution) {
      const dist = analytics.intent_distribution;
      window.__LIFEOS_INTENT_MAP__ = Object.assign({}, getIntentMap(), {
        distribution: {
          LOW: dist.low || 0,
          MEDIUM: dist.medium || 0,
          HIGH: dist.high || 0
        },
        score: dist.average_score || 0
      });
    }
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {object|object[]} payload
 * @returns {Promise<{ status: string }>}
 */
export async function postToReceiver(payload) {
  try {
    const body = Array.isArray(payload) ? { events: payload } : payload;

    const response = await fetch(receiverUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
      credentials: "same-origin"
    });

    let data = { status: "ok" };
    try {
      data = await response.json();
    } catch (_error) {
      data = { status: "ok" };
    }

    applyReceiverResponse(data);
    return data;
  } catch (_error) {
    window.__LIFEOS_LAST_EVENTS_BATCH__ = {
      status: "ok",
      accepted: 0,
      batch: [],
      offline: true,
      received_at: Date.now()
    };
    return { status: "ok" };
  }
}

/**
 * @param {object} event Client event { event, timestamp, session, page, metadata }
 */
export async function sendClientEvent(event) {
  return postToReceiver(event);
}
