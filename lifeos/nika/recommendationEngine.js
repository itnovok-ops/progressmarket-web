/**
 * Nika Recommendation Engine — human-readable advisory recommendations.
 */

/**
 * @param {object[]} insights
 * @param {object[]} anomalies
 * @param {object[]} decisions
 * @param {object} sources
 * @returns {object[]}
 */
export function generateRecommendations(insights, anomalies, decisions, sources) {
  /** @type {object[]} */
  const recommendations = [];

  try {
    const landing = sources.landing_stats || {};
    const funnel = sources.funnel || {};
    const session = sources.session || {};

    decisions.slice(0, 8).forEach(function (decision, index) {
      recommendations.push({
        id: "rec-" + index,
        title: decision.type + " advisory",
        body: decision.action,
        priority: decision.priority,
        type: decision.type,
        advisory: true
      });
    });

    if (typeof landing.video_engagement_rate === "number" && landing.video_engagement_rate < 0.2) {
      recommendations.push({
        id: "rec-video",
        title: "Video engagement",
        body: "Video engagement is low — test autoplay visibility and play overlay contrast",
        priority: "MEDIUM",
        type: "UI",
        advisory: true
      });
    }

    if (funnel.rates && funnel.rates.scroll < 0.5) {
      recommendations.push({
        id: "rec-scroll",
        title: "Scroll depth",
        body: "Less than half of sessions reach scroll milestones — review hero hook and above-fold content",
        priority: "MEDIUM",
        type: "FUNNEL",
        advisory: true
      });
    }

    if (session.status === "guest") {
      recommendations.push({
        id: "rec-session-guest",
        title: "Session mode",
        body: "Operating in guest session mode — authenticated features unavailable (expected for public landing)",
        priority: "LOW",
        type: "TRAFFIC",
        advisory: true
      });
    }

    const highAnomalies = anomalies.filter(function (a) { return a.severity === "high"; });
    if (highAnomalies.length >= 3) {
      recommendations.push({
        id: "rec-multi-anomaly",
        title: "System stress",
        body: highAnomalies.length + " high-severity anomalies detected — prioritize agent and funnel diagnostics",
        priority: "HIGH",
        type: "AGENT",
        advisory: true
      });
    }
  } catch (_error) {
    recommendations.push({
      id: "rec-fallback",
      title: "Nika advisory mode",
      body: "Recommendations partially unavailable — data sources may still be initializing",
      priority: "LOW",
      type: "AGENT",
      advisory: true
    });
  }

  return recommendations;
}
