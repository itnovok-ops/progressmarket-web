/**
 * Observability Dashboard — final read-only visibility layer for LifeOS.
 *
 * Aggregates Control Center, Nika, diagnostics, reports, fixes, UI, and video.
 * NO DOM mutation. NO UI control. NO execution logic.
 */

import { buildControlCenterSnapshot } from "../control/productionControlCenter.js";

let hooksInstalled = false;
let refreshTimer = null;

function buildRisks(controlCenter) {
  const risks = [];

  (controlCenter.errors || []).forEach(function (item) {
    risks.push({
      level: "high",
      code: item.code,
      message: item.message,
      source: item.source
    });
  });

  (controlCenter.warnings || []).forEach(function (item) {
    risks.push({
      level: "medium",
      code: item.code,
      message: item.message,
      source: item.source
    });
  });

  const diagnostics = controlCenter.nikaStatus?.diagnostics;
  if (diagnostics?.riskLevel === "high") {
    risks.push({
      level: "high",
      code: "diagnostics_risk_high",
      message: "Diagnostic engine reports high system risk.",
      source: "diagnostics"
    });
  }

  return risks;
}

function buildFixPipelineStatus(controlCenter) {
  const heal = window.__HEAL_STATUS__ || {};
  const fixes = controlCenter.fixes || {};
  const proposed = fixes.proposed || [];
  const approved = fixes.approved || [];
  const applied = fixes.applied || [];

  return {
    status: heal.status || "idle",
    lastHealRun: heal.lastRun || null,
    proposed: proposed.length,
    approved: approved.length,
    applied: applied.length,
    pendingApproval: proposed.filter(function (f) {
      return f.status === "proposed";
    }).length,
    awaitingApply: approved.filter(function (f) {
      return f.executed !== true && f.status === "approved";
    }).length,
    proposals: proposed.slice(),
    approvedFixes: approved.slice(),
    appliedFixes: applied.slice(),
    lastExecution: window.__FIX_EXECUTION_LAST__ || null
  };
}

function buildSystemOverview(controlCenter) {
  return {
    healthScore: controlCenter.systemHealth,
    productionMode: window.__LIFEOS_PRODUCTION_MODE__ === true,
    bootState: window.__BOOT_STATE__ || "unknown",
    renderEngine: controlCenter.uiStatus?.renderEngine || "unknown",
    analyticsActive: window.__LIFEOS_ANALYTICS_BRIDGE_ACTIVE__ === true,
    videoPlayerBound: window.__HERO_VIDEO_PLAYER_BOUND__ === true,
    lastReportAt: controlCenter.systemReport?.timestamp || null,
    lastDiagnosticsAt: controlCenter.nikaStatus?.diagnostics?.lastRun || null,
    controlCenterAt: window.__LIFEOS_CONTROL_CENTER_LAST_AT__ || controlCenter.timestamp
  };
}

/**
 * Build observability dashboard snapshot.
 * @param {{ trigger?: string }} [meta]
 * @returns {object}
 */
