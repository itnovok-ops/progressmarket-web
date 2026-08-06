/**
 * Risk analyzer — health score and risk list for system audit.
 */

/**
 * @param {object} report
 * @returns {{ health_score: number, risks: object[] }}
 */
export function analyzeRisks(report) {
  const risks = [];
  let score = 100;

  penalizeCore(report.core, risks, function (n) { score -= n; });
  penalizeAgents(report.agents, risks, function (n) { score -= n; });
  penalizeNika(report.nika, risks, function (n) { score -= n; });
  penalizeAutopilot(report.autopilot, risks, function (n) { score -= n; });
  penalizeCompetitive(report.competitive, risks, function (n) { score -= n; });

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    health_score: score,
    risks: risks.sort(function (a, b) {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] || 9) - (order[b.severity] || 9);
    })
  };
}

/**
 * @param {string} severity
 * @param {string} system
 * @param {string} code
 * @param {string} message
 * @returns {object}
 */
function risk(severity, system, code, message) {
  return { severity: severity, system: system, code: code, message: message };
}

/**
 * @param {object} core
 * @param {object[]} risks
 * @param {function} penalize
 */
function penalizeCore(core, risks, penalize) {
  if (!core) {
    risks.push(risk("critical", "core", "core_missing", "Core audit data unavailable"));
    penalize(25);
    return;
  }

  if (core.status === "FAIL") {
    risks.push(risk("high", "core", "core_degraded", "Core system health is FAIL"));
    penalize(15);
  }

  if (core.session?.health === "FAIL") {
    risks.push(risk("high", "core", "session_down", "Session Core not initialized"));
    penalize(10);
  }

  if (core.growth?.health === "FAIL") {
    risks.push(risk("high", "core", "growth_inactive", "Growth Backend is inactive"));
    penalize(12);
  }

  if (core.event_pipeline?.health === "FAIL") {
    risks.push(risk("medium", "core", "pipeline_stalled", "Event pipeline not receiving events"));
    penalize(8);
  }

  if (core.storage?.health === "FAIL") {
    risks.push(risk("medium", "core", "storage_unreachable", "Server storage probe failed"));
    penalize(8);
  }
}

/**
 * @param {object} agents
 * @param {object[]} risks
 * @param {function} penalize
 */
function penalizeAgents(agents, risks, penalize) {
  if (!agents?.network_started) {
    risks.push(risk("high", "agents", "agent_network_off", "Agent network not started"));
    penalize(12);
    return;
  }

  if (agents.status === "FAIL") {
    risks.push(risk("high", "agents", "agent_system_fail", "Agent network system health FAIL"));
    penalize(15);
  }

  const supersite = agents.systems?.supersite;
  const lifeos = agents.systems?.lifeos;

  if (supersite?.health === "FAIL") {
    risks.push(risk("high", "agents", "supersite_agent_fail", "supersite-agent group has failed agents"));
    penalize(10);
  }

  if (lifeos?.health === "FAIL") {
    risks.push(risk("high", "agents", "lifeos_agent_fail", "lifeos-agent group has failed agents"));
    penalize(10);
  }

  if (agents.summary?.stale_count > 0) {
    risks.push(risk("medium", "agents", "heartbeat_stale", agents.summary.stale_count + " agent(s) with stale heartbeat"));
    penalize(5);
  }

  if (agents.summary?.total_errors >= 5) {
    risks.push(risk("medium", "agents", "agent_errors", "Elevated agent error count: " + agents.summary.total_errors));
    penalize(6);
  }
}

/**
 * @param {object} nika
 * @param {object[]} risks
 * @param {function} penalize
 */
function penalizeNika(nika, risks, penalize) {
  if (!nika?.active) {
    risks.push(risk("high", "nika", "nika_inactive", "Nika Control Layer not active"));
    penalize(12);
    return;
  }

  if (nika.status === "FAIL") {
    risks.push(risk("high", "nika", "nika_fail", "Nika system health FAIL"));
    penalize(10);
  }

  if (nika.anomaly_detection?.high_severity > 0) {
    risks.push(risk("medium", "nika", "anomalies_detected", nika.anomaly_detection.high_severity + " high-severity anomaly(ies)"));
    penalize(4);
  }

  if (nika.approval_gate?.blocked > 0) {
    risks.push(risk("low", "nika", "critical_blocked", nika.approval_gate.blocked + " CRITICAL proposal(s) blocked pending approval"));
    penalize(2);
  }
}

/**
 * @param {object} autopilot
 * @param {object[]} risks
 * @param {function} penalize
 */
function penalizeAutopilot(autopilot, risks, penalize) {
  if (autopilot?.status === "BLOCKED") {
    risks.push(risk("medium", "autopilot", "safety_blocked", "Autopilot blocked by safety rules"));
    penalize(4);
  }

  if (autopilot?.execution_log?.by_level?.error > 3) {
    risks.push(risk("medium", "autopilot", "execution_errors", "Multiple autopilot execution errors in log"));
    penalize(5);
  }

  if (autopilot?.blocked_actions?.count > 8) {
    risks.push(risk("low", "autopilot", "actions_blocked", "High number of blocked autopilot actions"));
    penalize(3);
  }
}

/**
 * @param {object} competitive
 * @param {object[]} risks
 * @param {function} penalize
 */
function penalizeCompetitive(competitive, risks, penalize) {
  if (!competitive?.loaded) {
    risks.push(risk("low", "competitive", "ci_inactive", "Competitive Intelligence not loaded"));
    penalize(3);
    return;
  }

  if (competitive.gap_analysis?.high_severity > 0) {
    risks.push(risk("medium", "competitive", "market_gaps", competitive.gap_analysis.high_severity + " high-severity competitive gap(s)"));
    penalize(5);
  }

  if (typeof competitive.market_score === "number" && competitive.market_score < 45) {
    risks.push(risk("medium", "competitive", "low_market_score", "Market alignment score below 45 (" + competitive.market_score + ")");
    penalize(6);
  }

  if (competitive.competitor_data?.analyzed === 0) {
    risks.push(risk("low", "competitive", "no_competitors", "No competitor pages analyzed — using benchmark fallback"));
    penalize(2);
  }
}

/**
 * @param {number} score
 * @returns {string}
 */
export function scoreToLabel(score) {
  if (score >= 85) {
    return "healthy";
  }
  if (score >= 65) {
    return "degraded";
  }
  if (score >= 40) {
    return "at_risk";
  }
  return "critical";
}
