/**
 * System Audit Core — full LifeOS diagnostics (read-only, no execution).
 */

import { auditCore, mergeStorageProbe, probeServerStorage } from "./coreAuditor.js";
import { auditAgents } from "./agentsAuditor.js";
import { auditNika } from "./nikaAuditor.js";
import { auditAutopilot } from "./autopilotAuditor.js";
import { auditCompetitive } from "./competitiveAuditor.js";
import { analyzeRisks, scoreToLabel } from "./riskAnalyzer.js";
import { guardObservabilityCycle } from "../control/executionGuard.js";
import { getIntervalFor } from "../control/loadBalancer.js";

const AUDIT_EVENT = "lifeos:audit:update";
let lastReport = null;
let auditStarted = false;

/**
 * Build full system report synchronously (no network probes).
 * @returns {object}
 */
export function runSystemAuditSync() {
  if (!guardObservabilityCycle("audit", "sync")) {
    return lastReport || { ok: true, skipped: true };
  }
  const core = auditCore();
  const report = assembleReport(core);
  publishReport(report);
  return report;
}

/**
 * Build full system report with async server storage probe.
 * @param {{ probeStorage?: boolean }} [options]
 * @returns {Promise<object>}
 */
export async function runSystemAudit(options) {
  if (!guardObservabilityCycle("audit", "async")) {
    return lastReport || { ok: true, skipped: true };
  }
  let core = auditCore();

  if (options?.probeStorage !== false) {
    const serverProbe = await probeServerStorage(options?.storageTimeoutMs);
    core = mergeStorageProbe(core, serverProbe);
  }

  const report = assembleReport(core);
  publishReport(report);
  return report;
}

/**
 * @param {object} core
 * @returns {object}
 */
function assembleReport(core) {
  const agents = auditAgents();
  const nika = auditNika();
  const autopilot = auditAutopilot();
  const competitive = auditCompetitive();

  const partial = {
    ok: true,
    mode: "diagnostics",
    core: core,
    agents: agents,
    nika: nika,
    autopilot: autopilot,
    competitive: competitive,
    generated_at: Date.now()
  };

  const riskResult = analyzeRisks(partial);

  return Object.assign(partial, {
    health_score: riskResult.health_score,
    health_label: scoreToLabel(riskResult.health_score),
    risks: riskResult.risks,
    summary: buildSummary(partial, riskResult)
  });
}

/**
 * @param {object} report
 * @param {{ health_score: number, risks: object[] }} riskResult
 * @returns {string}
 */
function buildSummary(report, riskResult) {
  return (
    "LifeOS audit: score " +
    riskResult.health_score +
    "/100 (" +
    scoreToLabel(riskResult.health_score) +
    "), " +
    riskResult.risks.length +
    " risk(s), core=" +
    (report.core?.status || "?") +
    ", agents=" +
    (report.agents?.status || "?") +
    ", nika=" +
    (report.nika?.status || "?") +
    ", autopilot=" +
    (report.autopilot?.status || "?") +
    ", competitive=" +
    (report.competitive?.status || "?")
  );
}

/**
 * @param {object} report
 */
function publishReport(report) {
  try {
    lastReport = report;
    window.__LIFEOS_SYSTEM_REPORT__ = report;

    window.__LIFEOS_GET_SYSTEM_REPORT__ = function () {
      return window.__LIFEOS_SYSTEM_REPORT__ || lastReport;
    };

    window.__LIFEOS_RUN_SYSTEM_AUDIT__ = function (opts) {
      return runSystemAudit(opts || {});
    };

    window.__LIFEOS_RUN_SYSTEM_AUDIT_SYNC__ = runSystemAuditSync;

    document.dispatchEvent(
      new CustomEvent(AUDIT_EVENT, { detail: report })
    );
  } catch (_error) {
    /* audit must never throw */
  }
}

/**
 * Start periodic read-only system audit.
 * @param {{ intervalMs?: number, probeStorage?: boolean }} [options]
 */
export function startSystemAudit(options) {
  const interval = options?.intervalMs || getIntervalFor("audit") || 45000;
  const probeStorage = options?.probeStorage !== false;

  if (!auditStarted) {
    auditStarted = true;

    window.setInterval(function () {
      runSystemAudit({ probeStorage: probeStorage }).catch(function () {
        runSystemAuditSync();
      });
    }, interval);

    document.addEventListener("lifeos:nika:update", function () {
      runSystemAuditSync();
    });

    document.addEventListener("lifeos:agents:update", function () {
      runSystemAuditSync();
    });

    document.addEventListener("lifeos:autopilot:update", function () {
      runSystemAuditSync();
    });

    document.addEventListener("lifeos:competitive:update", function () {
      runSystemAuditSync();
    });
  }

  return runSystemAudit({ probeStorage: probeStorage });
}

/**
 * @returns {object|null}
 */
export function getLastSystemReport() {
  return lastReport;
}
