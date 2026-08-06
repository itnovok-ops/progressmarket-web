/**
 * Nika control layer auditor (read-only).
 */

/**
 * @returns {object}
 */
export function auditNika() {
  const state = window.__NIKA_STATE__ || null;
  const report = window.__NIKA_REPORT__ || null;
  const decisions = window.__NIKA_DECISIONS__ || [];
  const approval = window.__NIKA_APPROVAL_STATE__ || null;
  const proposals = window.__NIKA_PROPOSALS__ || [];

  const insights = state?.insights || report?.insights || [];
  const anomalies = state?.anomalies || report?.anomalies || [];
  const recommendations = state?.recommendations || report?.recommendations || [];

  const decisionEngine = auditDecisionEngine(decisions, state);
  const insightsQuality = auditInsightsQuality(insights);
  const anomalyDetection = auditAnomalyDetection(anomalies);
  const recommendationSystem = auditRecommendationSystem(recommendations, decisions);

  const status = resolveNikaStatus(report, state, decisionEngine, insightsQuality);

  return {
    status: status,
    active: Boolean(state || report),
    mode: state?.mode || report?.mode || "unknown",
    system_health: state?.systemHealth || report?.systemHealth || "unknown",
    cycle: {
      last_update: state?.updated_at || report?.generated_at || null,
      runner_available: typeof window.__NIKA_RUN_CYCLE__ === "function"
    },
    decision_engine: decisionEngine,
    insights: insightsQuality,
    anomaly_detection: anomalyDetection,
    recommendation_system: recommendationSystem,
    approval_gate: {
      active: approval?.active === true,
      pending: approval?.pending ?? 0,
      blocked: approval?.blocked ?? 0,
      approved: approval?.approved ?? 0,
      proposals_count: Array.isArray(proposals) ? proposals.length : 0
    },
    counts: {
      insights: insights.length,
      anomalies: anomalies.length,
      decisions: decisions.length,
      recommendations: recommendations.length,
      high_priority_decisions: decisions.filter(function (d) { return d.priority === "HIGH"; }).length
    },
    audited_at: Date.now()
  };
}

/**
 * @param {object[]} decisions
 * @param {object|null} state
 * @returns {object}
 */
function auditDecisionEngine(decisions, state) {
  const withTarget = decisions.filter(function (d) { return Boolean(d.target); }).length;
  const withParams = decisions.filter(function (d) { return d.params && Object.keys(d.params).length > 0; }).length;
  const competitive = decisions.filter(function (d) { return d.competitive === true; }).length;
  const advisory = decisions.filter(function (d) { return d.advisory !== false; }).length;

  return {
    status: state ? "OK" : "WARN",
    decisions_total: decisions.length,
    with_target: withTarget,
    with_params: withParams,
    competitive_sourced: competitive,
    advisory_only: advisory,
    coverage_pct: decisions.length ? Math.round((withTarget / decisions.length) * 100) : 0,
    health: decisions.length > 0 && withTarget > 0 ? "OK" : decisions.length === 0 ? "WARN" : "WARN"
  };
}

/**
 * @param {object[]} insights
 * @returns {object}
 */
function auditInsightsQuality(insights) {
  const high = insights.filter(function (i) { return i.severity === "high"; }).length;
  const categories = {};
  insights.forEach(function (i) {
    const cat = i.category || "unknown";
    categories[cat] = (categories[cat] || 0) + 1;
  });

  const withEvidence = insights.filter(function (i) {
    return i.evidence && Object.keys(i.evidence).length > 0;
  }).length;

  return {
    status: insights.length > 0 ? "OK" : "WARN",
    total: insights.length,
    high_severity: high,
    categories: categories,
    evidence_coverage_pct: insights.length ? Math.round((withEvidence / insights.length) * 100) : 0,
    health: insights.length >= 1 && withEvidence > 0 ? "OK" : "WARN"
  };
}

/**
 * @param {object[]} anomalies
 * @returns {object}
 */
function auditAnomalyDetection(anomalies) {
  const high = anomalies.filter(function (a) { return a.severity === "high"; }).length;
  const codes = anomalies.map(function (a) { return a.code; }).filter(Boolean);

  return {
    status: anomalies.length > 0 ? "ACTIVE" : "IDLE",
    total: anomalies.length,
    high_severity: high,
    codes: codes,
    health: high > 2 ? "FAIL" : high > 0 ? "WARN" : "OK"
  };
}

/**
 * @param {object[]} recommendations
 * @param {object[]} decisions
 * @returns {object}
 */
function auditRecommendationSystem(recommendations, decisions) {
  const linked = recommendations.length > 0 || decisions.length > 0;

  return {
    status: linked ? "OK" : "WARN",
    recommendations_total: recommendations.length,
    decisions_total: decisions.length,
    advisory_mode: true,
    health: recommendations.length > 0 ? "OK" : "WARN"
  };
}

/**
 * @param {object|null} report
 * @param {object|null} state
 * @param {object} decisionEngine
 * @param {object} insights
 * @returns {string}
 */
function resolveNikaStatus(report, state, decisionEngine, insights) {
  if (!report && !state) {
    return "FAIL";
  }
  if (decisionEngine.health === "FAIL" || insights.health === "FAIL") {
    return "FAIL";
  }
  if (report?.systemHealth === "FAIL") {
    return "FAIL";
  }
  if (report?.systemHealth === "WARN" || decisionEngine.health === "WARN") {
    return "WARN";
  }
  return "OK";
}
