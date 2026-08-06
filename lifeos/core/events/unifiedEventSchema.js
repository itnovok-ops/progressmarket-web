/**
 * Unified Event Schema — single canonical format (Consolidation v2).
 */

export const UNIFIED_SCHEMA_VERSION = "lifeos.unified.v1";

/**
 * @param {object} [fields]
 * @returns {object}
 */
export function createUnifiedEvent(fields) {
  const now = Date.now();
  return {
    id: fields?.id || "evt-" + now + "-" + Math.random().toString(36).slice(2, 9),
    type: String(fields?.type || fields?.event || "unknown"),
    source: String(fields?.source || "unknown"),
    timestamp: Number(fields?.timestamp) || now,
    session: fields?.session || null,
    payload: fields?.payload && typeof fields.payload === "object" ? fields.payload : {},
    context: fields?.context && typeof fields.context === "object" ? fields.context : {}
  };
}

/**
 * @param {object} event
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateUnifiedEvent(event) {
  if (!event || !event.id || !event.type) {
    return { valid: false, reason: "missing_id_or_type" };
  }
  if (!event.timestamp || typeof event.timestamp !== "number") {
    return { valid: false, reason: "missing_timestamp" };
  }
  return { valid: true };
}
