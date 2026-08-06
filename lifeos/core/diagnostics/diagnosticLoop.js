/**
 * Diagnostic Loop — reads system reports, analyzes, updates Nika state only.
 *
 * NO DOM mutation. NO renderEngine calls. NO UI control.
 */

import { readLatestSystemReport } from "./reportReader.js";
import { analyzeSystemReport } from "./diagnosticEngine.js";
import { runCycle } from "../performance/cycleManager.js";

let loopInstalled = false;
let diagnosticTimer = null;
let running = false;

function ensureNikaState() {
  if (!window.__NIKA_STATE__ || typeof window.__NIKA_STATE__ !== "object") {
    window.__NIKA_STATE__ = {
      mode: "advisory",
      ctr: 0,
      health: 100,
      events: [],
      insights: [],
      recommendations: [],
      alerts: [],
      diagnostics: {},
      fixProposals: [],
      approvedFixes: [],
      appliedFixes: []
    };
  }

  const state = window.__NIKA_STATE__;
  state.mode = state.mode || "advisory";
  state.events = Array.isArray(state.events) ? state.events : [];
  state.insights = Array.isArray(state.insights) ? state.insights : [];
  state.recommendations = Array.isArray(state.recommendations) ? state.recommendations : [];
  state.alerts = Array.isArray(state.alerts) ? state.alerts : [];
  state.fixProposals = Array.isArray(state.fixProposals) ? state.fixProposals : [];
  state.approvedFixes = Array.isArray(state.approvedFixes) ? state.approvedFixes : [];
  state.appliedFixes = Array.isArray(state.appliedFixes) ? state.appliedFixes : [];
  state.diagnostics = state.diagnostics || {};

  return state;
}

function mergeUniqueById(existing, incoming, idKey) {
  const map = new Map();
  existing.forEach(function (item) {
    if (item && item[idKey]) {
      map.set(item[idKey], item);
    }
  });
  incoming.forEach(function (item) {
    if (item && item[idKey]) {
      map.set(item[idKey], item);
    }
  });
  return Array.from(map.values());
}

function buildInsights(analysis) {
  return analysis.rootCauses.map(function (cause) {
    return {
      id: "insight-" + cause.code,
      severity: cause.severity === "critical" ? "high" : cause.severity === "warning" ? "medium" : "low",
      category: "diagnostics",
      message: cause.message,
      code: cause.code,
      source: "diagnosticLoop",
      at: Date.now()
    };
  });
}

function buildAlerts(analysis) {
  return analysis.issues
    .filter(function (issue) {
      return issue.severity === "critical" || issue.severity === "warning";
    })
    .map(function (issue) {
      return {
        id: "alert-" + issue.code,
        level: issue.severity === "critical" ? "critical" : "warning",
        code: issue.code,
        message: issue.message,
        at: Date.now()
      };
    });
}

/**
 * Apply diagnostic analysis to Nika state (state-only writes).
 * @param {object} analysis
 */
export function applyDiagnosticsToNika(analysis) {
  const nika = ensureNikaState();
  const now = new Date().toISOString();

  nika.diagnostics = {
    lastRun: now,
    stabilityScore: analysis.stabilityScore,
    issues: analysis.issues,
    rootCauses: analysis.rootCauses,
    recommendations: analysis.recommendations,
    riskLevel: analysis.riskLevel
  };

  const diagnosticInsights = buildInsights(analysis);
  nika.insights = mergeUniqueById(nika.insights, diagnosticInsights, "id");
  nika.recommendations = mergeUniqueById(nika.recommendations, analysis.recommendations, "id");
  nika.alerts = mergeUniqueById(nika.alerts, buildAlerts(analysis), "id");

  nika.health = analysis.stabilityScore;
  nika.mode = nika.mode || "advisory";

  window.__NIKA_STATE__ = nika;
  window.__NIKA_DIAGNOSTICS_LAST__ = nika.diagnostics;

  return nika.diagnostics;
}

/**
 * Run full diagnostic cycle: read report → analyze → update Nika.
 * @param {{ trigger?: string }} [meta]
 * @returns {Promise<object>}
 */
export async function runDiagnostics(meta) {
  const cycleOutcome = await runCycle(
    "diagnosticsCycle",
    async function () {
      if (running) {
        return window.__NIKA_DIAGNOSTICS_LAST__ || null;
      }

      running = true;
      try {
        const report = await readLatestSystemReport();
        const analysis = analyzeSystemReport(report);
        analysis.trigger = meta?.trigger || "manual";
        const diagnostics = applyDiagnosticsToNika(analysis);

        window.dispatchEvent(
          new CustomEvent("lifeos:diagnostics-complete", {
            detail: { diagnostics: diagnostics, analysis: analysis, report: report }
          })
        );

        return diagnostics;
      } finally {
        running = false;
      }
    },
    { async: true, force: meta?.force === true }
  );

  if (cycleOutcome && (cycleOutcome.skipped || cycleOutcome.success === false)) {
    return window.__NIKA_DIAGNOSTICS_LAST__ || null;
  }

  return cycleOutcome && cycleOutcome.result !== undefined ? cycleOutcome.result : cycleOutcome;
}

/**
 * Debounced diagnostic run.
 * @param {string} [trigger]
 */
export function scheduleDiagnostics(trigger) {
  if (diagnosticTimer) {
    clearTimeout(diagnosticTimer);
  }

  diagnosticTimer = setTimeout(function () {
    diagnosticTimer = null;
    runDiagnostics({ trigger: trigger || "scheduled" }).catch(function () {
      /* passive — never block boot */
    });
  }, 400);
}

/**
 * Install auto diagnostic loop hooks.
 */
export function installDiagnosticLoop() {
  if (loopInstalled) {
    return;
  }
  loopInstalled = true;

  window.__RUN_DIAGNOSTICS__ = function () {
    return runDiagnostics({ trigger: "manual" });
  };

  window.addEventListener("lifeos:system-report", function () {
    scheduleDiagnostics("system_report");
  });

  window.addEventListener("lifeos:diagnostics-boot", function () {
    scheduleDiagnostics("boot_complete");
  });
}

if (typeof window !== "undefined") {
  window.runDiagnostics = runDiagnostics;
  window.scheduleDiagnostics = scheduleDiagnostics;
  window.installDiagnosticLoop = installDiagnosticLoop;
  window.applyDiagnosticsToNika = applyDiagnosticsToNika;
}
