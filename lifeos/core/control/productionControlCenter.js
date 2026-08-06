/**
 * Production Control Center — read-only aggregation of full system state.
 *
 * NO DOM mutation. NO rendering logic. READ ONLY.
 */

let hooksInstalled = false;
let refreshTimer = null;

function readVideoStatus() {
  const video = document.querySelector("#heroVideo");
  const section = document.getElementById("video") || document.querySelector('[data-section="video"]');
  const report = window.__SYSTEM_REPORT_LAST__;

  if (report && report.videoStatus) {
    return {
      visible: report.videoStatus.visible === true,
      sound: report.videoStatus.sound === true,
      fullscreen: report.videoStatus.fullscreen === true
    };
  }

  let visible = false;
  if (section) {
    const style = window.getComputedStyle(section);
    visible = style.display !== "none" && style.visibility !== "hidden" && !section.hidden;
  }

  let fullscreen = false;
  if (video) {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    fullscreen = fsEl === video;
  }

  return {
    visible: visible,
    sound: Boolean(video && !video.muted),
    fullscreen: fullscreen
  };
}

function readUiStatus(appState) {
  const mount = document.getElementById("app");
  const hasPageHtml = Boolean(appState?.page?.html);
  const appReady = appState?.shell?.appReady !== false;
  const sectionsVisible = appState?.ui?.sectionsVisible !== false;
  const renderEngineActive = typeof window.applyState === "function";

  const rendered = Boolean(
    mount &&
      mount.classList.contains("ready") &&
      hasPageHtml &&
      mount.innerHTML &&
      mount.innerHTML.length > 0
  );

  const stable = renderEngineActive && appReady && sectionsVisible && rendered;

  return {
    rendered: rendered,
    stable: stable,
    renderEngine: renderEngineActive ? "active" : "broken",
    sectionsVisible: sectionsVisible,
    appReady: appReady
  };
}

function collectErrorsAndWarnings(nikaState, diagnostics, systemReport) {
  const errors = [];
  const warnings = [];

  (diagnostics?.issues || []).forEach(function (issue) {
    const entry = {
      code: issue.code,
      message: issue.message,
      source: "diagnostics",
      severity: issue.severity
    };
    if (issue.severity === "critical") {
      errors.push(entry);
    } else {
      warnings.push(entry);
    }
  });

  (nikaState?.alerts || []).forEach(function (alert) {
    const entry = {
      code: alert.code,
      message: alert.message,
      source: "nika",
      severity: alert.level
    };
    if (alert.level === "critical") {
      errors.push(entry);
    } else {
      warnings.push(entry);
    }
  });

  (systemReport?.critical || []).forEach(function (item) {
    errors.push({
      code: item.code,
      message: item.message,
      source: "systemReport",
      severity: "critical"
    });
  });

  (systemReport?.warnings || []).forEach(function (item) {
    warnings.push({
      code: item.code,
      message: item.message,
      source: "systemReport",
      severity: "warning"
    });
  });

  return { errors: errors, warnings: warnings };
}

function resolveSystemHealth(nikaState, diagnostics, systemReport) {
  if (typeof diagnostics?.stabilityScore === "number") {
    return Math.max(0, Math.min(100, diagnostics.stabilityScore));
  }
  if (typeof systemReport?.systemHealth === "number") {
    return Math.max(0, Math.min(100, systemReport.systemHealth));
  }
  if (typeof nikaState?.health === "number") {
    return Math.max(0, Math.min(100, nikaState.health));
  }
  return 0;
}

/**
 * Build read-only control center snapshot from all system sources.
 * @param {{ trigger?: string }} [meta]
 * @returns {object}
 */
