/**
 * Revenue Insights — structured financial intelligence (SAFE MODE, advisory only).
 */

/**
 * @param {object} roi
 * @param {object} funnelAnalysis
 * @param {object} trafficAttribution
 * @param {object[]} leaks
 * @returns {object[]}
 */
export function generateRevenueInsights(roi, funnelAnalysis, trafficAttribution, leaks) {
  const insights = [];
  const seen = new Set();

  function add(insight) {
    const key = insight.id;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    insights.push(
      Object.assign(
        {
          advisory: true,
          executable: false,
          mode: "safe",
          created_at: Date.now()
        },
        insight
      )
    );
  }

  if (roi?.totals?.roi < 0) {
    add({
      id: "insight-negative-roi",
      category: "roi",
      severity: "high",
      title: "Negative ROI estimate",
      message: "Estimated ROI is negative based on current conversion and cost assumptions",
      evidence: roi.totals
    });
  } else if (typeof roi?.totals?.roi === "number" && roi.totals.roi > 0.5) {
    add({
      id: "insight-positive-roi",
      category: "roi",
      severity: "low",
      title: "Positive ROI signal",
      message: "Current funnel shows positive estimated ROI",
      evidence: { roi: roi.totals.roi, conversions: roi.totals.conversions }
    });
  }

  if (funnelAnalysis?.weakest_stage) {
    add({
      id: "insight-weakest-stage",
      category: "funnel",
      severity: "high",
      title: "Funnel bottleneck",
      message: "Weakest funnel stage: " + funnelAnalysis.weakest_stage,
      evidence: { weakest_stage: funnelAnalysis.weakest_stage, bottlenecks: funnelAnalysis.bottlenecks }
    });
  }

  if (trafficAttribution?.quality?.label === "low_quality") {
    add({
      id: "insight-low-traffic-quality",
      category: "traffic",
      severity: "medium",
      title: "Low traffic quality",
      message: "Session intent and engagement suggest low-quality traffic mix",
      evidence: trafficAttribution.quality
    });
  }

  leaks.slice(0, 5).forEach(function (leak) {
    add({
      id: "insight-" + leak.id,
      category: "leak",
      severity: leak.severity,
      title: "Revenue leak: " + leak.type.replace(/_/g, " "),
      message: leak.message,
      evidence: leak.evidence
    });
  });

  if (!insights.length) {
    add({
      id: "insight-baseline-stable",
      category: "system",
      severity: "low",
      title: "Revenue baseline stable",
      message: "No critical revenue leaks detected in current analysis window",
      evidence: { funnel_health: funnelAnalysis?.health }
    });
  }

  return insights.sort(function (a, b) {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] || 9) - (order[b.severity] || 9);
  });
}

/**
 * @param {object[]} insights
 * @returns {object[]}
 */
export function toRecommendations(insights) {
  return insights.map(function (insight, index) {
    return {
      id: "rev-rec-" + index,
      type: mapCategory(insight.category),
      impact: insight.severity === "high" ? "HIGH" : insight.severity === "medium" ? "MEDIUM" : "LOW",
      reasoning: insight.message,
      action: suggestAction(insight),
      advisory: true,
      executable: false,
      source: "revenue_intelligence_safe"
    };
  });
}

/**
 * @param {string} category
 * @returns {string}
 */
function mapCategory(category) {
  if (category === "traffic") {
    return "TRAFFIC";
  }
  if (category === "funnel" || category === "leak") {
    return "FUNNEL";
  }
  return "ANALYTICS";
}

/**
 * @param {object} insight
 * @returns {string}
 */
function suggestAction(insight) {
  if (insight.category === "roi" && insight.severity === "high") {
    return "Review traffic cost and conversion assumptions — optimize spend or funnel before scaling";
  }
  if (insight.category === "funnel") {
    return "Investigate funnel stage '" + (insight.evidence?.weakest_stage || "unknown") + "' for conversion friction";
  }
  if (insight.category === "traffic") {
    return "Audit traffic sources and tighten targeting to improve intent quality";
  }
  if (insight.category === "leak") {
    return "Address revenue leak: " + insight.message;
  }
  return "Continue monitoring revenue metrics — no urgent action required";
}
