const QUEUE_KEY = "lifeos_growth_queue";

import { postToReceiver } from "./eventReceiverBridge.js";

/**
 * @returns {string}
 */
function legacyApiRoot() {
  try {
    return window.location.origin + "/api/growth";
  } catch (_error) {
    return "/api/growth";
  }
}

/**
 * @returns {object[]}
 */
function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

/**
 * @param {object[]} items
 */
function writeQueue(items) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-200)));
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {string} path
 * @param {object|object[]} body
 * @returns {Promise<boolean>}
 */
async function postLegacy(path, body) {
  try {
    const response = await fetch(legacyApiRoot() + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
      credentials: "same-origin"
    });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

/**
 * @param {object} event
 */
export function enqueueEvent(event) {
  try {
    const queue = readQueue();
    queue.push(event);
    writeQueue(queue);
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {object} event
 * @returns {Promise<boolean>}
 */
export async function sendEvent(event) {
  try {
    const payload =
      event && event.event
        ? event
        : { event: "unknown", metadata: event || {}, timestamp: Date.now() };

    const result = await postToReceiver(payload);
    if ((result.accepted || 0) > 0) {
      return true;
    }

    const legacyOk = await postLegacy("/event", payload);
    if (!legacyOk) {
      enqueueEvent(payload);
    }
    return legacyOk || result.status === "ok";
  } catch (_error) {
    enqueueEvent(event);
    return false;
  }
}

/**
 * @param {object[]} events
 * @returns {Promise<boolean>}
 */
export async function sendBatch(events) {
  if (!events || events.length === 0) {
    return true;
  }

  try {
    const result = await postToReceiver({ events: events });
    if ((result.accepted || 0) > 0) {
      return true;
    }

    const legacyOk = await postLegacy("/batch", { events: events });
    if (!legacyOk) {
      events.forEach(enqueueEvent);
    }
    return legacyOk || result.status === "ok";
  } catch (_error) {
    events.forEach(enqueueEvent);
    return false;
  }
}

/**
 * @param {object} summary
 * @returns {Promise<boolean>}
 */
export async function sendSessionSummary(summary) {
  try {
    const ok = await postLegacy("/session-summary", summary);
    return ok;
  } catch (_error) {
    return false;
  }
}

/**
 * Flush queued events when API becomes available.
 */
export async function flushQueue() {
  try {
    const queue = readQueue();
    if (queue.length === 0) {
      return;
    }

    const result = await postToReceiver({ events: queue });
    if ((result.accepted || 0) > 0) {
      writeQueue([]);
      return;
    }

    const legacyOk = await sendBatch(queue);
    if (legacyOk) {
      writeQueue([]);
    }
  } catch (_error) {
    /* silent */
  }
}

/**
 * Persist event immediately (fire-and-forget).
 * @param {object} event
 */
export function trackAndSend(event) {
  try {
    sendEvent(event).catch(function () {
      enqueueEvent(event);
    });
  } catch (_error) {
    enqueueEvent(event);
  }
}
