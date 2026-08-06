/**
 * System Report Generator — passive read-only diagnostics + async file persistence.
 *
 * Does NOT modify UI, DOM layout, or application state.
 */

import { debounce } from "../performance/throttle.js";
import { runCycle } from "../performance/cycleManager.js";

const REPORT_ENDPOINTS = ["/api/v1/system-report.php", "/api/v1/system-report"];

let hooksInstalled = false;

function runScheduledReport(trigger) {
  runCycle(
    "analyticsCycle",
    function () {
      const report = generateSystemReport({ trigger: trigger || "scheduled" });
      persistSystemReport(report);
      window.dispatchEvent(
        new CustomEvent("lifeos:system-report", {
          detail: report
        })
      );
    },
    { force: false }
  );
}

const debouncedReport = debounce(function (trigger) {
  runScheduledReport(trigger);
}, 300);

function resolveReportEndpoints() {
  const base = window.location.pathname || "/";
  const inLanding = base.includes("/landing");
  if (inLanding) {
    return ["../api/v1/system-report.php", "../api/v1/system-report", ...REPORT_ENDPOINTS];
  }
  return REPORT_ENDPOINTS.slice();
}

function isVideoSectionVisible() {
  const section = document.getElementById("video") || document.querySelector('[data-section="video"]');
  if (!section) {
    return false;
  }
  const style = window.getComputedStyle(section);
  return style.display !== "none" && style.visibility !== "hidden" && !section.hidden;
}

function isVideoFullscreen(video) {
  if (!video) {
    return false;
  }
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  return fsEl === video;
}

function collectIssues(report) {
  const issues = [];
  const warnings = [];
  const critical = [];

  if (typeof window.applyState !== "function") {
    critical.push({
      code: "render_engine_missing",
      message: "renderEngine applyState is not available"
    });
  }

  const video = document.querySelector("#heroVideo");
  if (!video) {
    critical.push({
      code: "hero_video_missing",
      message: "#heroVideo element not found in DOM"
    });
  }

  const mount = document.getElementById("app");
  if (!mount || !mount.classList.contains("ready")) {
    warnings.push({
      code: "app_not_ready",
      message: "#app is not marked ready — page may still be booting"
    });
  }

  if (report.videoStatus.visible && video && video.paused) {
    warnings.push({
      code: "video_paused",
      message: "Video section is visible but playback is paused"
    });
  }

  const nikaHealth = report.nikaStatus.health;
  if (typeof nikaHealth === "number" && nikaHealth < 50) {
    warnings.push({
      code: "nika_health_low",
      message: "Nika health score is below 50"
    });
  }

  if (!window.__NIKA_STATE__ || !Array.isArray(window.__NIKA_STATE__.events)) {
    warnings.push({
      code: "nika_state_missing",
      message: "Nika analytics state is not initialized"
    });
  }

  report.issues = issues;
  report.warnings = warnings;
  report.critical = critical;
}

function computeSystemHealth(report) {
  let score = 100;
  score -= report.critical.length * 25;
  score -= report.warnings.length * 8;
  score -= report.issues.length * 4;

  if (report.uiStatus.renderEngine !== "active") {
    score -= 30;
  }
  if (!report.videoStatus.visible) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Build structured system report from current runtime state (read-only).
 * @param {{ trigger?: string }} [meta]
 * @returns {object}
 */
export function generateSystemReport(meta) {
  const appState = window.__APP_STATE__ || {};
  const nikaState = window.__NIKA_STATE__ || {};
  const video = document.querySelector("#heroVideo");

  const report = {
    timestamp: new Date().toISOString(),
    trigger: meta?.trigger || "manual",
    systemHealth: 100,
    videoStatus: {
      visible: isVideoSectionVisible(),
      sound: Boolean(video && !video.muted),
      fullscreen: isVideoFullscreen(video)
    },
    uiStatus: {
      renderEngine: typeof window.applyState === "function" ? "active" : "broken",
      sectionsVisible: appState.ui?.sectionsVisible !== false
    },
    nikaStatus: {
      mode: nikaState.mode || "advisory",
      eventsCollected: Array.isArray(nikaState.events) ? nikaState.events.length : 0,
      health: typeof nikaState.health === "number" ? nikaState.health : 100
    },
    issues: [],
    warnings: [],
    critical: []
  };

  collectIssues(report);
  report.systemHealth = computeSystemHealth(report);

  window.__SYSTEM_REPORT_LAST__ = report;
  return report;
}

/**
 * Persist report to /reports via backend endpoint (non-blocking).
 * @param {object} report
 */
function persistSystemReport(report) {
  const body = JSON.stringify(report);
  const endpoints = resolveReportEndpoints();

  function tryEndpoint(index) {
    if (index >= endpoints.length) {
      return;
    }

    fetch(endpoints[index], {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: body,
      keepalive: true
    })
      .then(function (response) {
        if (response.ok) {
          window.dispatchEvent(
            new CustomEvent("lifeos:system-report", {
              detail: report
            })
          );
          return;
        }
        tryEndpoint(index + 1);
      })
      .catch(function () {
        tryEndpoint(index + 1);
      });
  }

  tryEndpoint(0);
}

/**
 * Debounced async report generation + file write.
 * @param {string} [trigger]
 */
export function scheduleSystemReport(trigger) {
  debouncedReport(trigger || "scheduled");
}

function bindVideoReportTriggers() {
  const video = document.querySelector("#heroVideo");
  if (!video || video.dataset.systemReportBound === "true") {
    return;
  }

  video.dataset.systemReportBound = "true";
  ["play", "pause", "volumechange", "ended"].forEach(function (eventName) {
    video.addEventListener(
      eventName,
      function () {
        scheduleSystemReport("video:" + eventName);
      },
      { passive: true }
    );
  });
}

/**
 * Install passive hooks: applyState wrapper, fullscreen, video events, manual API.
 */
export function installSystemReportHooks() {
  if (hooksInstalled) {
    return;
  }
  hooksInstalled = true;

  const originalApplyState = window.applyState;
  if (typeof originalApplyState === "function" && !window.__SYSTEM_REPORT_APPLY_WRAPPED__) {
    window.__SYSTEM_REPORT_APPLY_WRAPPED__ = true;
    window.applyState = function wrappedApplyState(state) {
      const result = originalApplyState(state);
      scheduleSystemReport("applyState");
      return result;
    };
  }

  document.addEventListener(
    "fullscreenchange",
    function () {
      scheduleSystemReport("fullscreenchange");
    },
    { passive: true }
  );

  document.addEventListener(
    "webkitfullscreenchange",
    function () {
      scheduleSystemReport("webkitfullscreenchange");
    },
    { passive: true }
  );

  window.__GENERATE_SYSTEM_REPORT__ = function generateAndPersist(trigger) {
    const report = generateSystemReport({ trigger: trigger || "manual" });
    persistSystemReport(report);
    window.dispatchEvent(
      new CustomEvent("lifeos:system-report", {
        detail: report
      })
    );
    return report;
  };

  bindVideoReportTriggers();
}

if (typeof window !== "undefined") {
  window.generateSystemReport = generateSystemReport;
  window.scheduleSystemReport = scheduleSystemReport;
  window.installSystemReportHooks = installSystemReportHooks;
}
