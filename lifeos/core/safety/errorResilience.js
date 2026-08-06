/**
 * Global error resilience — log errors without crashing the UI.
 */

import { safeExecute } from "./safeExecute.js";

let installed = false;

function recordGlobalError(payload) {
  if (!Array.isArray(window.__SYSTEM_ERRORS__)) {
    window.__SYSTEM_ERRORS__ = [];
  }

  window.__SYSTEM_ERRORS__.push(payload);

  if (window.__SYSTEM_ERRORS__.length > 100) {
    window.__SYSTEM_ERRORS__.splice(0, window.__SYSTEM_ERRORS__.length - 100);
  }

  if (window.__CYCLE_MANAGER__ && typeof window.__CYCLE_MANAGER__.recordError === "function") {
    window.__CYCLE_MANAGER__.recordError(payload.type);
  }
}

function onError(event) {
  safeExecute(function () {
    recordGlobalError({
      type: "error",
      at: new Date().toISOString(),
      message: event.message || "Unknown error",
      source: event.filename || null,
      line: event.lineno || null,
      col: event.colno || null
    });
  }, "global:error");
}

function onUnhandledRejection(event) {
  safeExecute(function () {
    const reason = event.reason;
    recordGlobalError({
      type: "unhandledrejection",
      at: new Date().toISOString(),
      message: reason && reason.message ? reason.message : String(reason)
    });
  }, "global:unhandledrejection");
}

/**
 * Install global error handlers.
 */
export function installErrorResilience() {
  if (installed) {
    return;
  }
  installed = true;

  if (!Array.isArray(window.__SYSTEM_ERRORS__)) {
    window.__SYSTEM_ERRORS__ = [];
  }

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
}

if (typeof window !== "undefined") {
  window.installErrorResilience = installErrorResilience;
}
