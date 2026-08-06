/**
 * Agent network auditor — supersite, lifeos, cloudos (read-only).
 */

import { FAILED_MS, STALE_MS, STATUS } from "../agents/agentTypes.js";

const SYSTEM_ALIASES = {
  supersite: "supersite-agent",
  lifeos: "lifeos-agent",
  cloudos: "cloudos-agent"
};

/**
 * @returns {object}
 */
export function auditAgents() {
  const report = window.__LIFEOS_AGENT_REPORT__ || null;
  const registry = window.__LIFEOS_AGENTS__ || null;
  const agents = report?.agents || registry?.agents || {};
  const now = Date.now();

  const perAgent = {};
  const systems = {
    supersite: auditSystemGroup("supersite", agents, now),
    lifeos: auditSystemGroup("lifeos", agents, now),
    cloudos: auditSystemGroup("cloudos", agents, now)
  };

  Object.keys(agents).forEach(function (id) {
    perAgent[id] = summarizeAgent(agents[id], now);
  });

  const alerts = report?.alerts || [];
  const errors = countTotalErrors(agents);
  const stale = countStaleAgents(agents, now);

  return {
    status: report?.systemHealth || inferSystemHealth(systems, alerts),
    overall_score: report?.overall_score ?? null,
    registry_count: registry?.count ?? Object.keys(agents).length,
    network_started: Boolean(report),
    per_agent: perAgent,
    systems: systems,
    aliases: {
      "supersite-agent": systems.supersite,
      "lifeos-agent": systems.lifeos,
      "cloudos-agent": systems.cloudos
    },
    alerts: alerts,
    summary: {
      total_agents: Object.keys(agents).length,
      active: countByStatus(agents, STATUS.ACTIVE),
      degraded: countByStatus(agents, STATUS.DEGRADED),
      failed: countByStatus(agents, STATUS.FAILED),
      inactive: countByStatus(agents, STATUS.INACTIVE),
      total_errors: errors,
      stale_count: stale
    },
    bridge_present: Boolean(window.__LIFEOS_AGENT_BRIDGE__),
    audited_at: Date.now()
  };
}

/**
 * @param {string} system
 * @param {Record<string, object>} agents
 * @param {number} now
 * @returns {object}
 */
function auditSystemGroup(system, agents, now) {
  const list = Object.keys(agents)
    .filter(function (id) { return agents[id].system === system; })
    .map(function (id) { return summarizeAgent(agents[id], now); });

  const exists = list.length > 0;
  const optionalOnly = list.every(function (a) { return a.optional; });
  const active = list.filter(function (a) { return a.status === STATUS.ACTIVE; }).length;
  const failed = list.some(function (a) { return a.status === STATUS.FAILED; });
  const degraded = list.some(function (a) { return a.status === STATUS.DEGRADED; });
  const stale = list.filter(function (a) { return a.heartbeat_stale; }).length;
  const errors = list.reduce(function (sum, a) { return sum + (a.errors || 0); }, 0);
  const avgLatency = averageLatency(list);

  let health = "OK";
  if (!exists) {
    health = system === "cloudos" ? "N/A" : "FAIL";
  } else if (failed) {
    health = "FAIL";
  } else if (degraded || stale > 0) {
    health = "WARN";
  } else if (active === 0 && !optionalOnly) {
    health = "WARN";
  }

  return {
    alias: SYSTEM_ALIASES[system],
    exists: exists,
    optional: optionalOnly,
    agents: list.length,
    active: active,
    health: health,
    heartbeat: {
      stale: stale,
      avg_latency_ms: avgLatency
    },
    errors: errors,
    agents_detail: list
  };
}

/**
 * @param {object} agent
 * @param {number} now
 * @returns {object}
 */
function summarizeAgent(agent, now) {
  const age = agent.lastHeartbeat ? now - agent.lastHeartbeat : null;
  const heartbeatStale = age !== null && age > STALE_MS && agent.status !== STATUS.INACTIVE;
  const heartbeatFailed = age !== null && age > FAILED_MS && agent.status !== STATUS.INACTIVE;

  return {
    id: agent.id,
    name: agent.name,
    system: agent.system,
    status: agent.status,
    optional: agent.meta?.optional === true,
    last_heartbeat: agent.lastHeartbeat || 0,
    heartbeat_age_ms: age,
    heartbeat_stale: heartbeatStale,
    heartbeat_failed: heartbeatFailed,
    latency_ms: agent.metrics?.latency_ms ?? 0,
    events: agent.metrics?.events ?? 0,
    errors: agent.metrics?.errors ?? 0,
    health: resolveAgentHealth(agent, heartbeatStale, heartbeatFailed)
  };
}

/**
 * @param {object} agent
 * @param {boolean} stale
 * @param {boolean} failed
 * @returns {string}
 */
function resolveAgentHealth(agent, stale, failed) {
  if (agent.status === STATUS.FAILED || failed) {
    return "FAIL";
  }
  if (agent.status === STATUS.DEGRADED || stale) {
    return "WARN";
  }
  if (agent.status === STATUS.ACTIVE) {
    return "OK";
  }
  if (agent.meta?.optional === true) {
    return "N/A";
  }
  return "WARN";
}

/**
 * @param {object[]} list
 * @returns {number}
 */
function averageLatency(list) {
  const withLatency = list.filter(function (a) { return typeof a.latency_ms === "number" && a.latency_ms > 0; });
  if (!withLatency.length) {
    return 0;
  }
  const sum = withLatency.reduce(function (acc, a) { return acc + a.latency_ms; }, 0);
  return Math.round(sum / withLatency.length);
}

/**
 * @param {Record<string, object>} agents
 * @param {string} status
 * @returns {number}
 */
function countByStatus(agents, status) {
  return Object.keys(agents).filter(function (id) { return agents[id].status === status; }).length;
}

/**
 * @param {Record<string, object>} agents
 * @returns {number}
 */
function countTotalErrors(agents) {
  return Object.keys(agents).reduce(function (sum, id) {
    return sum + (agents[id].metrics?.errors || 0);
  }, 0);
}

/**
 * @param {Record<string, object>} agents
 * @param {number} now
 * @returns {number}
 */
function countStaleAgents(agents, now) {
  return Object.keys(agents).filter(function (id) {
    const agent = agents[id];
    const age = now - (agent.lastHeartbeat || 0);
    return agent.lastHeartbeat > 0 && age > STALE_MS && agent.status !== STATUS.INACTIVE;
  }).length;
}

/**
 * @param {object} systems
 * @param {object[]} alerts
 * @returns {string}
 */
function inferSystemHealth(systems, alerts) {
  if (alerts.some(function (a) { return a.severity === "high"; })) {
    return "FAIL";
  }
  if (systems.supersite.health === "FAIL" || systems.lifeos.health === "FAIL") {
    return "FAIL";
  }
  if (systems.supersite.health === "WARN" || systems.lifeos.health === "WARN") {
    return "WARN";
  }
  return "OK";
}
