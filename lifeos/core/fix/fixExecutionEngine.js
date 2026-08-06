/**
 * Fix Execution Engine — applies ONLY user-approved fixes via safe state paths.
 *
 * RULES:
 * - Never runs automatically
 * - Never mutates DOM directly
 * - Uses renderEngine applyState for UI changes
 * - Invokes registered service inits only through whitelisted handlers
 */

import { listApprovedFixes } from "./approvalGate.js";

/** Whitelisted state/service actions keyed by linkedIssue code. */
const SAFE_FIX_ACTIONS = {
  app_not_ready: {
    type: "state",
    patch: {
      shell: { appReady: true, preloaderHidden: true }
    }
  },
  video_paused: {
    type: "state",
    patch: {
      video: { visible: true }
    },
    after: "heroVideoPlayer"
  },
  video_section_hidden: {
    type: "state",
    patch: {
      video: { visible: true }
    }
  },
  ui_sections_hidden: {
    type: "state",
    patch: {
      ui: { sectionsVisible: true }
    }
  },
  hero_video_missing: {
    type: "state",
    patch: {
      video: { visible: true },
      shell: { appReady: true, preloaderHidden: true }
    },
    after: "heroVideoPlayer"
  },
  nika_state_missing: {
    type: "service",
    service: "analyticsBridge"
  },
  nika_health_low: {
    type: "service",
    service: "diagnostics"
  },
  report_missing: {
    type: "service",
    service: "systemReport"
  }
};

function ensureNikaState() {
  if (!window.__NIKA_STATE__ || typeof window.__NIKA_STATE__ !== "object") {
    window.__NIKA_STATE__ = {
      fixProposals: [],
      approvedFixes: [],
      appliedFixes: []
    };
  }
  window.__NIKA_STATE__.appliedFixes = Array.isArray(window.__NIKA_STATE__.appliedFixes)
    ? window.__NIKA_STATE__.appliedFixes
    : [];
  return window.__NIKA_STATE__;
}

async function runServiceAction(serviceName) {
  if (serviceName === "analyticsBridge" && typeof window.__LIFEOS_ANALYTICS_BRIDGE_ACTIVE__ !== "true") {
    const mod = await import("../analytics/analyticsBridge.js");
    if (mod && typeof mod.initAnalyticsBridge === "function") {
      mod.initAnalyticsBridge();
    }
    return { ok: true, service: "analyticsBridge" };
  }

  if (serviceName === "diagnostics" && typeof window.__RUN_DIAGNOSTICS__ === "function") {
    await window.__RUN_DIAGNOSTICS__();
    return { ok: true, service: "diagnostics" };
  }

  if (serviceName === "systemReport" && typeof window.__GENERATE_SYSTEM_REPORT__ === "function") {
    window.__GENERATE_SYSTEM_REPORT__("fix_execution");
    return { ok: true, service: "systemReport" };
  }

  if (serviceName === "heroVideoPlayer" && typeof window.initHeroVideoPlayer === "function") {
    window.initHeroVideoPlayer();
    return { ok: true, service: "heroVideoPlayer" };
  }

  return { ok: false, reason: "service_unavailable", service: serviceName };
}

/**
 * Apply a single approved fix safely.
 * @param {object} approval
 * @returns {Promise<object>}
 */
async function applyOneFix(approval) {
  const action = SAFE_FIX_ACTIONS[approval.linkedIssue];
  const auditEntry = {
    id: approval.id,
    linkedIssue: approval.linkedIssue,
    target: approval.target,
    startedAt: new Date().toISOString(),
    ok: false
  };

  if (!action) {
    auditEntry.reason = "no_safe_action";
    auditEntry.message = "Fix requires manual intervention — patch is advisory only.";
    auditEntry.completedAt = new Date().toISOString();
    return auditEntry;
  }

  try {
    if (action.type === "state") {
      if (typeof window.applyState !== "function") {
        auditEntry.reason = "render_engine_unavailable";
        auditEntry.completedAt = new Date().toISOString();
        return auditEntry;
      }

      const current = window.__APP_STATE__ || {};
      const nextPatch = Object.assign({}, current);
      if (action.patch.video) {
        nextPatch.video = Object.assign({}, current.video || {}, action.patch.video);
      }
      if (action.patch.ui) {
        nextPatch.ui = Object.assign({}, current.ui || {}, action.patch.ui);
      }
      if (action.patch.shell) {
        nextPatch.shell = Object.assign({}, current.shell || {}, action.patch.shell);
      }

      window.applyState(nextPatch);
      auditEntry.action = "applyState";
      auditEntry.patch = action.patch;
      auditEntry.ok = true;
    }

    if (action.type === "service") {
      const serviceResult = await runServiceAction(action.service);
      auditEntry.action = "service";
      auditEntry.service = action.service;
      auditEntry.ok = serviceResult.ok === true;
      if (!serviceResult.ok) {
        auditEntry.reason = serviceResult.reason || "service_failed";
      }
    }

    if (action.after) {
      const afterResult = await runServiceAction(action.after);
      auditEntry.after = action.after;
      if (!afterResult.ok) {
        auditEntry.afterWarning = afterResult.reason || "after_service_failed";
      }
    }
  } catch (error) {
    auditEntry.ok = false;
    auditEntry.reason = "execution_error";
    auditEntry.message = String(error && error.message ? error.message : error);
  }

  auditEntry.completedAt = new Date().toISOString();
  return auditEntry;
}

/**
 * Apply all approved fixes manually. Never called automatically.
 * @returns {Promise<object>}
 */
export async function applyApprovedFixes() {
  const nika = ensureNikaState();
  const pending = listApprovedFixes();
  const results = [];

  for (let i = 0; i < pending.length; i++) {
    const approval = pending[i];
    const result = await applyOneFix(approval);
    results.push(result);

    if (result.ok) {
      approval.status = "applied";
      approval.executed = true;
      approval.appliedAt = result.completedAt;

      const proposal = nika.fixProposals.find(function (p) {
        return p.id === approval.id;
      });
      if (proposal) {
        proposal.status = "applied";
        proposal.appliedAt = result.completedAt;
      }

      nika.appliedFixes.push({
        id: approval.id,
        linkedIssue: approval.linkedIssue,
        target: approval.target,
        appliedAt: result.completedAt,
        audit: result
      });
    }
  }

  window.__NIKA_STATE__ = nika;
  window.__FIX_EXECUTION_LAST__ = {
    at: new Date().toISOString(),
    count: results.length,
    results: results
  };

  window.dispatchEvent(
    new CustomEvent("lifeos:fixes-applied", {
      detail: window.__FIX_EXECUTION_LAST__
    })
  );

  return window.__FIX_EXECUTION_LAST__;
}

/**
 * Install manual execution hook only.
 */
export function installFixExecutionEngine() {
  window.__APPLY_APPROVED_FIXES__ = applyApprovedFixes;
}

if (typeof window !== "undefined") {
  window.applyApprovedFixes = applyApprovedFixes;
  window.installFixExecutionEngine = installFixExecutionEngine;
}
