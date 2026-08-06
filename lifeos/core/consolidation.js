/**
 * Consolidation v2 — system stabilization bootstrap.
 */

import { startEventRouter, getUnifiedEvents } from "./events/eventRouter.js";
import { startUltraPatch } from "./ultraPatch.js";
import { applyCleanArchitecture } from "./cleanArchitecture.js";

/**
 * @param {{ root?: ParentNode }} [options]
 * @returns {object}
 */
export function startConsolidation(options) {
  if (window.__LIFEOS_BOOT_LOCK__) {
    const state = {
      event_system: "BOOT_OWNED",
      video_system: "BOOT_OWNED",
      nika: "GOVERNED",
      observability: "REDUCED",
      system_noise: "LOWERED",
      boot_lock: true,
      skipped: true,
      unified_events: getUnifiedEvents().length,
      started_at: Date.now()
    };
    window.__LIFEOS_SYSTEM_CONSOLIDATED__ = state;
    window.__LIFEOS_GET_CONSOLIDATED__ = function () {
      return window.__LIFEOS_SYSTEM_CONSOLIDATED__;
    };
    return state;
  }

  try {
    window.__LIFEOS_OBSERVABILITY_MODE__ = "REDUCED";

    if (!window.__LIFEOS_CLEAN_ARCH_ACTIVE__) {
      applyCleanArchitecture(options);
    }
    startEventRouter();
    const ultra = startUltraPatch(options);

    const state = {
      event_system: "UNIFIED",
      video_system: "SINGLE_AUTHORITY",
      nika: "GOVERNED",
      observability: "REDUCED",
      system_noise: "LOWERED",
      ultra_patch: ultra?.active === true,
      unified_events: getUnifiedEvents().length,
      started_at: Date.now()
    };

    window.__LIFEOS_SYSTEM_CONSOLIDATED__ = state;
    window.__LIFEOS_GET_CONSOLIDATED__ = function () {
      return window.__LIFEOS_SYSTEM_CONSOLIDATED__;
    };

    return state;
  } catch (_error) {
    const fallback = {
      event_system: "UNIFIED",
      video_system: "SINGLE_AUTHORITY",
      nika: "GOVERNED",
      observability: "REDUCED",
      system_noise: "LOWERED",
      error: "consolidation_start_safe_fallback"
    };
    window.__LIFEOS_SYSTEM_CONSOLIDATED__ = fallback;
    return fallback;
  }
}
