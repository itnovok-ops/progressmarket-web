/**
 * Action Orchestrator — consumes Nika decisions and dispatches autopilot execution.
 */

import { executeDecisionBatch } from "./actionEngine.js";
import { isExecutionAllowed, logAction, publishActionState } from "./actionLog.js";
import { getAppRoot } from "./autopilotStyles.js";
import { canExecuteAutopilot } from "../control/executionGuard.js";
import { getIntervalFor } from "../control/loadBalancer.js";

const AUTOPILOT_EVENT = "lifeos:autopilot:update";
let started = false;
let cycleTimer = 0;
const executedIds = new Set();

/**
 * @returns {object[]}
 */
function getNikaDecisions() {
  try {
    if (window.__LIFEOS_PRODUCTION_MODE__ === true) {
      const approved = window.__NIKA_APPROVED_DECISIONS__;
      if (!Array.isArray(approved) || !approved.length) {
        return [];
      }
      return approved.filter(function (decision) {
        return decision.explicit_approval === true || decision.user_approved === true;
      });
    }

    const gateActive = window.__NIKA_APPROVAL_STATE__?.active === true;
    const approved = window.__NIKA_APPROVED_DECISIONS__;
    if (gateActive && Array.isArray(approved)) {
      return approved;
    }
    if (!gateActive) {
      const decisions = window.__NIKA_DECISIONS__;
      return Array.isArray(decisions) ? decisions : [];
    }
    return [];
  } catch (_error) {
    return [];
  }
}

/**
 * @param {object[]} decisions
 * @returns {object[]}
 */
function filterFreshDecisions(decisions) {
  return decisions.filter(function (d) {
    if (!d || !d.id) {
      return true;
    }
    if (d.priority === "HIGH") {
      return true;
    }
    if (executedIds.has(d.id)) {
      return false;
    }
    return true;
  });
}

/**
 * @param {ParentNode} [root]
 * @returns {object}
 */
export function runAutopilotCycle(root) {
  try {
    if (window.__LIFEOS_PRODUCTION_MODE__ === true && !canExecuteAutopilot()) {
      publishActionState({
        active: false,
        idle: true,
        reason: "production_awaiting_explicit_approval",
        last_cycle_at: Date.now()
      });
      return { ok: true, skipped: true, reason: "production_awaiting_explicit_approval" };
    }

    if (!isExecutionAllowed() || !canExecuteAutopilot()) {
      publishActionState({ active: false, reason: "execution_not_allowed" });
      return { ok: false, skipped: true, reason: "control_layer_blocked" };
    }

    const scope = getAppRoot(root);
    let decisions = getNikaDecisions();

    if (!decisions.length) {
      logAction("info", "No Nika decisions — autopilot idle");
      publishActionState({ active: true, idle: true, last_cycle_at: Date.now() });
      return { ok: true, idle: true };
    }

    decisions = filterFreshDecisions(decisions);

    const batch = executeDecisionBatch(decisions, scope, { maxActions: 3 });

    batch.applied.forEach(function (item) {
      if (item.decision_id) {
        executedIds.add(item.decision_id);
      }
    });

    if (executedIds.size > 200) {
      executedIds.clear();
    }

    const payload = {
      ok: true,
      applied_count: batch.applied.length,
      skipped_count: batch.skipped.length,
      batch: batch,
      generated_at: Date.now()
    };

    window.__LIFEOS_AUTOPILOT_LAST_CYCLE__ = payload;

    document.dispatchEvent(
      new CustomEvent(AUTOPILOT_EVENT, { detail: payload })
    );

    return payload;
  } catch (error) {
    logAction("error", "Autopilot cycle failed safely", { error: String(error) });
    return { ok: false };
  }
}

/**
 * @param {{ intervalMs?: number, root?: ParentNode }} [options]
 */
export function startAutopilot(options) {
  if (started) {
    return runAutopilotCycle(options?.root);
  }

  started = true;
  publishActionState({ active: true, started_at: Date.now() });
  window.__LIFEOS_ACTION_LOG__ = window.__LIFEOS_ACTION_LOG__ || [];
  window.__LIFEOS_ACTION_STATE__ = window.__LIFEOS_ACTION_STATE__ || {
    active: false,
    applied: [],
    skipped: []
  };
  logAction("info", "Autopilot started");

  const root = options?.root || document.getElementById("app");
  const interval = options?.intervalMs || getIntervalFor("autopilot") || 20000;

  if (!interval || interval <= 0) {
    logAction("info", "Autopilot interval disabled by control layer");
    publishActionState({ active: false, reason: "autopilot_disabled_by_control" });
    window.__LIFEOS_RUN_AUTOPILOT__ = function () {
      return runAutopilotCycle(root);
    };
    return window.__LIFEOS_ACTION_STATE__;
  }

  window.setTimeout(function () {
    runAutopilotCycle(root);
  }, 2500);

  cycleTimer = window.setInterval(function () {
    runAutopilotCycle(root);
  }, interval);

  document.addEventListener("lifeos:nika:update", function () {
    runAutopilotCycle(root);
  });

  document.addEventListener("lifeos:nika:approval:update", function () {
    runAutopilotCycle(root);
  });

  window.__LIFEOS_RUN_AUTOPILOT__ = function () {
    return runAutopilotCycle(root);
  };

  return window.__LIFEOS_ACTION_STATE__;
}

/**
 * Stop autopilot timer.
 */
export function stopAutopilot() {
  if (cycleTimer) {
    window.clearInterval(cycleTimer);
    cycleTimer = 0;
  }
  started = false;
  publishActionState({ active: false });
}
