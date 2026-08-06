/**
 * LifeOS Agent Network — type definitions and constants.
 */

/** @typedef {"supersite" | "lifeos" | "cloudos"} AgentSystem */
/** @typedef {"active" | "degraded" | "failed" | "inactive"} AgentStatus */

/**
 * @typedef {object} AgentMetrics
 * @property {number} events
 * @property {number} errors
 * @property {number} latency_ms
 */

/**
 * @typedef {object} AgentRecord
 * @property {string} id
 * @property {AgentSystem} system
 * @property {string} name
 * @property {AgentStatus} status
 * @property {AgentMetrics} metrics
 * @property {number} lastHeartbeat
 * @property {number} registeredAt
 * @property {Record<string, unknown>} meta
 */

export const SYSTEMS = {
  SUPERSITE: "supersite",
  LIFEOS: "lifeos",
  CLOUDOS: "cloudos"
};

export const STATUS = {
  ACTIVE: "active",
  DEGRADED: "degraded",
  FAILED: "failed",
  INACTIVE: "inactive"
};

export const HEALTH = {
  OK: "OK",
  WARN: "WARN",
  FAIL: "FAIL"
};

/** Stale threshold — no heartbeat → degraded. */
export const STALE_MS = 30000;

/** Default heartbeat interval. */
export const HEARTBEAT_INTERVAL_MS = 10000;

/** Failed threshold — stale beyond 2x → failed. */
export const FAILED_MS = 60000;

/**
 * Canonical agent catalog for the LifeOS ecosystem.
 * @type {Array<{ id: string, system: AgentSystem, name: string, optional?: boolean }>}
 */
export const AGENT_CATALOG = [
  { id: "supersite.boot", system: SYSTEMS.SUPERSITE, name: "Boot Telemetry" },
  { id: "supersite.conversion", system: SYSTEMS.SUPERSITE, name: "Conversion Engine" },
  { id: "supersite.ui-inspector", system: SYSTEMS.SUPERSITE, name: "UI Inspector" },
  { id: "supersite.conversion-boost", system: SYSTEMS.SUPERSITE, name: "Conversion Boost" },
  { id: "supersite.ui-fix", system: SYSTEMS.SUPERSITE, name: "UX Fix Engine" },
  { id: "supersite.ui-auto-repair", system: SYSTEMS.SUPERSITE, name: "UI Auto Repair" },
  { id: "lifeos.session", system: SYSTEMS.LIFEOS, name: "Session Core" },
  { id: "lifeos.growth", system: SYSTEMS.LIFEOS, name: "Growth Analytics" },
  { id: "lifeos.observer", system: SYSTEMS.LIFEOS, name: "System Observer" },
  { id: "lifeos.bridge", system: SYSTEMS.LIFEOS, name: "SuperSite Bridge" },
  { id: "cloudos.core", system: SYSTEMS.CLOUDOS, name: "CloudOS Core", optional: true }
];

/**
 * @param {AgentStatus} status
 * @returns {boolean}
 */
export function isOperational(status) {
  return status === STATUS.ACTIVE || status === STATUS.DEGRADED;
}
