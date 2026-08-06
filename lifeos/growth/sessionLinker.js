import { createGrowthEvent, getSessionSnapshot } from "./eventSchema.js";

/**
 * Ensure LifeOS session exists (guest fallback).
 */
function ensureLifeOSSession() {
  try {
    if (window.__LIFEOS_SESSION__) {
      return window.__LIFEOS_SESSION__;
    }

    if (typeof window.__LIFEOS_GET_SESSION__ === "function") {
      return window.__LIFEOS_GET_SESSION__();
    }
  } catch (_error) {
    /* silent */
  }

  window.__LIFEOS_SESSION__ = {
    status: "guest",
    token: null,
    user: {},
    context: { source: "landing" },
    flags: { isDebug: false, isConversionTracking: true }
  };

  return window.__LIFEOS_SESSION__;
}

/**
 * Attach session context to every event. Never emit without session.
 * @param {string} eventName
 * @param {Record<string, unknown>} [metadata]
 * @returns {object}
 */
export function linkEvent(eventName, metadata) {
  try {
    const lifeosSession = ensureLifeOSSession();
    const event = createGrowthEvent(eventName, metadata);
    event.session = getSessionSnapshot();
    event.lifeos_session = {
      status: lifeosSession.status || "guest",
      token: lifeosSession.token || null,
      user: lifeosSession.user || {},
      context: lifeosSession.context || {},
      flags: lifeosSession.flags || {}
    };

    window.__LIFEOS_GROWTH_EVENTS__ = window.__LIFEOS_GROWTH_EVENTS__ || [];
    window.__LIFEOS_GROWTH_EVENTS__.push(event);

    return event;
  } catch (_error) {
    return createGrowthEvent(eventName, metadata);
  }
}

/**
 * @returns {object}
 */
export function getLinkedSession() {
  ensureLifeOSSession();
  return getSessionSnapshot();
}
