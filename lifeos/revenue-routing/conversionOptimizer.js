/**
 * Conversion Optimizer — suggests improvements only (SAFE MODE, no auto actions).
 */

/**
 * @param {object} inputs
 * @param {object} offerScores
 * @param {object} segmentRoutes
 * @param {object} revenueMap
 * @returns {object}
 */
export function optimizeConversions(inputs, offerScores, segmentRoutes, revenueMap) {
  const suggestions = [];
  const seen = new Set();

  function add(suggestion) {
    if (seen.has(suggestion.id)) {
      return;
    }
    seen.add(suggestion.id);
    suggestions.push(
      Object.assign(
        {
          advisory: true,
          executable: false,
          mode: "safe",
          auto_action: false
        },
        suggestion
      )
    );
  }

  const funnels = inputs?.revenue_safe?.funnels || inputs?.revenue_full?.funnels || {};
  const leaks = inputs?.revenue_safe?.leaks || inputs?.revenue_full?.leaks || {};
  const eventCounts = inputs?.event_counts || {};
  const weakest = segmentRoutes?.weakest_segment;

  if (funnels.weakest_stage) {
    add({
      id: "opt-funnel-bottleneck",
      area: "funnel",
      severity: "high",
      title: "Reduce drop-off at " + funnels.weakest_stage,
      suggestion:
        "Focus creative and CTA placement before stage '" +
        funnels.weakest_stage +
        "' — current funnel health: " +
        (funnels.health || "unknown"),
      expected_impact: "conversion_rate",
      evidence: { weakest_stage: funnels.weakest_stage, bottlenecks: funnels.bottlenecks }
    });
  }

  if ((eventCounts.video_events || 0) === 0 && (eventCounts.cta_clicks || 0) > 0) {
    add({
      id: "opt-video-gap",
      area: "engagement",
      severity: "medium",
      title: "CTA clicks without video engagement",
      suggestion: "Route segment B traffic through video section before CTA to improve intent quality",
      expected_impact: "engagement_quality",
      evidence: eventCounts
    });
  }

  if ((leaks.items || []).length > 0) {
    leaks.items.slice(0, 3).forEach(function (leak, index) {
      add({
        id: "opt-leak-" + index,
        area: "revenue_leak",
        severity: leak.severity || "medium",
        title: "Fix revenue leak: " + leak.type,
        suggestion: leak.message,
        expected_impact: "revenue",
        evidence: leak.evidence
      });
    });
  }

  const topOffer = offerScores?.top_offer;
  const lowOffers = (offerScores?.offers || []).filter(function (o) {
    return o.scores.composite < 45;
  });

  if (topOffer && lowOffers.length > 0) {
    add({
      id: "opt-offer-rebalance",
      area: "offer_mix",
      severity: "medium",
      title: "Rebalance offer exposure toward " + topOffer.name,
      suggestion:
        "Prioritize advisory budget share to top-scoring offer (" +
        topOffer.id +
        ") and reduce emphasis on " +
        lowOffers.length +
        " underperforming offers",
      expected_impact: "ltv",
      evidence: { top: topOffer.id, underperformers: lowOffers.map(function (o) { return o.id; }) }
    });
  }

  if (weakest === "C") {
    add({
      id: "opt-segment-c-nurture",
      area: "segmentation",
      severity: "medium",
      title: "Strengthen C-segment nurture path",
      suggestion: "Use education_soft_cta funnel with insight/cases content before hard CTA",
      expected_impact: "segment_conversion",
      evidence: { weakest_segment: weakest }
    });
  }

  const primaryPath = revenueMap?.primary_path;
  if (primaryPath && primaryPath.nodes.length < 4) {
    add({
      id: "opt-incomplete-path",
      area: "revenue_map",
      severity: "low",
      title: "Revenue path incomplete",
      suggestion: "Expand tracking coverage across upsell and retention stages for full LTV visibility",
      expected_impact: "attribution",
      evidence: primaryPath
    });
  }

  if (!suggestions.length) {
    add({
      id: "opt-baseline-stable",
      area: "system",
      severity: "low",
      title: "Conversion baseline stable",
      suggestion: "Continue monitoring — no high-priority optimization signals in current window",
      expected_impact: "none",
      evidence: { funnel_health: funnels.health }
    });
  }

  return {
    mode: "safe",
    advisory_only: true,
    executable: false,
    auto_action: false,
    suggestions: suggestions.sort(function (a, b) {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.severity] || 9) - (order[b.severity] || 9);
    }),
    count: suggestions.length,
    optimized_at: Date.now()
  };
}

/**
 * @param {object} optimization
 * @returns {object[]}
 */
export function toRoutingRecommendations(optimization) {
  return (optimization.suggestions || []).map(function (item, index) {
    return {
      id: "routing-rec-" + index,
      type: item.area?.toUpperCase() || "ANALYTICS",
      impact: item.severity === "high" ? "HIGH" : item.severity === "medium" ? "MEDIUM" : "LOW",
      reasoning: item.suggestion,
      action: item.title,
      advisory: true,
      executable: false,
      source: "revenue_routing_safe"
    };
  });
}