export function buildObservabilityDashboard(meta) {
  const controlCenter = buildControlCenterSnapshot(meta);
  const nikaState = window.__NIKA_STATE__ || {};

  return {
    timestamp: new Date().toISOString(),
    trigger: meta?.trigger || "manual",
    systemOverview: buildSystemOverview(controlCenter),
    systemHealth: window.__SYSTEM_HEALTH__ || null,
    nikaInsights: {
      mode: controlCenter.nikaStatus?.mode || "advisory",
      health: controlCenter.nikaStatus?.health,
      ctr: typeof nikaState.ctr === "number" ? nikaState.ctr : null,
      eventsCollected: controlCenter.nikaStatus?.eventsCollected || 0,
      insights: controlCenter.nikaStatus?.insights || [],
      recommendations: controlCenter.nikaStatus?.recommendations || [],
      alerts: controlCenter.nikaStatus?.alerts || [],
      diagnostics: controlCenter.nikaStatus?.diagnostics || {},
      analytics: nikaState.analytics || null
    },
    uiStatus: {
      rendered: controlCenter.uiStatus?.rendered === true,
      stable: controlCenter.uiStatus?.stable === true,
      renderEngine: controlCenter.uiStatus?.renderEngine || "unknown",
      sectionsVisible: controlCenter.uiStatus?.sectionsVisible !== false,
      appReady: controlCenter.uiStatus?.appReady !== false,
      appState: controlCenter.appState || {}
    },
    videoStatus: Object.assign({}, controlCenter.videoStatus || {}, {
      stateVisible: controlCenter.appState?.video?.visible !== false,
      playerBound: window.__HERO_VIDEO_PLAYER_BOUND__ === true
    }),
    healthScore: controlCenter.systemHealth,
    risks: buildRisks(controlCenter),
    fixPipelineStatus: buildFixPipelineStatus(controlCenter),
    systemReport: controlCenter.systemReport || null,
    healStatus: window.__HEAL_STATUS__ || null,
    sources: {
      controlCenter: true,
      nikaState: Boolean(window.__NIKA_STATE__),
      systemReport: Boolean(window.__SYSTEM_REPORT_LAST__),
      diagnostics: Boolean(window.__NIKA_DIAGNOSTICS_LAST__),
      healLoop: Boolean(window.__HEAL_STATUS__)
    }
  };
}

/**
 * Refresh global observability dashboard (in-place).
 * @param {{ trigger?: string }} [meta]
 * @returns {object}
 */
export function refreshObservabilityDashboard(meta) {
  const snapshot = buildObservabilityDashboard(meta);

  if (
    !window.__LIFEOS_OBSERVABILITY_DASHBOARD__ ||
    typeof window.__LIFEOS_OBSERVABILITY_DASHBOARD__ !== "object"
  ) {
    window.__LIFEOS_OBSERVABILITY_DASHBOARD__ = snapshot;
  } else {
    Object.keys(window.__LIFEOS_OBSERVABILITY_DASHBOARD__).forEach(function (key) {
      delete window.__LIFEOS_OBSERVABILITY_DASHBOARD__[key];
    });
    Object.assign(window.__LIFEOS_OBSERVABILITY_DASHBOARD__, snapshot);
  }

  window.__LIFEOS_OBSERVABILITY_DASHBOARD_LAST_AT__ = snapshot.timestamp;

  window.dispatchEvent(
    new CustomEvent("lifeos:observability-dashboard-updated", {
      detail: snapshot
    })
  );

  return window.__LIFEOS_OBSERVABILITY_DASHBOARD__;
}

/**
 * Debounced dashboard refresh.
 * @param {string} [trigger]
 */
export function scheduleObservabilityDashboardRefresh(trigger) {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  refreshTimer = setTimeout(function () {
    refreshTimer = null;
    refreshObservabilityDashboard({ trigger: trigger || "scheduled" });
  }, 250);
}

/**
 * Install passive observability dashboard hooks.
 */
export function installObservabilityDashboard() {
  if (hooksInstalled) {
    return;
  }
  hooksInstalled = true;

  window.__REFRESH_OBSERVABILITY_DASHBOARD__ = function (trigger) {
    return refreshObservabilityDashboard({ trigger: trigger || "manual" });
  };

  const events = [
    "lifeos:diagnostics-boot",
    "lifeos:system-report",
    "lifeos:diagnostics-complete",
    "lifeos:fix-approved",
    "lifeos:fixes-applied",
    "lifeos:heal-cycle-complete",
    "lifeos:control-center-updated"
  ];

  events.forEach(function (eventName) {
    window.addEventListener(eventName, function () {
      scheduleObservabilityDashboardRefresh(eventName);
    });
  });

  refreshObservabilityDashboard({ trigger: "install" });
}

if (typeof window !== "undefined") {
  window.buildObservabilityDashboard = buildObservabilityDashboard;
  window.refreshObservabilityDashboard = refreshObservabilityDashboard;
  window.scheduleObservabilityDashboardRefresh = scheduleObservabilityDashboardRefresh;
  window.installObservabilityDashboard = installObservabilityDashboard;
}
