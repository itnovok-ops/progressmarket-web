/**
 * Leak Detector — revenue leaks from CTA, funnel, engagement (SAFE MODE, read-only).
 */

/**
 * @param {object} sources
 * @param {object} funnelAnalysis
 * @param {object} trafficAttribution
 * @returns {object[]}
 */
export function detectLeaks(sources, funnelAnalysis, trafficAttribution) {
  const leaks = [];
  const landing = sources?.landing || {};
  const observer = window.__LIFEOS_OBSERVER_REPORT__ || null;

  if (typeof landing.ctr === "number" && landing.ctr < 0.02) {
    leaks.push({
      id: "leak-weak-cta",
      type: "weak_cta",
      severity: "high",
      impact: "revenue",
      message: "CTR critically low — CTA not converting traffic to intent",
      evidence: { ctr: landing.ctr, sessions: landing.sessions }
    });
  }

  (funnelAnalysis?.bottlenecks || []).forEach(function (b, index) {
    leaks.push({
      id: "leak-funnel-" + b.stage,
      type: "funnel_dropoff",
      severity: b.severity,
      impact: "revenue",
      message: "Severe drop-off at funnel stage '" + b.stage + "' (" + pct(b.drop_off) + ")",
      evidence: { stage: b.stage, drop_off: b.drop_off, rate: b.rate }
    });
    if (index >= 2) {
      return;
    }
  });

  if (typeof landing.video_engagement_rate === "number" && landing.video_engagement_rate < 0.15) {
    leaks.push({
      id: "leak-video-engagement",
      type: "poor_engagement",
      severity: "medium",
      impact: "revenue",
      message: "Video engagement below 15% — weak mid-funnel persuasion",
      evidence: { video_engagement_rate: landing.video_engagement_rate }
    });
  }

  if (trafficAttribution?.quality?.label === "low_quality") {
    leaks.push({
      id: "leak-traffic-quality",
      type: "traffic_quality",
      severity: "medium",
      impact: "revenue",
      message: "Traffic quality classified as LOW — poor ROI potential",
      evidence: trafficAttribution.quality
    });
  }

  const uiIssues = observer?.ui_scan?.issues || [];
  uiIssues.filter(function (i) { return i.severity === "high"; }).slice(0, 2).forEach(function (issue, idx) {
    leaks.push({
      id: "leak-ui-" + idx,
      type: "poor_engagement",
      severity: "high",
      impact: "revenue",
      message: "High-severity UI issue may block conversion: " + (issue.message || issue.section),
      evidence: issue
    });
  });

  if (funnelAnalysis?.cta_to_form < 0.3 && funnelAnalysis?.visit_to_cta > 0) {
    leaks.push({
      id: "leak-cta-to-form",
      type: "funnel_dropoff",
      severity: "high",
      impact: "revenue",
      message: "Users click CTA but rarely start the form — friction after CTA",
      evidence: { cta_to_form: funnelAnalysis.cta_to_form, visit_to_cta: funnelAnalysis.visit_to_cta }
    });
  }

  return leaks.sort(function (a, b) {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] || 9) - (order[b.severity] || 9);
  });
}

/**
 * @param {number} value
 * @returns {string}
 */
function pct(value) {
  return Math.round((value || 0) * 100) + "%";
}

/**
 * @param {object[]} leaks
 * @returns {object}
 */
export function summarizeLeaks(leaks) {
  return {
    total: leaks.length,
    high: leaks.filter(function (l) { return l.severity === "high"; }).length,
    medium: leaks.filter(function (l) { return l.severity === "medium"; }).length,
    types: leaks.reduce(function (acc, leak) {
      acc[leak.type] = (acc[leak.type] || 0) + 1;
      return acc;
    }, {})
  };
}
