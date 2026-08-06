/**
 * Event Router — DISABLED. Events flow to __APP_INTENT_STREAM__.
 */

import { enqueueIntent } from "../intentLayer.js";

/**
 * @param {object} raw
 * @param {string} [stream]
 * @returns {object}
 */
export function routeEvent(raw, stream) {
  return enqueueIntent({
    type: "EVENT",
    source: stream || raw?.source || "legacy_router",
    payload: raw || {}
  });
}

/**
 * @returns {object[]}
 */
export function getUnifiedEvents() {
  return window.__APP_INTENT_STREAM__ || [];
}

export function syncLegacyStreams() {
  /* no legacy buffers in pipeline mode */
}

export function startEventRouter() {
  window.__LIFEOS_GET_UNIFIED_EVENTS__ = getUnifiedEvents;
  return getUnifiedEvents();
}

export function stopEventRouter() {
  /* no-op */
}
