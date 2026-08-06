/**
 * Nika Decision Engine — structured advisory decisions.
 */

/**
 * @param {object[]} insights
 * @param {object[]} anomalies
 * @param {object} sources
 * @returns {object[]}
 */
export function produceDecisions(insights, anomalies, sources) {
  /** @type {object[]} */
  const decisions = [];
  const seen = new Set();

  function add(decision) {
    const key = decision.type + ":" + decision.action;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    decisions.push(
      Object.assign(
        {
          id: "dec-" + decisions.length,
          advisory: true,
          created_at: Date.now()
        },
        decision
      )
    );
  }

  anomalies.forEach(function (a) {
    if (a.code === "ctr_drop") {
      add({
        type: "TRAFFIC",
        action: "Review CTA placement and hero value proposition — CTR is critically low",
        priority: "HIGH",
        target: "cta",
        params: { level: "high", sticky: true, pulse: true },
        source: "anomaly:ctr_drop"
      });
    }
    if (a.code === "missing_events") {
      add({
        type: "FUNNEL",
        action: "Verify growth event pipeline and bridge connectivity to events.php",
        priority: "HIGH",
        target: "growth",
        params: { resync: true },
        source: "anomaly:missing_events"
      });
    }
    if (a.code === "agent_inactivity" || a.code === "agent_failure") {
      add({
        type: "AGENT",
        action: "Investigate agent " + (a.agent_id || "unknown") + " — heartbeat or status failure",
        priority: a.severity === "high" ? "HIGH" : "MEDIUM",
        target: a.agent_id || "agents",
        params: { resync: true },
        source: "anomaly:" + a.code
      });
    }
    if (a.code === "funnel_breakdown") {
      add({
        type: "FUNNEL",
        action: "Optimize funnel stage '" + (a.stage || "unknown") + "' — severe user drop-off",
        priority: "HIGH",
        target: a.stage || "cta",
        params: { stage: a.stage, weakest: a.stage },
        source: "anomaly:funnel_breakdown"
      });
    }
    if (a.code === "traffic_quality_low") {
      add({
        type: "TRAFFIC",
        action: "Audit traffic sources — majority of sessions show LOW intent signals",
        priority: "MEDIUM",
        target: "hero",
        params: { emphasize: ["hero", "video"] },
        source: "anomaly:traffic_quality_low"
      });
    }
  });

  insights.forEach(function (insight) {
    if (insight.category === "ui" && insight.severity === "high") {
      add({
        type: "UI",
        action: insight.message,
        priority: "HIGH",
        target: "main",
        params: { rebalance: true },
        source: "insight:" + insight.id
      });
    }
    if (insight.category === "conversion" && insight.id === "insight-funnel-bottleneck") {
      add({
        type: "FUNNEL",
        action: "Address conversion bottleneck at " + (insight.evidence?.stage || "unknown stage"),
        priority: "HIGH",
        target: insight.evidence?.stage || "cta",
        params: { stage: insight.evidence?.stage },
        source: "insight:" + insight.id
      });
    }
    if (insight.category === "agent") {
      add({
        type: "AGENT",
        action: insight.message,
        priority: insight.severity === "high" ? "HIGH" : "MEDIUM",
        target: "agents",
        params: { resync: true },
        source: "insight:" + insight.id
      });
    }
  });

  const funnel = sources.funnel || {};
  if (funnel.weakest_stage === "form_start" || funnel.weakest_stage === "cta") {
    add({
      type: "FUNNEL",
      action: "Strengthen CTA-to-form transition — users stall before form_start",
      priority: "MEDIUM",
      target: "cta",
      params: { level: "high", sticky: true },
      source: "funnel:weakest_stage"
    });
  }

  const competitive = sources.competitive || {};
  (competitive.recommendations || []).slice(0, 5).forEach(function (rec) {
    if (!rec || !rec.action) {
      return;
    }
    add({
      type: rec.type === "OFFER" ? "UI" : (rec.type || "FUNNEL"),
      action: rec.action,
      priority: rec.impact || "MEDIUM",
      target: rec.target || "",
      params: Object.assign({}, rec.params || {}, { competitive: true, advisory_only: true }),
      source: "competitive:" + (rec.gap_id || rec.pattern_id || rec.id),
      competitive: true,
      advisory_only: true
    });
  });

  if (decisions.length === 0 && sources.boot_state === "PASS") {
    add({
      type: "UI",
      action: "System stable — continue monitoring agent heartbeats and funnel metrics",
      priority: "LOW",
      source: "nika:baseline"
    });
  }

  return decisions.sort(function (a, b) {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (order[a.priority] || 9) - (order[b.priority] || 9);
  });
}
