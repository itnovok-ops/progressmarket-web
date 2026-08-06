/**
 * Stability Layer — installs performance + safety infrastructure.
 */

import { installCycleManager } from "./cycleManager.js";
import { installErrorResilience } from "../safety/errorResilience.js";
import { throttle, debounce } from "./throttle.js";

let installed = false;

/**
 * Install all stability subsystems (must run before other LifeOS modules).
 */
export function installStabilityLayer() {
  if (installed) {
    return;
  }
  installed = true;

  installErrorResilience();
  installCycleManager();

  window.__LIFEOS_THROTTLE__ = throttle;
  window.__LIFEOS_DEBOUNCE__ = debounce;

  if (!window.__SYSTEM_HEALTH__) {
    window.__SYSTEM_HEALTH__ = {
      renderLag: 0,
      cycleOverlaps: 0,
      errorCount: 0,
      eventQueueSize: 0,
      stabilityScore: 100,
      updatedAt: new Date().toISOString()
    };
  }

  if (!Array.isArray(window.__SYSTEM_ERRORS__)) {
    window.__SYSTEM_ERRORS__ = [];
  }

  if (!Array.isArray(window.__EVENT_BATCH__)) {
    window.__EVENT_BATCH__ = [];
  }
}

if (typeof window !== "undefined") {
  window.installStabilityLayer = installStabilityLayer;
}
