/**
 * Boot trace — phase logging for LifeOS landing boot (non-blocking failures).
 */

/**
 * @returns {object}
 */
export function initBootTrace() {
  window.__LIFEOS_BOOT_TRACE__ = {
    steps: [],
    timestamps: {},
    status: "tracking",
    started_at: Date.now(),
    final_boot_status: "pending"
  };
  return window.__LIFEOS_BOOT_TRACE__;
}

/**
 * @param {string} step
 * @param {Record<string, unknown>} [meta]
 */
export function bootTraceStepStarted(step, meta) {
  try {
    const trace = window.__LIFEOS_BOOT_TRACE__ || initBootTrace();
    const entry = {
      step: step,
      phase: "step_started",
      at: Date.now(),
      meta: meta || {}
    };
    trace.steps.push(entry);
    trace.timestamps[step + ":started"] = entry.at;
    trace.last_step = step;
    window.__LIFEOS_BOOT_TRACE__ = trace;
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {string} step
 * @param {Record<string, unknown>} [meta]
 */
export function bootTraceStepCompleted(step, meta) {
  try {
    const trace = window.__LIFEOS_BOOT_TRACE__ || initBootTrace();
    const entry = {
      step: step,
      phase: "step_completed",
      at: Date.now(),
      meta: meta || {}
    };
    trace.steps.push(entry);
    trace.timestamps[step + ":completed"] = entry.at;
    trace.last_step = step;
    window.__LIFEOS_BOOT_TRACE__ = trace;
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {string} step
 * @param {unknown} error
 * @param {Record<string, unknown>} [meta]
 */
export function bootTraceStepFailed(step, error, meta) {
  try {
    const trace = window.__LIFEOS_BOOT_TRACE__ || initBootTrace();
    const message = error instanceof Error ? error.message : String(error || "unknown");
    const entry = {
      step: step,
      phase: "step_failed",
      at: Date.now(),
      meta: Object.assign({ error: message, blocking: false }, meta || {})
    };
    trace.steps.push(entry);
    trace.timestamps[step + ":failed"] = entry.at;
    trace.last_step = step;
    trace.failures = trace.failures || [];
    trace.failures.push(entry);
    window.__LIFEOS_BOOT_TRACE__ = trace;
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {string} step
 * @param {Record<string, unknown>} [meta]
 */
export function bootTraceStep(step, meta) {
  bootTraceStepCompleted(step, meta);
}

/**
 * @param {"complete"|"failed"|"degraded"} status
 * @param {Record<string, unknown>} [meta]
 */
export function bootTraceFinish(status, meta) {
  try {
    const trace = window.__LIFEOS_BOOT_TRACE__ || initBootTrace();
    trace.status = status;
    trace.final_boot_status = status;
    trace.finished_at = Date.now();
    if (meta) {
      trace.finish_meta = meta;
    }
    window.__LIFEOS_BOOT_TRACE__ = trace;
  } catch (_error) {
    /* silent */
  }
}
