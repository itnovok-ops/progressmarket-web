/**
 * Event Standard — unified schema for ALL LifeOS + SuperSite events (ISP v1).
 */

import { createGrowthEvent, getPageContext, getSessionSnapshot, toBackendEventType } from "../growth/eventSchema.js";
import { routeEvent } from "../core/events/eventRouter.js";

export const EVENT_SCHEMA_VERSION = "lifeos.event.v1";

export const STANDARD_EVENT_NAMES = new Set([
  "visit",
  "scroll",
  "scroll_depth",
  "video_play",
  "video_click",
  "video_view",
  "cta_click",
  "form_start",
  "form_focus",
  "form_submit",
  "exit_intent",
  "intent"
]);

const LEGACY_NAME_MAP = {
  scroll_intent_low: "scroll",
  scroll_intent_mid: "scroll",
  scroll_intent_high: "scroll",
  form_submit_attempt: "form_submit",
  form_submit_success: "form_submit"
};

/**
 * @param {Record<string, unknown>} [raw]
 * @returns {object}
 */
export function normalizeEvent(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  let eventName = String(source.event || source.name || "unknown");
  const legacyName = eventName;
  eventName = LEGACY_NAME_MAP[eventName] || eventName;

  if (legacyName.indexOf("scroll_intent_") === 0) {
    eventName = "scroll";
  }

  const metadata = Object.assign(
    {},
    source.metadata && typeof source.metadata === "object" ? source.metadata : {},
    source.meta && typeof source.meta === "object" ? source.meta : {}
  );

  if (legacyName !== eventName) {
    metadata.legacy_event = legacyName;
  }

  const page =
    typeof source.page === "string"
      ? { path: source.page, href: "", landing_id: "wb-fbs-v1" }
      : source.page && typeof source.page === "object"
        ? source.page
        : getPageContext();

  const session =
    source.session && typeof source.session === "object"
      ? source.session
      : getSessionSnapshot();

  return {
    schema: EVENT_SCHEMA_VERSION,
    event: eventName,
    event_type: toBackendEventType(eventName),
    timestamp: Number(source.timestamp) || Date.now(),
    session: session,
    page: page,
    metadata: metadata,
    source: String(source.source || source._source || "integration")
  };
}

/**
 * @param {object} event
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateEvent(event) {
  if (!event || event.schema !== EVENT_SCHEMA_VERSION) {
    return { valid: false, reason: "invalid_schema" };
  }
  if (!event.event || typeof event.event !== "string") {
    return { valid: false, reason: "missing_event_name" };
  }
  if (!event.timestamp || typeof event.timestamp !== "number") {
    return { valid: false, reason: "missing_timestamp" };
  }
  return { valid: true };
}

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [metadata]
 * @param {string} [source]
 * @returns {object}
 */
export function emitStandardEvent(eventName, metadata, source) {
  const event = normalizeEvent(
    createGrowthEvent(eventName, Object.assign({}, metadata || {}, { _source: source || "emitter" }))
  );
  event.source = source || "emitter";
  storeStandardEvent(event);
  return event;
}

/**
 * @param {object} event
 */
export function storeStandardEvent(event) {
  try {
    const normalized = event.schema === EVENT_SCHEMA_VERSION ? event : normalizeEvent(event);
    const validation = validateEvent(normalized);
    if (!validation.valid) {
      window.__LIFEOS_EVENT_REJECTED__ = window.__LIFEOS_EVENT_REJECTED__ || [];
      window.__LIFEOS_EVENT_REJECTED__.push({ event: event, reason: validation.reason, at: Date.now() });
      return;
    }

    window.__LIFEOS_STANDARD_EVENTS__ = window.__LIFEOS_STANDARD_EVENTS__ || [];
    window.__LIFEOS_STANDARD_EVENTS__.push(normalized);

    if (window.__LIFEOS_STANDARD_EVENTS__.length > 300) {
      window.__LIFEOS_STANDARD_EVENTS__ = window.__LIFEOS_STANDARD_EVENTS__.slice(-300);
    }

    window.__LIFEOS_GROWTH_EVENTS__ = window.__LIFEOS_GROWTH_EVENTS__ || [];
    window.__LIFEOS_GROWTH_EVENTS__.push(normalized);

    routeEvent(normalized, "standard");
  } catch (_error) {
    /* silent */
  }
}

/**
 * Migrate legacy __LIFEOS_EVENTS__ buffer to standard format (read-only transform).
 */
export function migrateLegacyEventBuffer() {
  try {
    const legacy = window.__LIFEOS_EVENTS__ || [];
    if (!legacy.length) {
      return 0;
    }

    let migrated = 0;
    legacy.forEach(function (entry) {
      if (entry && entry.schema === EVENT_SCHEMA_VERSION) {
        return;
      }
      const normalized = normalizeEvent(Object.assign({ _source: "legacy_migration" }, entry));
      storeStandardEvent(normalized);
      entry.schema = EVENT_SCHEMA_VERSION;
      entry.migrated = true;
      migrated += 1;
    });

    return migrated;
  } catch (_error) {
    return 0;
  }
}

/**
 * Patch global send hooks to enforce standard schema.
 */
export function installEventStandardHub() {
  try {
    if (window.__LIFEOS_EMIT_EVENT__) {
      return;
    }

    window.__LIFEOS_EMIT_EVENT__ = function (eventName, metadata, source) {
      return emitStandardEvent(eventName, metadata, source);
    };

    if (typeof window.__LIFEOS_SEND_EVENT === "function" && !window.__LIFEOS_SEND_EVENT.__isp_wrapped) {
      const original = window.__LIFEOS_SEND_EVENT;
      window.__LIFEOS_SEND_EVENT = function (input) {
        const normalized = normalizeEvent(Object.assign({}, input, { source: "bridge" }));
        storeStandardEvent(normalized);
        return original.call(this, normalized);
      };
      window.__LIFEOS_SEND_EVENT.__isp_wrapped = true;
    }

    migrateLegacyEventBuffer();
  } catch (_error) {
    /* silent */
  }
}

/**
 * @returns {number}
 */
function getUnifiedEventCount() {
  try {
    if (typeof window.__LIFEOS_GET_UNIFIED_EVENTS__ === "function") {
      return window.__LIFEOS_GET_UNIFIED_EVENTS__().length;
    }
    return (window.__LIFEOS_EVENTS_UNIFIED__ || []).length;
  } catch (_error) {
    return 0;
  }
}

/**
 * @returns {object}
 */
export function getEventSchemaSnapshot() {
  return {
    version: EVENT_SCHEMA_VERSION,
    standard_names: Array.from(STANDARD_EVENT_NAMES),
    standard_buffer_size: getUnifiedEventCount(),
    legacy_buffer_size: (window.__LIFEOS_EVENTS__ || []).length,
    rejected_count: (window.__LIFEOS_EVENT_REJECTED__ || []).length,
    hub_installed: typeof window.__LIFEOS_EMIT_EVENT__ === "function"
  };
}
