/**
 * Competitive Recommendation Engine — structured advisory actions for Nika.
 */

/**
 * @param {object[]} gaps
 * @param {object} patterns
 * @param {object} offerComparison
 * @returns {object[]}
 */
export function generateCompetitiveRecommendations(gaps, patterns, offerComparison) {
  const recommendations = [];
  const seen = new Set();

  function add(rec) {
    const key = rec.type + ":" + rec.action;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    recommendations.push(
      Object.assign(
        {
          id: "ci-rec-" + recommendations.length,
          advisory: true,
          source: "competitive_intelligence",
          created_at: Date.now()
        },
        rec
      )
    );
  }

  (gaps || []).slice(0, 10).forEach(function (gap) {
    const impact = gap.severity === "high" ? "HIGH" : gap.severity === "medium" ? "MEDIUM" : "LOW";
    const type = mapGapType(gap.type);

    add({
      type: type,
      impact: impact,
      reasoning: gap.message,
      action: buildActionFromGap(gap),
      target: gap.element || "",
      gap_id: gap.id,
      params: { competitive: true, gap: gap }
    });
  });

  (patterns?.winning_structures || []).slice(0, 3).forEach(function (structure) {
    if ((structure.confidence || 0) < 0.55) {
      return;
    }
    add({
      type: "FUNNEL",
      impact: "MEDIUM",
      reasoning: "Market pattern detected: " + structure.label,
      action: "Evaluate adopting market-winning structure: " + structure.label,
      target: "main",
      pattern_id: structure.id,
      params: { competitive: true, pattern: structure }
    });
  });

  const diff = offerComparison?.differentiation;
  if (diff?.missing_dominant_themes?.length) {
    add({
      type: "OFFER",
      impact: "HIGH",
      reasoning: diff.recommendation,
      action: "Refine hero value proposition to address market themes: " + diff.missing_dominant_themes.join(", "),
      target: "hero",
      params: { themes: diff.missing_dominant_themes, competitive: true }
    });
  }

  if ((offerComparison?.alignment_score || 100) < 40) {
    add({
      type: "OFFER",
      impact: "MEDIUM",
      reasoning: "Offer alignment with market themes is low (" + offerComparison.alignment_score + "/100)",
      action: "A/B test hero headline against top competitor value angles",
      target: "hero",
      params: { alignment_score: offerComparison.alignment_score, competitive: true }
    });
  }

  if (!recommendations.length) {
    add({
      type: "UI",
      impact: "LOW",
      reasoning: "No critical competitive gaps detected in current window",
      action: "Continue monitoring competitor snapshots and market patterns",
      target: "",
      params: { competitive: true }
    });
  }

  return recommendations.sort(function (a, b) {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (order[a.impact] || 9) - (order[b.impact] || 9);
  });
}

/**
 * @param {string} gapType
 * @returns {string}
 */
function mapGapType(gapType) {
  if (gapType === "conversion" || gapType === "cta") {
    return "TRAFFIC";
  }
  if (gapType === "structure" || gapType === "media" || gapType === "ui") {
    return "UI";
  }
  if (gapType === "trust") {
    return "UI";
  }
  return "FUNNEL";
}

/**
 * @param {object} gap
 * @returns {string}
 */
function buildActionFromGap(gap) {
  if (gap.type === "trust") {
    return "Add or strengthen trust elements (testimonials, logos, guarantees) before CTA";
  }
  if (gap.type === "media") {
    return "Introduce or improve video section — high prevalence in competitor set";
  }
  if (gap.type === "cta") {
    return "Test sticky or high-contrast CTA pattern used by market leaders";
  }
  if (gap.type === "structure" && gap.our_status === "chaotic") {
    return "Realign section order to canonical Hero → Video → Problem → Insight → CTA → Footer";
  }
  if (gap.our_status === "missing") {
    return "Add or restore '" + gap.element + "' section to match market baseline";
  }
  return gap.message;
}
