/**
 * Autopilot / Auto Action Layer auditor (read-only).
 */

/**
 * @returns {object}
 */
export function auditAutopilot() {
  const state = window.__LIFEOS_ACTION_STATE__ || {};
  const log = window.__LIFEOS_ACTION_LOG__ || [];
  const lastCycle = window.__LIFEOS_AUTOPILOT_LAST_CYCLE__ || null;
  const gateActive = window.__NIKA_APPROVAL_STATE__?.active === true;

  const safety = auditSafetyRules();
  const execution = auditExecutionLog(log);
  const blocked = auditBlockedActions(log, state);

  const active = state.active === true;
  const status = resolveAutopilotStatus(active, safety, execution, blocked);

  return {
    status: status,
    active: active,
    approval_gate_required: gateActive,
    started_at: state.started_at || null,
    last_cycle_at: state.last_cycle_at || lastCycle?.generated_at || null,
    last_cycle: lastCycle
      ? {
          ok: lastCycle.ok,
          applied_count: lastCycle.applied_count,
          skipped_count: lastCycle.skipped_count,
          idle: lastCycle.idle === true
        }
      : null,
    applied_total: Array.isArray(state.applied) ? state.applied.length : 0,
    skipped_total: Array.isArray(state.skipped) ? state.skipped.length : 0,
    safety_rules: safety,
    execution_log: execution,
    blocked_actions: blocked,
    runner_available: typeof window.__LIFEOS_RUN_AUTOPILOT__ === "function",
    audited_at: Date.now()
  };
}

/**
 * @returns {object}
 */
function auditSafetyRules() {
  const bootPass = window.__BOOT_STATE__ === "PASS";
  const buildLock = window.__LIFEOS_BUILD_LOCK__ === true;
  const mount = typeof document !== "undefined" ? document.getElementById("app") : null;
  const appReady = Boolean(mount && mount.classList.contains("ready"));

  const checks = {
    boot_pass: bootPass,
    build_lock: buildLock,
    app_ready: appReady,
    execution_allowed: bootPass && buildLock && appReady
  };

  const failing = Object.keys(checks).filter(function (k) {
    return k !== "execution_allowed" && checks[k] !== true;
  });

  return {
    checks: checks,
    working: checks.execution_allowed,
    failing_checks: failing,
    health: checks.execution_allowed ? "OK" : "BLOCKED"
  };
}

/**
 * @param {object[]} log
 * @returns {object}
 */
function auditExecutionLog(log) {
  const entries = Array.isArray(log) ? log : [];
  const byLevel = { exec: 0, skip: 0, error: 0, info: 0 };

  entries.forEach(function (entry) {
    const level = entry.level || "info";
    byLevel[level] = (byLevel[level] || 0) + 1;
  });

  const recent = entries.slice(-8).map(function (e) {
    return {
      level: e.level,
      message: e.message,
      at: e.at
    };
  });

  return {
    total_entries: entries.length,
    by_level: byLevel,
    recent: recent,
    health: byLevel.error > 3 ? "WARN" : "OK"
  };
}

/**
 * @param {object[]} log
 * @param {object} state
 * @returns {object}
 */
function auditBlockedActions(log, state) {
  const skippedFromLog = (log || []).filter(function (e) {
    return e.level === "skip";
  });

  const skippedFromState = Array.isArray(state.skipped) ? state.skipped : [];

  return {
    count: skippedFromLog.length + skippedFromState.length,
    from_log: skippedFromLog.slice(-5).map(function (e) {
      return {
        message: e.message,
        reason: e.meta?.reason || null,
        at: e.at
      };
    }),
    from_state: skippedFromState.slice(-5),
    health: skippedFromLog.length > 10 ? "WARN" : "OK"
  };
}

/**
 * @param {boolean} active
 * @param {object} safety
 * @param {object} execution
 * @param {object} blocked
 * @returns {string}
 */
function resolveAutopilotStatus(active, safety, execution, blocked) {
  if (!active) {
    return "INACTIVE";
  }
  if (!safety.working) {
    return "BLOCKED";
  }
  if (execution.health === "WARN" || blocked.health === "WARN") {
    return "WARN";
  }
  return "OK";
}
