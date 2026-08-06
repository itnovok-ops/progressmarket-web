/**
 * Deterministic SuperSite + LifeOS boot sequence helpers.
 * Boot authority: lifeos/app.js ONLY (window.__LIFEOS_BOOT_STARTED__).
 */

import { bootTraceStep, bootTraceStepStarted, bootTraceStepCompleted, bootTraceStepFailed } from "./bootTrace.js";

const NIKA_DEBUG_SELECTORS = [
  "#lifeos-nika-insight-panel",
  "#lifeos-nika-insight-styles",
  ".lifeos-nika-panel",
  "[data-nika-stats]",
  "[data-nika-list]",
  "[data-nika-ctr]",
  "[data-nika-health]",
  "[data-nika-alerts]",
  "[data-nika-insights]",
  ".lifeos-nika-ctr-panel",
  ".lifeos-nika-health-panel",
  ".lifeos-nika-alerts-panel",
  ".lifeos-debug-panel",
  "[data-lifeos-debug-overlay]",
  "[data-nika-debug]"
];

/**
 * Pre-bootstrap safe defaults — prevents undefined global assignment crashes.
 */
export function installBootSafeState() {
  window.__LIFEOS_SAFE_STATE__ = {
    unified_wrapped: window.__LIFEOS_SAFE_STATE__?.unified_wrapped || {},
    control: window.__LIFEOS_SAFE_STATE__?.control || {},
    events: window.__LIFEOS_EVENTS_UNIFIED__ || window.__LIFEOS_SAFE_STATE__?.events || [],
    video: Object.assign({ initialized: false }, window.__LIFEOS_SAFE_STATE__?.video || {})
  };

  window.__LIFEOS_EVENTS_UNIFIED__ = window.__LIFEOS_EVENTS_UNIFIED__ || [];
  window.__LIFEOS_EVENTS__ = window.__LIFEOS_EVENTS__ || [];
  window.__LIFEOS_GROWTH_EVENTS__ = window.__LIFEOS_GROWTH_EVENTS__ || [];
  window.__LIFEOS_STANDARD_EVENTS__ = window.__LIFEOS_STANDARD_EVENTS__ || [];
  window.__LIFEOS_CONTROL__ = window.__LIFEOS_CONTROL__ || {};
}

/**
 * Run a boot step without stopping the pipeline on failure.
 * @param {string} stepName
 * @param {() => Promise<unknown> | unknown} fn
 * @returns {Promise<{ ok: boolean, result?: unknown, error?: string }>}
 */
export async function runBootStep(stepName, fn) {
  bootTraceStepStarted(stepName);
  try {
    const result = await fn();
    bootTraceStepCompleted(stepName, { ok: true });
    return { ok: true, result: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    bootTraceStepFailed(stepName, error, { blocking: false });
    return { ok: false, error: message };
  }
}

/**
 * Competing modules must not re-init core systems when app.js owns boot.
 * @returns {boolean}
 */
export function bootLockBlocksCompetingInit() {
  return window.__LIFEOS_BOOT_LOCK__ === true;
}

/**
 * Single boot owner — only landing/app.js may set this.
 */
export function installBootOwnerLock() {
  window.__LIFEOS_BOOT_LOCK__ = true;
  window.__LIFEOS_BOOT_OWNER__ = "lifeos/app.js";
}

/**
 * Reset runtime flags on hard reload (module state reset separately in videoController).
 */
export function resetBootRuntimeState() {
  window.__LIFEOS_BOOT_RELOAD__ = true;
  window.__LIFEOS_CONTROL_READY__ = false;
  window.__LIFEOS_VIDEO_INITIALIZED__ = false;
  window.__LIFEOS_VIDEO_AUTHORITY_FINALIZED__ = false;
  window.__LIFEOS_VIDEO_AUTHORITY_PREPARED__ = false;
  window.__LIFEOS_VIDEO_PLAYBACK_DEFERRED__ = false;
  window.__LIFEOS_VIDEO_INIT_LOCK__ = false;
  window.__LIFEOS_CLEAN_ARCH_ACTIVE__ = false;
  window.__LIFEOS_EVENT_EMIT_ENABLED__ = false;
  window.__NIKA_DEBUG_OVERLAY__ = false;
}

/**
 * @returns {boolean}
 */
export function detectHardReload() {
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav && (nav.type === "reload" || nav.type === "back_forward")) {
      return true;
    }
  } catch (_error) {
    /* silent */
  }
  return false;
}

/**
 * Hard-remove Nika debug overlays and block recreation.
 */
export function sealNikaDebugOverlay() {
  window.__NIKA_DEBUG_OVERLAY__ = false;
  window.__LIFEOS_SEAL_NIKA_PANEL__ = true;

  try {
    NIKA_DEBUG_SELECTORS.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) {
        if (node instanceof HTMLElement) {
          node.remove();
        }
      });
    });
  } catch (_error) {
    /* silent */
  }
}

/**
 * Hide any remaining overlay nodes (pre-removal pass).
 */
export function suppressNikaDebugOverlay() {
  window.__NIKA_DEBUG_OVERLAY__ = false;
  sealNikaDebugOverlay();
}

