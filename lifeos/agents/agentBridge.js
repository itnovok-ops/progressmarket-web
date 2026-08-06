/**
 * Agent bridge — synchronizes state across Supersite, LifeOS, CloudOS.
 */

import { heartbeat, recordAgentError, recordAgentEvent } from "./agentRegistry.js";
import { STATUS, SYSTEMS } from "./agentTypes.js";

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
 * @returns {object[]}
 */
function probeSupersiteAgents() {
  const probes = [];

  const bootState = window.__BOOT_STATE__ || "unknown";
  probes.push({
    id: "supersite.boot",
    active: bootState === "PASS",
    status: bootState === "PASS" ? STATUS.ACTIVE : bootState === "FAIL" ? STATUS.FAILED : STATUS.DEGRADED,
    metrics: {
      events: 1,
      errors: bootState === "FAIL" ? 1 : 0,
      latency_ms: 0
    },
    meta: { boot_state: bootState, build_lock: window.__LIFEOS_BUILD_LOCK__ === true }
  });

  const eventCount = getUnifiedEventCount();
  probes.push({
    id: "supersite.conversion",
    active: eventCount >= 0,
    status: STATUS.ACTIVE,
    metrics: { events: eventCount, errors: 0, latency_ms: 0 },
    meta: { pipeline: window.__LIFEOS_GROWTH_PIPELINE__ || null }
  });

  const inspector = window.__LIFEOS_UI_INSPECTOR__ || window.__UI_INSPECTOR_REPORT__;
  probes.push({
    id: "supersite.ui-inspector",
    active: Boolean(inspector),
    status: inspector ? STATUS.ACTIVE : STATUS.INACTIVE,
    metrics: {
      events: inspector?.issues?.length || 0,
      errors: (inspector?.issues || []).filter(function (i) { return i.severity === "fail"; }).length,
      latency_ms: 0
    },
    meta: { report: inspector ? true : false }
  });

  probes.push({
    id: "supersite.conversion-boost",
    active: typeof window.__RUN_CONVERSION_BOOST__ === "function",
    status: typeof window.__RUN_CONVERSION_BOOST__ === "function" ? STATUS.ACTIVE : STATUS.INACTIVE,
    metrics: { events: 0, errors: 0, latency_ms: 0 }
  });

  probes.push({
    id: "supersite.ui-fix",
    active: Boolean(window.__LIFEOS_UX_FIX__),
    status: window.__LIFEOS_UX_FIX__ ? STATUS.ACTIVE : STATUS.INACTIVE,
    metrics: { events: 0, errors: 0, latency_ms: 0 }
  });

  probes.push({
    id: "supersite.ui-auto-repair",
    active: Boolean(window.__LIFEOS_AUTO_REPAIR__),
    status: window.__LIFEOS_AUTO_REPAIR__ ? STATUS.ACTIVE : STATUS.INACTIVE,
    metrics: { events: 0, errors: 0, latency_ms: 0 }
  });

  return probes;
}

/**
 * @returns {object[]}
 */
