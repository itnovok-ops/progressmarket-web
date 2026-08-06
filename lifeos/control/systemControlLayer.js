/**
 * System Control Layer — central safety and governance orchestrator.
 */

import { getModeSnapshot, setMode, MODES, getMode } from "./modeManager.js";
import { applyInstabilityResponse, getSafetySnapshot } from "./safetyEngine.js";
import { getPerformanceSnapshot, getIntervals } from "./loadBalancer.js";
import { getCycleSnapshot } from "./cycleController.js";
import {
  getGuardSnapshot,
  getBlocks,
  canExecuteAutopilot,
  guardUIModification,
  isBootExecutionReady
} from "./executionGuard.js";
import { getModePolicy } from "./modeManager.js";
import { bindControlAuthority, publishCleanArchitectureReport } from "../core/cleanArchitecture.js";

const CONTROL_EVENT = "lifeos:control:update";
let started = false;
let tickTimer = 0;

/**
 * Control-core authority API — sole decision maker for send/UI/automation gates.
 * @returns {object}
 */
export function getControlAuthorityApi() {
  return {
    canSendEvents: function () {
      if (!isBootExecutionReady()) {
        return false;
      }
      const policy = getModePolicy();
      return policy.analytics_collection === true;
    },
    canModifyUI: function () {
      return guardUIModification({ code: "control_layer" }).allowed === true;
    },
    canRunAutomation: function () {
      return canExecuteAutopilot();
    }
  };
}

/**
 * Bind authority hooks into clean architecture (only control layer may define gates).
 */
export function installControlAuthority() {
  bindControlAuthority(getControlAuthorityApi());
}

/**
 * @returns {object}
 */
export function publishControlState() {
  const instability = applyInstabilityResponse();
  const payload = {
    mode: getModeSnapshot(),
    safety: getSafetySnapshot(),
    performance: getPerformanceSnapshot(),
    cycles: getCycleSnapshot(),
    guard: getGuardSnapshot(),
    blocks: getBlocks().slice(-20),
    instability: instability,
    active: started,
    updated_at: Date.now()
  };

  try {
    window.__LIFEOS_CONTROL__ = {
      mode: payload.mode,
      safety: payload.safety,
      performance: payload.performance,
      blocks: payload.blocks
    };

    window.__LIFEOS_CONTROL_FULL__ = payload;
    window.__LIFEOS_GET_CONTROL__ = function () { return window.__LIFEOS_CONTROL__; };
    window.__LIFEOS_SET_CONTROL_MODE__ = function (mode, reason) {
      return setControlMode(mode, reason);
    };
    window.__LIFEOS_RUN_CONTROL_TICK__ = runControlTick;

    document.dispatchEvent(new CustomEvent(CONTROL_EVENT, { detail: payload }));
  } catch (_error) {
    /* silent */
  }

  return payload;
}

/**
 * @returns {object}
 */
export function runControlTick() {
  const instability = applyInstabilityResponse();
  if (
    instability.unstable &&
    instability.recommended_mode &&
    window.__LIFEOS_PRODUCTION_MODE__ !== true
  ) {
    setMode(instability.recommended_mode, "auto_instability_response");
  }
  return publishControlState();
}

/**
 * @param {string} mode
 * @param {string} [reason]
 * @returns {object}
 */
export function setControlMode(mode, reason) {
  setMode(mode, reason || "api");
  return publishControlState();
}

/**
 * @param {{ intervalMs?: number, mode?: string }} [options]
 * @returns {object}
 */
export function startControlLayer(options) {
  if (window.__LIFEOS_BOOT_LOCK__ && window.__LIFEOS_CONTROL_READY__ && !options?.bootOwner) {
    return publishControlState();
  }

  if (options?.mode && MODES[options.mode]) {
    setMode(options.mode, "boot_config");
  }

  if (!started) {
    started = true;
    installControlAuthority();
    publishCleanArchitectureReport();
    window.__LIFEOS_CONTROL_READY__ = true;
    const tickInterval = options?.intervalMs || getIntervals().control || 30000;
    tickTimer = window.setInterval(runControlTick, tickInterval);

    document.addEventListener("lifeos:nika:update", function () {
      runControlTick();
    });
    document.addEventListener("lifeos:autopilot:update", function () {
      runControlTick();
    });
    document.addEventListener("lifeos:audit:update", function () {
      runControlTick();
    });
  }

  return publishControlState();
}

/**
 * Stop control tick.
 */
export function stopControlLayer() {
  if (tickTimer) {
    window.clearInterval(tickTimer);
    tickTimer = 0;
  }
  started = false;
}

export { guardNikaDecision, guardAutopilotAction, guardUIModification, guardObservabilityCycle, canExecuteAutopilot, isBootExecutionReady } from "./executionGuard.js";
export { requestCycle } from "./cycleController.js";
export { getIntervals, getIntervalFor } from "./loadBalancer.js";
export { MODES } from "./modeManager.js";