/**
 * Reset boot + video flags for hard reload; preserves build config globals.
 */
export function installBootReset() {
  window.__LIFEOS_BOOT_RESET__ = function () {
    const preserved = {
      buildVersion: window.__LIFEOS_BUILD_VERSION,
      buildHash: window.__BUILD_HASH,
      buildPriorHash: window.__LIFEOS_BUILD_PRIOR_HASH__,
      buildLock: window.__LIFEOS_BUILD_LOCK__
    };

    resetBootRuntimeState();
    sealNikaDebugOverlay();
    installBootSafeState();
    window.__LIFEOS_BOOT_LOCK__ = false;
    window.__BOOT_STATE__ = "INIT";

    if (preserved.buildVersion !== undefined) {
      window.__LIFEOS_BUILD_VERSION = preserved.buildVersion;
    }
    if (preserved.buildHash !== undefined) {
      window.__BUILD_HASH = preserved.buildHash;
    }
    if (preserved.buildPriorHash !== undefined) {
      window.__LIFEOS_BUILD_PRIOR_HASH__ = preserved.buildPriorHash;
    }
    if (preserved.buildLock !== undefined) {
      window.__LIFEOS_BUILD_LOCK__ = preserved.buildLock;
    }
  };
}

/**
 * Phase 1 — control layer (non-blocking for render; establishes authority).
 */
export async function initBootControlLayer() {
  return runBootStep("control_layer", async function () {
    const controlMod = await import(
      new URL("../../../lifeos/control/systemControlLayer.js", import.meta.url).href
    );

    if (controlMod && typeof controlMod.startControlLayer === "function") {
      const mode =
        window.__LIFEOS_PRODUCTION_MODE__ === true ? "PRODUCTION" : "SAFE_OPTIMIZATION";
      controlMod.startControlLayer({ mode: mode, bootOwner: true });
    }

    window.__LIFEOS_CONTROL_READY__ = true;
    if (window.__LIFEOS_SAFE_STATE__) {
      window.__LIFEOS_SAFE_STATE__.control = window.__LIFEOS_CONTROL__ || {};
    }
  });
}

/**
 * Phase 2 — event buffer only (route to unified bus; transport emit disabled).
 */
export async function initBootEventBuffer() {
  return runBootStep("event_buffer", async function () {
    window.__LIFEOS_EVENT_EMIT_ENABLED__ = false;
    installBootSafeState();

    const cleanMod = await import(new URL("../../../lifeos/core/cleanArchitecture.js", import.meta.url).href);
    if (cleanMod && typeof cleanMod.applyCleanArchitecture === "function") {
      cleanMod.applyCleanArchitecture({ root: document.getElementById("app"), bootOwner: true });
    }

    if (window.__LIFEOS_SAFE_STATE__) {
      window.__LIFEOS_SAFE_STATE__.events = window.__LIFEOS_EVENTS_UNIFIED__ || [];
    }
  });
}

/**
 * Phase 4 — single VideoController init after render (one call only).
 * @param {HTMLElement} mount
 * @param {{ force?: boolean }} [options]
 */
export async function initBootVideoAuthority(mount, options) {
  return runBootStep("video_authority", async function () {
    const videoMod = await import(new URL("../../../lifeos/core/video/videoController.js", import.meta.url).href);

    if (!videoMod || !videoMod.videoController) {
      return { ok: false, skipped: true, reason: "video_controller_unavailable" };
    }

    const force = options?.force === true || window.__LIFEOS_BOOT_RELOAD__ === true;
    if (force && typeof videoMod.resetVideoControllerForBoot === "function") {
      videoMod.resetVideoControllerForBoot();
    }

    const result = videoMod.videoController.init();

    if (window.__LIFEOS_SAFE_STATE__) {
      window.__LIFEOS_SAFE_STATE__.video = {
        initialized: result?.ok !== false
      };
    }

    return result;
  });
}

/**
 * Dispatch render-complete signal for downstream listeners.
 * @param {HTMLElement} mount
 */
export function signalRenderComplete(mount) {
  try {
    document.dispatchEvent(
      new CustomEvent("lifeos:render:complete", {
        detail: { mount: mount, at: Date.now() }
      })
    );
    bootTraceStep("render_complete");
  } catch (_error) {
    /* silent */
  }
}

/**
 * Enable event transport after core UI + video are ready.
 */
export function enableBootEventEmit() {
  window.__LIFEOS_EVENT_EMIT_ENABLED__ = true;
  bootTraceStep("event_emit_enabled");
}

/**
 * @returns {object}
 */
export function publishBootFinalStatus() {
  window.__LIFEOS_BOOT_FINAL_STATUS__ = {
    boot_lock: window.__LIFEOS_BOOT_LOCK__ === true,
    video_single_source: window.__LIFEOS_VIDEO_INITIALIZED__ === true,
    nika_overlay_removed: window.__NIKA_DEBUG_OVERLAY__ === false && window.__LIFEOS_SEAL_NIKA_PANEL__ === true,
    duplicate_boot_paths_disabled: window.__LIFEOS_BOOT_LOCK__ === true,
    refresh_safe: true,
    at: Date.now()
  };
  return window.__LIFEOS_BOOT_FINAL_STATUS__;
}
