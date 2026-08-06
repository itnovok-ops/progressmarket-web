/**
 * Funnel Analyzer — conversion funnel drop-off analysis (SAFE MODE, read-only).
 */

const STAGES = ["visit", "scroll", "video", "cta", "form_start", "form_submit"];

/**
 * @param {object} sources
 * @returns {object}
 */
export function analyzeFunnel(sources) {
  const funnel = sources?.funnel || {};
  const landing = sources?.landing || {};
  const rates = funnel.rates || {};
  const dropOffs = funnel.drop_offs || {};
  const reached = funnel.reached || {};

  const stages = STAGES.map(function (stage, index) {
    const rate = typeof rates[stage] === "number" ? rates[stage] : 0;
    const drop = typeof dropOffs[stage] === "number" ? dropOffs[stage] : 0;
    const hit = reached[stage] === true;

    return {
      stage: stage,
      order: index,
      rate: rate,
      drop_off: drop,
      reached: hit,
      severity: drop >= 0.7 ? "high" : drop >= 0.4 ? "medium" : "low"
    };
  });

  const bottlenecks = stages
    .filter(function (s) { return s.drop_off >= 0.4 && s.stage !== "visit"; })
    .sort(function (a, b) { return b.drop_off - a.drop_off; });

  const conversionRate =
    typeof funnel.conversion_rate === "number"
      ? funnel.conversion_rate
      : typeof landing.conversion_rate === "number"
        ? landing.conversion_rate
        : rates.form_submit || 0;

  return {
    stages: stages,
    weakest_stage: funnel.weakest_stage || bottlenecks[0]?.stage || null,
    bottlenecks: bottlenecks.slice(0, 3),
    conversion_rate: conversionRate,
    visit_to_cta: rates.cta || 0,
    cta_to_form: rates.form_start && rates.cta ? Number((rates.form_start / Math.max(rates.cta, 0.0001)).toFixed(4)) : 0,
    form_to_submit: rates.form_submit && rates.form_start
      ? Number((rates.form_submit / Math.max(rates.form_start, 0.0001)).toFixed(4))
      : 0,
    health: conversionRate >= 0.05 ? "OK" : conversionRate > 0 ? "WARN" : "FAIL",
    analyzed_at: Date.now()
  };
}
