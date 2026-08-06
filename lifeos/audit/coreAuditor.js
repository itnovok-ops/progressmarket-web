/**
 * Core system auditor — Session, Growth, events, storage (read-only).
 */

/**
 * @returns {object[]}
 */
function getUnifiedEventsForAudit() {
  try {
    if (typeof window.__LIFEOS_GET_UNIFIED_EVENTS__ === "function") {
      return window.__LIFEOS_GET_UNIFIED_EVENTS__();
    }
    return window.__LIFEOS_EVENTS_UNIFIED__ || [];
  } catch (_error) {
    return [];
  }
}

/**
 * @returns {object}
 */
export function auditCore() {
  const session = auditSession();
  const growth = auditGrowth();
  const eventPipeline = auditEventPipeline();
  const storage = auditStorageClient();

  const status = resolveCoreStatus(session, growth, eventPipeline, storage);

  return {
    status: status,
    session: session,
    growth: growth,
    event_pipeline: eventPipeline,
    storage: storage,
    boot_state: safeGlobal("window.__BOOT_STATE__"),
    build_lock: window.__LIFEOS_BUILD_LOCK__ === true,
    build_version: window.__LIFEOS_BUILD_VERSION__ || null,
    audited_at: Date.now()
  };
}

/**
 * @returns {object}
 */
function auditSession() {
  let session = null;
  try {
    session =
      window.__LIFEOS_SESSION__ ||
      (typeof window.__LIFEOS_GET_SESSION__ === "function" ? window.__LIFEOS_GET_SESSION__() : null);
  } catch (_error) {
    session = null;
  }

  const present = Boolean(session);
  const status = session?.status || "unknown";

  return {
    present: present,
    status: status,
    active: status === "active",
    guest: status === "guest",
    token_present: Boolean(session?.token),
    conversion_tracking: session?.flags?.isConversionTracking !== false,
    user_role: session?.user?.role || null,
    source: session?.context?.source || null,
    health: present ? (status === "active" || status === "guest" ? "OK" : "WARN") : "FAIL"
  };
}

/**
 * @returns {object}
 */
function auditGrowth() {
  const active = window.__LIFEOS_GROWTH_ACTIVE__ === true;
  const growth = window.__LIFEOS_GROWTH__ || {};
  const report = window.__LIFEOS_GROWTH_REPORT__ || growth.report || null;
  const funnel = window.__LIFEOS_FUNNEL_METRICS__ || growth.funnel || null;
  const landing = window.__LIFEOS_LANDING_STATS__ || growth.landing || null;
  const intent = window.__LIFEOS_INTENT_MAP__ || growth.intent || null;

  return {
    active: active,
    report_present: Boolean(report),
    funnel_present: Boolean(funnel),
    landing_stats_present: Boolean(landing),
    intent_present: Boolean(intent),
    pipeline: growth.pipeline || null,
    weakest_stage: funnel?.weakest_stage || null,
    sessions_tracked: landing?.sessions ?? report?.sessions ?? null,
    health: active && funnel && landing ? "OK" : active ? "WARN" : "FAIL"
  };
}

/**
 * @returns {object}
 */
function auditEventPipeline() {
  const unified = getUnifiedEventsForAudit();
  const lastBatch = window.__LIFEOS_LAST_EVENTS_BATCH__ || null;
  const bridgeActive = typeof window.__LIFEOS_GROWTH_FLUSH__ === "function";

  return {
    client_collector_active: window.__LIFEOS_GROWTH_ACTIVE__ === true,
    buffered_events: unified.length,
    unified_events: unified.length,
    last_batch: lastBatch
      ? {
          accepted: lastBatch.accepted,
          at: lastBatch.at || lastBatch.received_at,
          status: lastBatch.status
        }
      : null,
    bridge_flush_available: bridgeActive,
    endpoint: "/lifeos/growth/api/events.php",
    health:
      window.__LIFEOS_GROWTH_ACTIVE__ && (unified.length > 0 || lastBatch)
        ? "OK"
        : window.__LIFEOS_GROWTH_ACTIVE__
          ? "WARN"
          : "FAIL"
  };
}

/**
 * @returns {object}
 */
function auditStorageClient() {
  const unifiedCount = getUnifiedEventsForAudit().length;
  return {
    client_side: {
      events_buffer: unifiedCount,
      unified_events: unifiedCount,
      full_report: Boolean(window.__LIFEOS_FULL_REPORT__),
      growth_report: Boolean(window.__LIFEOS_GROWTH_REPORT__)
    },
    server: {
      probed: false,
      reachable: null,
      ok: null,
      status: null,
      landing_id: null
    },
    paths: [
      "lifeos/growth/storage/events.jsonl",
      "lifeos/growth/storage/sessions.jsonl",
      "lifeos/growth/storage/conversions.jsonl"
    ],
    health: "UNKNOWN"
  };
}

/**
 * Probe PHP storage via read-only stats endpoint.
 * @param {number} [timeoutMs]
 * @returns {Promise<object>}
 */
export async function probeServerStorage(timeoutMs) {
  const timeout = timeoutMs || 5000;
  const landingId = "wb-fbs-v1";
  const url = "/lifeos/growth/api/stats.php?landing_id=" + encodeURIComponent(landingId);

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? window.setTimeout(function () { controller.abort(); }, timeout)
    : 0;

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal: controller ? controller.signal : undefined
    });

    let body = null;
    try {
      body = await response.json();
    } catch (_error) {
      body = null;
    }

    return {
      probed: true,
      reachable: true,
      ok: response.ok && body?.ok === true,
      status: response.status,
      landing_id: landingId,
      metrics_present: Boolean(body?.metrics),
      health: response.ok && body?.ok ? "OK" : "WARN"
    };
  } catch (error) {
    return {
      probed: true,
      reachable: false,
      ok: false,
      status: null,
      landing_id: landingId,
      error: String(error),
      health: "FAIL"
    };
  } finally {
    if (timer) {
      window.clearTimeout(timer);
    }
  }
}

/**
 * @param {object} session
 * @param {object} growth
 * @param {object} pipeline
 * @param {object} storage
 * @returns {string}
 */
function resolveCoreStatus(session, growth, pipeline, storage) {
  if (session.health === "FAIL" || growth.health === "FAIL") {
    return "FAIL";
  }
  if (pipeline.health === "FAIL" || storage.health === "FAIL") {
    return "FAIL";
  }
  if (session.health === "WARN" || growth.health === "WARN" || pipeline.health === "WARN") {
    return "WARN";
  }
  return "OK";
}

/**
 * @param {string} _expr
 * @returns {*}
 */
function safeGlobal(_expr) {
  try {
    return window.__BOOT_STATE__ || "unknown";
  } catch (_error) {
    return "unknown";
  }
}

/**
 * @param {object} core
 * @param {object} serverProbe
 * @returns {object}
 */
export function mergeStorageProbe(core, serverProbe) {
  const storage = Object.assign({}, core.storage, {
    server: serverProbe,
    health: serverProbe.health || core.storage.health
  });

  let status = core.status;
  if (serverProbe.health === "FAIL") {
    status = "FAIL";
  } else if (serverProbe.health === "WARN" && status === "OK") {
    status = "WARN";
  }

  return Object.assign({}, core, { storage: storage, status: status });
}