function probeLifeOSAgents() {
  const probes = [];
  const session = window.__LIFEOS_SESSION__;

  probes.push({
    id: "lifeos.session",
    active: Boolean(session),
    status: session ? STATUS.ACTIVE : STATUS.INACTIVE,
    metrics: { events: 1, errors: 0, latency_ms: 0 },
    meta: {
      mode: session?.status || "guest",
      source: session?.context?.source || "unknown"
    }
  });

  const growthActive = window.__LIFEOS_GROWTH_ACTIVE__ === true;
  const growthEventCount = getUnifiedEventCount();
  probes.push({
    id: "lifeos.growth",
    active: growthActive,
    status: growthActive ? STATUS.ACTIVE : STATUS.INACTIVE,
    metrics: {
      events: growthEventCount,
      errors: 0,
      latency_ms: 0
    },
    meta: {
      landing_stats: window.__LIFEOS_LANDING_STATS__ || null,
      funnel: window.__LIFEOS_FUNNEL_METRICS__ || null
    }
  });

  const observer = window.__LIFEOS_OBSERVER_REPORT__;
  probes.push({
    id: "lifeos.observer",
    active: Boolean(observer),
    status: observer?.ok === false ? STATUS.DEGRADED : observer ? STATUS.ACTIVE : STATUS.INACTIVE,
    metrics: {
      events: observer?.ui_scan?.metrics?.section_count || 0,
      errors: observer?.flags?.high_severity_ui_issues || 0,
      latency_ms: 0
    },
    meta: { chaotic_ui: observer?.flags?.chaotic_ui_flow === true }
  });

  const bridge = window.__LIFEOS_BRIDGE__;
  const queueLen = (window.__LIFEOS_EVENT_QUEUE__ || []).length;
  probes.push({
    id: "lifeos.bridge",
    active: Boolean(bridge),
    status: bridge ? STATUS.ACTIVE : STATUS.INACTIVE,
    metrics: { events: queueLen, errors: 0, latency_ms: 0 },
    meta: { queue_pending: queueLen }
  });

  return probes;
}

/**
 * @returns {object}
 */
function probeCloudOSAgent() {
  const cloudMeta = window.__CLOUDOS_STATE__ || null;
  const active = Boolean(cloudMeta?.connected);

  return {
    id: "cloudos.core",
    active: active,
    status: active ? STATUS.ACTIVE : STATUS.INACTIVE,
    metrics: { events: 0, errors: 0, latency_ms: 0 },
    meta: {
      future: true,
      connected: active,
      endpoint: cloudMeta?.endpoint || null
    }
  };
}

/**
 * Sync all known agents from runtime globals (read-only probes).
 * @returns {{ synced: number, bridges: object }}
 */
export function syncAgentBridge() {
  const started = Date.now();
  let synced = 0;
  const bridges = {
    supersite: { ui_events: 0, errors: 0 },
    lifeos: { analytics_events: 0, errors: 0 },
    cloudos: { connected: false }
  };

  try {
    const allProbes = probeSupersiteAgents().concat(probeLifeOSAgents(), [probeCloudOSAgent()]);

    allProbes.forEach(function (probe) {
      heartbeat(probe.id, {
        status: probe.status,
        metrics: probe.metrics,
        meta: probe.meta,
        latency_ms: probe.metrics.latency_ms
      });

      if (probe.metrics.errors > 0) {
        recordAgentError(probe.id, probe.metrics.errors);
      }
      if (probe.metrics.events > 0) {
        recordAgentEvent(probe.id, 0);
      }

      synced += 1;

      if (probe.id.indexOf("supersite.") === 0) {
        bridges.supersite.ui_events += probe.metrics.events;
        bridges.supersite.errors += probe.metrics.errors;
      }
      if (probe.id.indexOf("lifeos.") === 0) {
        bridges.lifeos.analytics_events += probe.metrics.events;
        bridges.lifeos.errors += probe.metrics.errors;
      }
      if (probe.id === "cloudos.core") {
        bridges.cloudos.connected = probe.active;
      }
    });

    bridges.latency_ms = Date.now() - started;
    window.__LIFEOS_AGENT_BRIDGE__ = bridges;

    return { synced: synced, bridges: bridges };
  } catch (_error) {
    return { synced: synced, bridges: bridges, error: "bridge_sync_failed_safely" };
  }
}

/**
 * Route a UI event from Supersite into LifeOS agent metrics (read-only fan-out).
 * @param {string} eventName
 * @param {Record<string, unknown>} [metadata]
 */
export function bridgeUIEvent(eventName, metadata) {
  try {
    recordAgentEvent("supersite.conversion", 1);
    recordAgentEvent("lifeos.growth", 1);
    heartbeat("supersite.conversion", { meta: { last_event: eventName, metadata: metadata || {} } });
    heartbeat("lifeos.growth", { meta: { last_event: eventName } });
  } catch (_error) {
    /* silent */
  }
}
