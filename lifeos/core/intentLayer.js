/**
 * Intent Layer — subsystems emit ACTION intents only (no DOM, no direct state writes).
 */

import { mergeAppState } from "./appState.js";

const MAX_INTENTS = 500;
const MAX_STREAM = 1000;

/**
 * @param {object} intent
 * @returns {object}
 */
export function normalizeIntent(intent) {
  const base = intent && typeof intent === "object" ? intent : {};
  return {
    type: base.type || "ACTION",
    source: base.source || "unknown",
    payload: base.payload || {},
    at: base.at || Date.now(),
    id: base.id || "intent-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8)
  };
}

/**
 * @param {object} intent
 * @returns {object}
 */
export function enqueueIntent(intent) {
  const entry = normalizeIntent(intent);
  const queue = (window.__APP_INTENTS__ = window.__APP_INTENTS__ || []);
  queue.push(entry);
  if (queue.length > MAX_INTENTS) {
    queue.splice(0, queue.length - MAX_INTENTS);
  }
  pushIntentStream(entry);
  return entry;
}

/**
 * @param {object} entry
 */
function pushIntentStream(entry) {
  const stream = (window.__APP_INTENT_STREAM__ = window.__APP_INTENT_STREAM__ || []);
  stream.push(entry);
  if (stream.length > MAX_STREAM) {
    stream.splice(0, stream.length - MAX_STREAM);
  }
}

/**
 * @returns {object[]}
 */
export function drainIntents() {
  const queue = window.__APP_INTENTS__ || [];
  window.__APP_INTENTS__ = [];
  return queue.slice();
}

/**
 * @param {object} state
 * @param {object} intent
 * @returns {object}
 */
export function reduceIntentToState(state, intent) {
  const entry = normalizeIntent(intent);
  const payload = entry.payload || {};

  if (entry.type === "EVENT") {
    return state;
  }

  if (payload.set && typeof payload.set === "object") {
    return mergeAppState(state, payload.set);
  }

  const patch = {};
  ["shell", "page", "video", "overlays", "ui", "boot", "meta"].forEach(function (key) {
    if (payload[key] !== undefined) {
      patch[key] = payload[key];
    }
  });

  if (Object.keys(patch).length) {
    return mergeAppState(state, patch);
  }

  return state;
}
