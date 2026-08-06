/**
 * Safe execution wrapper — prevents uncaught errors from freezing the system.
 */

const MAX_ERROR_LOG = 100;

function recordExecutionError(error, context) {
  if (!Array.isArray(window.__SYSTEM_ERRORS__)) {
    window.__SYSTEM_ERRORS__ = [];
  }

  window.__SYSTEM_ERRORS__.push({
    at: new Date().toISOString(),
    context: context || "unknown",
    message: error && error.message ? error.message : String(error),
    stack: error && error.stack ? error.stack : null
  });

  if (window.__SYSTEM_ERRORS__.length > MAX_ERROR_LOG) {
    window.__SYSTEM_ERRORS__.splice(0, window.__SYSTEM_ERRORS__.length - MAX_ERROR_LOG);
  }

  if (window.__CYCLE_MANAGER__ && typeof window.__CYCLE_MANAGER__.recordError === "function") {
    window.__CYCLE_MANAGER__.recordError(context);
  }
}

/**
 * @param {Function} fn
 * @param {string} [context]
 * @returns {{ success: boolean, error: Error|null, result?: * }}
 */
export function safeExecute(fn, context) {
  try {
    const result = fn();
    return { success: true, error: null, result: result };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    recordExecutionError(err, context);
    return { success: false, error: err };
  }
}

/**
 * @param {Function} fn
 * @param {string} [context]
 * @returns {Promise<{ success: boolean, error: Error|null, result?: * }>}
 */
export async function safeExecuteAsync(fn, context) {
  try {
    const result = await fn();
    return { success: true, error: null, result: result };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    recordExecutionError(err, context);
    return { success: false, error: err };
  }
}

if (typeof window !== "undefined") {
  window.safeExecute = safeExecute;
  window.safeExecuteAsync = safeExecuteAsync;
}
