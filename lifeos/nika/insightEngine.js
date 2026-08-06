/**
 * Nika Insight Engine — advisory insights from LifeOS data sources.
 */

/**
 * @param {object} sources
 * @returns {object[]}
 */
export function generateInsights(sources) {
  /** @type {object[]} */
  const insights = [];

  try {
    const funnel = sources.funnel || {};
    const landing = sources.landing_stats || {};
    const observer = sources.observer || {};
    const agents = sources.agent_report || {};
    const intent = sources.intent || {};

    const weakest = funnel.weakest_stage || funnel.bottleneck;
    if (weakest && weakest !== "visit") {
      insights.push({
        id: "insight-funnel-bottleneck",
        category: "conversion",
        title: "Conversion bottleneck detected",
        message: "Funnel weakest stage: " + weakest,
        severity: "high",
        evidence: { stage: weakest, rates: funnel.rates || null }
      });
    }

    const conversionRate = landing.conversion_rate ?? funnel.conversion_rate;
    if (typeof conversionRate === "number" && conversionRate < 0.05) {
      insights.push({
        id: "insight-low-conversion",
        category: "conversion",
        title: "Low conversion rate",
        message: "Landing conversion rate is below 5%",
        severity: "medium",
        evidence: { conversion_rate: conversionRate }
      });
    }

    const menu = observer.menu_structure;
    if (menu?.chaotic === true) {
      insights.push({
        id: "insight-chaotic-ui",
        category: "ui",
        title: "Chaotic UI flow",
        message: menu.flow_status || "Section order deviates from canonical flow",
        severity: "high",
        evidence: { missing: menu.missing || [], deviations: menu.deviations || [] }
      });
    }

    const uiIssues = observer.ui_scan?.issues || [];
    const highUi = uiIssues.filter(function (i) { return i.severity === "high"; });
    if (highUi.length > 0) {
      insights.push({
        id: "insight-weak-sections",
        category: "ui",
        title: "Weak or missing landing sections",
        message: highUi.length + " high-severity UI issue(s) detected",
        severity: "high",
        evidence: { issues: highUi.slice(0, 5) }
      });
    }

    const intentLevel = intent.level || landing.intent_level;
    if (intentLevel === "LOW") {
      insights.push({
        id: "insight-low-intent",
        category: "traffic",
        title: "Low traffic quality",
        message: "Session intent classified as LOW — possible bounce or fast-scroll traffic",
        severity: "medium",
        evidence: { intent_level: intentLevel, score: intent.score }
      });
    }

  (agents.alerts || []).forEach(function (alert, index) {
      insights.push({
        id: "insight-agent-" + index,
        category: "agent",
        title: "Agent alert: " + (alert.agent_id || "unknown"),
        message: alert.message || alert.code,
        severity: alert.severity === "high" ? "high" : "medium",
        evidence: alert
      });
    });

    if (!sources.growth_active && sources.boot_state === "PASS") {
      insights.push({
        id: "insight-growth-inactive",
        category: "analytics",
        title: "Growth backend inactive",
        message: "Growth analytics layer not active after boot",
        severity: "medium",
        evidence: { boot_state: sources.boot_state }
      });
    }

    if ((sources.events_count || 0) === 0 && sources.growth_active) {
      insights.push({
        id: "insight-no-events",
        category: "analytics",
        title: "No growth events captured",
        message: "Growth is active but event buffer is empty",
        severity: "low",
        evidence: { events_count: 0 }
      });
    }

    const ctr = landing.ctr;
    if (typeof ctr === "number" && ctr === 0 && (landing.sessions || 0) > 0) {
      insights.push({
        id: "insight-zero-ctr",
        category: "traffic",
        title: "Zero CTA engagement",
        message: "Sessions recorded but no CTA clicks in current window",
        severity: "medium",
        evidence: { ctr: ctr, sessions: landing.sessions }
      });
    }

    const competitive = sources.competitive || {};
    if (typeof competitive.marketScore === "number" && competitive.marketScore < 55) {
      insights.push({
        id: "insight-competitive-score-low",
        category: "competitive",
        title: "Below market alignment",
        message: "Competitive market score is " + competitive.marketScore + "/100 — landing gaps vs market patterns",
        severity: competitive.marketScore < 40 ? "high" : "medium",
        evidence: { marketScore: competitive.marketScore, gaps: (competitive.gaps || []).slice(0, 3) }
      });
    }

    (competitive.gaps || []).slice(0, 4).forEach(function (gap, index) {
      if (gap.severity !== "high") {
        return;
      }
      insights.push({
        id: "insight-competitive-gap-" + index,
        category: "competitive",
        title: "Competitive gap: " + (gap.element || gap.type),
        message: gap.message,
        severity: "high",
        evidence: gap
      });
    });
  } catch (_error) {
    insights.push({
      id: "insight-engine-error",
      category: "system",
      title: "Insight engine safe fallback",
      message: "Insights partially unavailable",
      severity: "low",
      evidence: {}
    });
  }

  return insights;
}