export function buildControlCenterSnapshot(meta) {
  const appState = window.__APP_STATE__ || {};
  const nikaState = window.__NIKA_STATE__ || {};
  const diagnostics = nikaState.diagnostics || window.__NIKA_DIAGNOSTICS_LAST__ || {};
  const systemReport = window.__SYSTEM_REPORT_LAST__ || null;
  const issueBuckets = collectErrorsAndWarnings(nikaState, diagnostics, systemReport);

  return {
    timestamp: new Date().toISOString(),
    trigger: meta?.trigger || "manual",
    systemHealth: resolveSystemHealth(nikaState, diagnostics, systemReport),
    videoStatus: readVideoStatus(),
    uiStatus: readUiStatus(appState),
    nikaStatus: {
      mode: nikaState.mode || "advisory",
      health: typeof nikaState.health === "number" ? nikaState.health : null,
      eventsCollected: Array.isArray(nikaState.events) ? nikaState.events.length : 0,
      insights: Array.isArray(nikaState.insights) ? nikaState.insights.slice() : [],
      diagnostics: diagnostics && typeof diagnostics === "object" ? Object.assign({}, diagnostics) : {},
      recommendations: Array.isArray(nikaState.recommendations) ? nikaState.recommendations.slice() : [],
      alerts: Array.isArray(nikaState.alerts) ? nikaState.alerts.slice() : []
    },
    fixes: {
      proposed: Array.isArray(nikaState.fixProposals) ? nikaState.fixProposals.slice() : [],
      approved: Array.isArray(nikaState.approvedFixes)
        ? nikaState.approvedFixes.slice()
        : Array.isArray(window.__APPROVED_FIXES__)
          ? window.__APPROVED_FIXES__.slice()
          : [],
      applied: Array.isArray(nikaState.appliedFixes) ? nikaState.appliedFixes.slice() : []
    },
    appState: {
      video: appState.video ? Object.assign({}, appState.video) : {},
      ui: appState.ui ? Object.assign({}, appState.ui) : {},
      shell: appState.shell ? Object.assign({}, appState.shell) : {}
    },
    systemReport: systemReport ? Object.assign({}, systemReport) : null,
    errors: issueBuckets.errors,
    warnings: issueBuckets.warnings
  };
}

/**
 * Refresh global control center object (in-place update).
 * @param {{ trigger?: string }} [meta]
 * @returns {object}
 */
export function refreshControlCenter(meta) {
  const snapshot = buildControlCenterSnapshot(meta);

  if (!window.__LIFEOS_CONTROL_CENTER__ || typeof window.__LIFEOS_CONTROL_CENTER__ !== "object") {
    window.__LIFEOS_CONTROL_CENTER__ = snapshot;
  } else {
    Object.keys(window.__LIFEOS_CONTROL_CENTER__).forEach(function (key) {
      delete window.__LIFEOS_CONTROL_CENTER__[key];
    });
    Object.assign(window.__LIFEOS_CONTROL_CENTER__, snapshot);
  }

  window.__LIFEOS_CONTROL_CENTER_LAST_AT__ = snapshot.timestamp;

  window.dispatchEvent(
    new CustomEvent("lifeos:control-center-updated", {
      detail: snapshot
    })
  );

  return window.__LIFEOS_CONTROL_CENTER__;
}

/**
 * Debounced refresh for high-frequency events.
 * @param {string} [trigger]
 */
export function scheduleControlCenterRefresh(trigger) {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  refreshTimer = setTimeout(function () {
    refreshTimer = null;
    refreshControlCenter({ trigger: trigger || "scheduled" });
  }, 200);
}

/**
 * Install passive refresh hooks.
 */
export function installProductionControlCenter() {
  if (hooksInstalled) {
    return;
  }
  hooksInstalled = true;

  window.__REFRESH_CONTROL_CENTER__ = function (trigger) {
    return refreshControlCenter({ trigger: trigger || "manual" });
  };

  const events = [
    "lifeos:system-report",
    "lifeos:diagnostics-complete",
    "lifeos:fix-approved",
    "lifeos:fixes-applied",
    "lifeos:diagnostics-boot"
  ];

  events.forEach(function (eventName) {
    window.addEventListener(eventName, function () {
      scheduleControlCenterRefresh(eventName);
    });
  });

  refreshControlCenter({ trigger: "install" });
}

if (typeof window !== "undefined") {
  window.buildControlCenterSnapshot = buildControlCenterSnapshot;
  window.refreshControlCenter = refreshControlCenter;
  window.scheduleControlCenterRefresh = scheduleControlCenterRefresh;
  window.installProductionControlCenter = installProductionControlCenter;
}
