/**
 * Agent status sync — heartbeat loop, stale detection, network bootstrap.
 */

import { initRegistry, getAllAgents, setAgentStatus, heartbeat } from "./agentRegistry.js";
import { syncAgentBridge } from "./agentBridge.js";
import { buildAgentReport } from "./agentHealthMonitor.js";
import {
  FAILED_MS,
  HEARTBEAT_INTERVAL_MS,
  STALE_MS,
  STATUS
} from "./agentTypes.js";

function resolveAgentInterval(options) {
  try {
    const fromControl = window.__LIFEOS_CONTROL__?.performance?.intervals_ms?.agents;
    if (typeof fromControl === "number" && fromControl > 0) {
      return fromControl;
    }
  } catch (_error) {
    /* silent */
  }
  return options?.intervalMs || HEARTBEAT_INTERVAL_MS;
}

const REPORT_EVENT = "lifeos:agents:update";

let started = false;
let heartbeatTimer = 0;

/**
 * Mark agents without recent heartbeat as degraded/failed.
 */
export function applyStaleDetection() {
  const now = Date.now();
  const agents = getAllAgents();

  Object.keys(agents).forEach(function (id) {
    const agent = agents[id];
    if (agent.meta?.optional === true && agent.lastHeartbeat === 0) {
      return;
    }

    const age = now - (agent.lastHeartbeat || 0);
    if (agent.lastHeartbeat === 0) {
      return;
    }

    if (age > FAILED_MS && agent.status !== STATUS.INACTIVE) {
      setAgentStatus(id, STATUS.FAILED);
      return;
    }

    if (age > STALE_MS && agent.status === STATUS.ACTIVE) {
      setAgentStatus(id, STATUS.DEGRADED);
    }
  });
}

/**
 * @returns {object}
 */
export function publishAgentReport() {
  try {
    applyStaleDetection();
    const report = buildAgentReport();

    window.__LIFEOS_AGENT_REPORT__ = report;
    window.__LIFEOS_GET_AGENT_REPORT__ = function () {
      syncAgentBridge();
      applyStaleDetection();
      const fresh = buildAgentReport();
      window.__LIFEOS_AGENT_REPORT__ = fresh;
      return fresh;
    };
    window.__LIFEOS_QUERY_AGENTS__ = function (filter) {
      const all = report.agents || {};
      if (!filter) {
        return all;
      }
      const out = {};
      Object.keys(all).forEach(function (id) {
        const agent = all[id];
        if (filter.system && agent.system !== filter.system) {
          return;
        }
        if (filter.status && agent.status !== filter.status) {
          return;
        }
        out[id] = agent;
      });
      return out;
    };

    document.dispatchEvent(
      new CustomEvent(REPORT_EVENT, { detail: { report: report } })
    );

    return report;
  } catch (_error) {
    const fallback = {
      agents: {},
      systemHealth: "WARN",
      alerts: [{ code: "report_failed", severity: "low", message: "Agent report unavailable" }],
      generated_at: Date.now()
    };
    window.__LIFEOS_AGENT_REPORT__ = fallback;
    return fallback;
  }
}

/**
 * Single sync tick.
 */
export function runAgentSyncTick() {
  try {
    syncAgentBridge();
    applyStaleDetection();
    publishAgentReport();
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {{ intervalMs?: number }} [options]
 */
export function startAgentNetwork(options) {
  if (started) {
    return runAgentSyncTick();
  }

  started = true;
  initRegistry();

  heartbeat("lifeos.agents", {
    status: STATUS.ACTIVE,
    meta: { role: "agent-network-coordinator" }
  });

  runAgentSyncTick();

  const interval = resolveAgentInterval(options);
  heartbeatTimer = window.setInterval(runAgentSyncTick, interval);

  document.addEventListener("lifeos:observer:update", runAgentSyncTick);
  document.addEventListener("lifeos:session:update", runAgentSyncTick);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      runAgentSyncTick();
    }
  });

  return window.__LIFEOS_AGENT_REPORT__;
}

/**
 * Stop heartbeat loop.
 */
export function stopAgentNetwork() {
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = 0;
  }
  started = false;
}
