/**
 * Event Normalizer — converts legacy streams into unified schema.
 */

import { createUnifiedEvent } from "./unifiedEventSchema.js";

const TYPE_MAP = {
  scroll_intent_low: "scroll",
  scroll_intent_mid: "scroll",
  scroll_intent_high: "scroll",
  scroll_depth: "scroll",
  form_focus: "form_start",
  form_submit_attempt: "form_submit",
  form_submit_success: "form_submit",
  video_play: "video_view"
};

/**
 * @param {object} raw
 * @param {string} [stream]
 * @returns {object}
 */
export function normalizeIncomingEvent(raw, stream) {
  const source = raw || {};
  let type = String(source.type || source.event || source.event_type || "unknown");
  type = TYPE_MAP[type] || type;

  const payload = Object.assign(
    {},
    source.payload && typeof source.payload === "object" ? source.payload : {},
    source.metadata && typeof source.metadata === "object" ? source.metadata : {},
    source.meta && typeof source.meta === "object" ? source.meta : {}
  );

  if (source.event && source.event !== type) {
    payload.legacy_type = source.event;
  }
  if (stream) {
    payload.ingest_stream = stream;
  }

  const session = source.session || source.lifeos_session || null;
  const context = {
    page: source.page || payload.page || null,
    landing_id: source.page?.landing_id || payload.landing_id || "wb-fbs-v1",
    stream: stream || source.source || "unknown"
  };

  return createUnifiedEvent({
    id: source.id,
    type: type,
    source: String(source.source || stream || "legacy"),
    timestamp: source.timestamp,
    session: session,
    payload: payload,
    context: context
  });
}

/**
 * @param {object[]} list
 * @param {string} stream
 * @returns {object[]}
 */
export function normalizeBatch(list, stream) {
  return (list || []).map(function (item) {
    return normalizeIncomingEvent(item, stream);
  });
}
