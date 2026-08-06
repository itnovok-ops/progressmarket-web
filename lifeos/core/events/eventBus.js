/**
 * LifeOS Event Bus — redirects to __APP_INTENT_STREAM__.
 */

import { enqueueIntent } from "./intentLayer.js";

let started = false;

/**
 * @param {object} input
 * @param {string} [stream]
 * @returns {object}
 */
export function emitLifeOSEvent(input, stream) {
  const raw =
    input && typeof input === "object"
      ? input
      : { event: String(input || "unknown"), metadata: {} };

  return enqueueIntent({
    type: "EVENT",
    source: stream || raw.source || "event_bus",
    payload: {
      event: raw.event || raw.type,
      metadata: raw.metadata || raw.meta || {},
      timestamp: raw.timestamp || Date.now()
    }
  });
}

/**
 * @returns {object}
 */
export function initEventBus() {
  window.__APP_INTENT_STREAM__ = window.__APP_INTENT_STREAM__ || [];
  window.__APP_INTENTS__ = window.__APP_INTENTS__ || [];

  window.__LIFEOS_SEND_EVENT = function (input) {
    return emitLifeOSEvent(input, "bridge");
  };
  window.__LIFEOS_EMIT_EVENT__ = function (eventName, metadata, source) {
    return emitLifeOSEvent(
      { event: eventName, metadata: metadata || {}, source: source || "emit" },
      source || "emit"
    );
  };

  window.__LIFEOS_EVENT_BUS__ = {
    active: true,
    mode: "INTENT_STREAM",
    legacy_router_disabled: true,
    emit: emitLifeOSEvent
  };

  started = true;
  return window.__LIFEOS_EVENT_BUS__;
}

export function startEventRouter() {
  return window.__APP_INTENT_STREAM__ || [];
}
