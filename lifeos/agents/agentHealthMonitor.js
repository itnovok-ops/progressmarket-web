/**
 * Agent health monitor — overall and per-agent health, anomaly detection.
 */

import { getAllAgents, queryAgents } from "./agentRegistry.js";
import { HEALTH, STATUS, STALE_MS, SYSTEMS } from "./agentTypes.js";

/**
 * @typedef {object} AgentAlert
 * @property {string} code
 * @property {string} severity
 * @property {string} agent_id
 * @property {string} message
 */

/**
 * @returns {AgentAlert[]}
 */
function detectAnomalies(agents, now) {
  /** @type {AgentAlert[]} */
  const alerts = [];

  Object.keys(agents).forEach(function (id) {
    const agent = agents[id];
    const age = now - (agent.lastHeartbeat || 0);
    const optional = agent.meta?.optional === true;

    if (agent.status === STATUS.FAILED) {
      alerts.push({
        code: "agent_failed",
        severity: "high",
        agent_id: id,
        message: agent.name + " is in failed state"
      });
    }

    if (!optional && agent.lastHeartbeat > 0 && age > STALE_MS && agent.status !== STATUS.INACTIVE) {
      alerts.push({
        code: "agent_stale",
        severity: "medium",
        agent_id: id,
        message: agent.name + " heartbeat stale (" + Math.round(age / 1000) + "s)"
      });
    }

    if ((agent.metrics?.errors || 0) >= 5) {
      alerts.push({
        code: "error_spike",
        severity: "high",
        agent_id: id,
        message: agent.name + " error spike: " + agent.metrics.errors
      });
    }

    if (
      agent.system === SYSTEMS.LIFEOS &&
      agent.id === "lifeos.growth" &&
      agent.status === STATUS.INACTIVE &&
      window.__BOOT_STATE__ === "PASS"
    ) {
      alerts.push({
        code: "growth_inactive_after_boot",
        severity: "low",
        agent_id: id,
        message: "Growth analytics inactive after successful boot"
      });
    }
  });

  return alerts;
}

/**
 * @param {import("./agentTypes.js").AgentRecord} agent
 * @param {number} now
 * @returns {{ score: number, label: string }}
 */
function scoreAgent(agent, now) {
  if (agent.status === STATUS.FAILED) {
    return { score: 0, label: "FAIL" };
  }
  if (agent.status === STATUS.INACTIVE && agent.meta?.optional !== true) {
    return { score: 40, label: "WARN" };
  }
  if (agent.status === STATUS.DEGRADED) {
    return { score: 55, label: "WARN" };
  }

  const age = now - (agent.lastHeartbeat || 0);
  if (agent.lastHeartbeat > 0 && age > STALE_MS) {
    return { score: 50, label: "WARN" };
  }

  const errors = agent.metrics?.errors || 0;
  if (errors > 3) {
    return { score: 45, label: "WARN" };
  }

  return { score: 95, label: "OK" };
}

/**
 * @returns {object}
 */
export function computeHealthMonitor() {
  const now = Date.now();
  const agents = getAllAgents();
  const alerts = detectAnomalies(agents, now);
  const perAgent = {};

  let totalScore = 0;
  let counted = 0;

  Object.keys(agents).forEach(function (id) {
    const agent = agents[id];
    const health = scoreAgent(agent, now);
    perAgent[id] = {
      status: agent.status,
      system: agent.system,
      health: health.label,
      score: health.score,
      lastHeartbeat: agent.lastHeartbeat,
      metrics: agent.metrics
    };

    if (agent.meta?.optional !== true || agent.lastHeartbeat > 0) {
      totalScore += health.score;
      counted += 1;
    }
  });

  const average = counted > 0 ? Math.round(totalScore / counted) : 100;
  let systemHealth = HEALTH.OK;

  if (alerts.some(function (a) { return a.severity === "high"; }) || average < 50) {
    systemHealth = HEALTH.FAIL;
  } else if (alerts.length > 0 || average < 80) {
    systemHealth = HEALTH.WARN;
  }

  const bySystem = {
    supersite: summarizeSystem(queryAgents({ system: SYSTEMS.SUPERSITE })),
    lifeos: summarizeSystem(queryAgents({ system: SYSTEMS.LIFEOS })),
    cloudos: summarizeSystem(queryAgents({ system: SYSTEMS.CLOUDOS }))
  };

  return {
    systemHealth: systemHealth,
    overall_score: average,
    per_agent: perAgent,
    by_system: bySystem,
    alerts: alerts,
    generated_at: now
  };
}

/**
 * @param {import("./agentTypes.js").AgentRecord[]} list
 * @returns {object}
 */
function summarizeSystem(list) {
  if (!list.length) {
    return { agents: 0, active: 0, health: HEALTH.OK };
  }

  const active = list.filter(function (a) {
    return a.status === STATUS.ACTIVE;
  }).length;

  const failed = list.some(function (a) {
    return a.status === STATUS.FAILED;
  });

  return {
    agents: list.length,
    active: active,
    health: failed ? HEALTH.FAIL : active < list.length / 2 ? HEALTH.WARN : HEALTH.OK
  };
}

/**
 * Build Nika-facing agent report.
 * @returns {object}
 */
export function buildAgentReport() {
  const health = computeHealthMonitor();
  const agents = getAllAgents();

  return {
    agents: agents,
    systemHealth: health.systemHealth,
    alerts: health.alerts,
    overall_score: health.overall_score,
    per_agent: health.per_agent,
    by_system: health.by_system,
    bridge: window.__LIFEOS_AGENT_BRIDGE__ || null,
    generated_at: Date.now()
  };
}
