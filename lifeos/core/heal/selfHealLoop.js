/**
 * Self-Heal Loop — orchestrates diagnostics → proposals → approval → safe apply.
 *
 * NO automatic fix execution.
 * NO direct DOM mutation.
 * applyApprovedFixes() runs ONLY on explicit manual heal cycle.
 */

import { runDiagnostics } from "../diagnostics/diagnosticLoop.js";
import { updateFixProposals } from "../fix/fixLayer.js";
import { listApprovedFixes } from "../fix/approvalGate.js";
import { applyApprovedFixes } from "../fix/fixExecutionEngine.js";
import { runCycle } from "../performance/cycleManager.js";

let loopInstalled = false;
let cycleRunning = false;

function isProductionMode() {
  return window.__LIFEOS_PRODUCTION_MODE__ === true;
}

function initHealStatus() {
  if (!window.__HEAL_STATUS__ || typeof window.__HEAL_STATUS__ !== "object") {
    window.__HEAL_STATUS__ = {
      lastRun: null,
      pendingFixes: [],
      appliedFixes: [],
      status: "idle"
    };
  }
  return window.__HEAL_STATUS__;
}

function readPendingProposals() {
  const proposals = window.__NIKA_STATE__?.fixProposals || [];
  return proposals.filter(function (item) {
    return item.status === "proposed";
  });
}

function readApprovedPending() {
  return listApprovedFixes();
}

function updateHealStatus(meta) {
  const heal = initHealStatus();
  const pending = readPendingProposals();
  const approvedPending = readApprovedPending();
  const applied = window.__NIKA_STATE__?.appliedFixes || [];

  heal.lastRun = new Date().toISOString();
  heal.trigger = meta?.trigger || "manual";
  heal.pendingFixes = pending.slice();
  heal.approvedPending = approvedPending.slice();
  heal.appliedFixes = applied.slice();
  heal.productionMode = isProductionMode();

  if (meta?.appliedInCycle) {
    heal.status = "applied";
  } else if (pending.length > 0 || approvedPending.length > 0) {
    heal.status = "pending";
  } else {
    heal.status = "idle";
  }

  heal.diagnostics = window.__NIKA_STATE__?.diagnostics || window.__NIKA_DIAGNOSTICS_LAST__ || null;

  window.__HEAL_STATUS__ = heal;
  return heal;
}

/**
 * Run self-heal cycle: diagnose → propose → (optional) apply approved.
 *
 * @param {{ trigger?: string, applyApproved?: boolean }} [options]
 * @returns {Promise<object>}
 */
export async function runSelfHealCycle(options) {
  const cycleOutcome = await runCycle(
    "nikaCycle",
    async function () {
      if (cycleRunning) {
        return window.__HEAL_STATUS__ || initHealStatus();
      }

      cycleRunning = true;
      const trigger = options?.trigger || "manual";
      const applyApproved = options?.applyApproved === true;

      try {
        const diagnostics = await runDiagnostics({ trigger: "heal:" + trigger });

        if (diagnostics) {
          updateFixProposals(diagnostics);
        } else {
          const fallback = window.__NIKA_STATE__?.diagnostics || window.__NIKA_DIAGNOSTICS_LAST__;
          if (fallback) {
            updateFixProposals(fallback);
          }
        }

        let appliedInCycle = false;

        if (applyApproved) {
          const approvedPending = readApprovedPending();
          if (approvedPending.length > 0) {
            if (typeof window.__APPLY_APPROVED_FIXES__ !== "function") {
              updateHealStatus({ trigger: trigger, appliedInCycle: false });
              window.__HEAL_STATUS__.applyBlocked = true;
              window.__HEAL_STATUS__.applyMessage = "Fix execution engine is not installed.";
            } else {
              await applyApprovedFixes();
              appliedInCycle = true;
            }
          }
        }

        const status = updateHealStatus({
          trigger: trigger,
          appliedInCycle: appliedInCycle
        });

        window.dispatchEvent(
          new CustomEvent("lifeos:heal-cycle-complete", {
            detail: status
          })
        );

        return status;
      } catch (error) {
        const heal = updateHealStatus({ trigger: options?.trigger || "manual", appliedInCycle: false });
        heal.error = String(error && error.message ? error.message : error);
        heal.status = "pending";
        window.__HEAL_STATUS__ = heal;
        return heal;
      } finally {
        cycleRunning = false;
      }
    },
    { async: true, force: options?.force === true }
  );

  if (cycleOutcome && (cycleOutcome.skipped || cycleOutcome.success === false)) {
    return window.__HEAL_STATUS__ || initHealStatus();
  }

  return cycleOutcome && cycleOutcome.result !== undefined ? cycleOutcome.result : cycleOutcome;
}

/**
 * Debounced heal cycle for event triggers (never auto-applies).
 * @param {string} [trigger]
 */
export function scheduleSelfHealCycle(trigger) {
  if (window.__HEAL_CYCLE_TIMER__) {
    clearTimeout(window.__HEAL_CYCLE_TIMER__);
  }

  window.__HEAL_CYCLE_TIMER__ = setTimeout(function () {
    window.__HEAL_CYCLE_TIMER__ = null;
    runSelfHealCycle({ trigger: trigger || "scheduled", applyApproved: false }).catch(function () {
      /* passive */
    });
  }, 500);
}

/**
 * Install self-heal loop hooks and global API.
 */
export function installSelfHealLoop() {
  if (loopInstalled) {
    return;
  }
  loopInstalled = true;

  initHealStatus();

  window.__RUN_HEAL_CYCLE__ = function () {
    return runSelfHealCycle({ trigger: "manual", applyApproved: true });
  };

  window.__RUN_HEAL_DIAGNOSE__ = function () {
    return runSelfHealCycle({ trigger: "manual_diagnose", applyApproved: false });
  };

  window.addEventListener("lifeos:diagnostics-boot", function () {
    scheduleSelfHealCycle("boot_complete");
  });

  window.addEventListener("lifeos:system-report", function () {
    scheduleSelfHealCycle("system_report");
  });

  window.addEventListener("lifeos:heal-cycle-complete", function () {
    if (typeof window.scheduleControlCenterRefresh === "function") {
      window.scheduleControlCenterRefresh("heal_cycle_complete");
    }
  });

  initHealStatus();
}

if (typeof window !== "undefined") {
  window.runSelfHealCycle = runSelfHealCycle;
  window.scheduleSelfHealCycle = scheduleSelfHealCycle;
  window.installSelfHealLoop = installSelfHealLoop;
}
