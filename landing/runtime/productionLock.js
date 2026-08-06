/**
 * Boot gate — warn only; must not break UI if modules load early.
 * Tracked runtime helper (not a build artifact).
 */
export function assertBootPass() {
  if (window.__BOOT_STATE__ !== "PASS") {
    console.warn(
      "[BOOT] assertBootPass: __BOOT_STATE__ is not PASS (current:",
      window.__BOOT_STATE__ || "undefined",
      ")"
    );
  }
}

/**
 * Top-level module guard for non-bootstrap modules.
 */
export function enforceProductionExecutionLock() {
  assertBootPass();
}
