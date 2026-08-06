/**
 * Global agent registry — window.__LIFEOS_AGENTS__
 */

import { AGENT_CATALOG, STATUS, SYSTEMS } from "./agentTypes.js";

/** @type {Map<string, import("./agentTypes.js").AgentRecord>} */
const agents = new Map();

/**
 * @returns {import("./agentTypes.js").AgentMetrics}
 */
function emptyMetrics() {
  return { events: 0, errors: 0, latency_ms: 0 };
}

/**
 * @param {{ id: string, system?: string, name?: string, status?: string, metrics?: object, meta?: object }} def
 * @returns {import("./agentTypes.js").AgentRecord}
 */
export function registerAgent(def) {
  const now = Date.now();
  const existing = agents.get(def.id);

  const record = {
    id: def.id,
    system: def.system || SYSTEMS.LIFEOS,
    name: def.name || def.id,
    status: def.status || STATUS.INACTIVE,
    metrics: Object.assign(emptyMetrics(), existing?.metrics || {}, def.metrics || {}),
    lastHeartbeat: existing?.lastHeartbeat || 0,
    registeredAt: existing?.registeredAt || now,
    meta: Object.assign({}, existing?.meta || {}, def.meta || {})
  };

  agents.set(def.id, record);
  publishRegistry();
  return record;
}

/**
 * @param {string} id
 * @param {{ status?: string, metrics?: object, meta?: object, latency_ms?: number }} [patch]
 */
export function heartbeat(id, patch) {
  const agent = agents.get(id);
  if (!agent) {
    return registerAgent({
      id: id,
      status: patch?.status || STATUS.ACTIVE,
      metrics: patch?.metrics,
      meta: patch?.meta
    });
  }

  const now = Date.now();
  agent.lastHeartbeat = now;
  if (patch?.status) {
    agent.status = patch.status;
  } else if (agent.status === STATUS.INACTIVE) {
    agent.status = STATUS.ACTIVE;
  }

  if (patch?.metrics) {
    agent.metrics = Object.assign(agent.metrics, patch.metrics);
  }
  if (typeof patch?.latency_ms === "number") {
    agent.metrics.latency_ms = patch.latency_ms;
  }
  if (patch?.meta) {
    agent.meta = Object.assign(agent.meta, patch.meta);
  }

  agents.set(id, agent);
  publishRegistry();
  return agent;
}

/**
 * @param {string} id
 * @param {number} [count]
 */
export function recordAgentError(id, count) {
  const agent = agents.get(id);
  if (!agent) {
    return;
  }
  agent.metrics.errors += count || 1;
  agents.set(id, agent);
  publishRegistry();
}

/**
 * @param {string} id
 * @param {number} [count]
 */
export function recordAgentEvent(id, count) {
  const agent = agents.get(id);
  if (!agent) {
    return;
  }
  agent.metrics.events += count || 1;
  agents.set(id, agent);
  publishRegistry();
}

/**
 * @param {string} id
 * @param {string} status
 */
export function setAgentStatus(id, status) {
  const agent = agents.get(id);
  if (!agent) {
    return null;
  }
  agent.status = status;
  agents.set(id, agent);
  publishRegistry();
  return agent;
}

/**
 * @param {string} id
 * @returns {import("./agentTypes.js").AgentRecord|undefined}
 */
export function getAgent(id) {
  return agents.get(id);
}

/**
 * @returns {Record<string, import("./agentTypes.js").AgentRecord>}
 */
export function getAllAgents() {
  const out = {};
  agents.forEach(function (agent, id) {
    out[id] = Object.assign({}, agent);
  });
  return out;
}

/**
 * @param {{ system?: string, status?: string }} [filter]
 * @returns {import("./agentTypes.js").AgentRecord[]}
 */
export function queryAgents(filter) {
  const list = [];
  agents.forEach(function (agent) {
    if (filter?.system && agent.system !== filter.system) {
      return;
    }
    if (filter?.status && agent.status !== filter.status) {
      return;
    }
    list.push(Object.assign({}, agent));
  });
  return list;
}

export function initRegistry() {
  AGENT_CATALOG.forEach(function (entry) {
    registerAgent({
      id: entry.id,
      system: entry.system,
      name: entry.name,
      status: STATUS.INACTIVE,
      meta: { optional: entry.optional === true }
    });
  });
}

function publishRegistry() {
  const snapshot = {
    agents: getAllAgents(),
    count: agents.size,
    updated_at: Date.now()
  };

  window.__LIFEOS_AGENTS__ = snapshot;
}

export function getRegistrySnapshot() {
  return window.__LIFEOS_AGENTS__ || { agents: getAllAgents(), count: agents.size, updated_at: Date.now() };
}
