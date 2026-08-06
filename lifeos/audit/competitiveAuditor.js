/**
 * Competitive intelligence auditor (read-only).
 */

/**
 * @returns {object}
 */
export function auditCompetitive() {
  const data = window.__LIFEOS_COMPETITIVE__ || null;
  const config = window.__LIFEOS_COMPETITIVE_CONFIG__ || {};
  const snapshots = window.__LIFEOS_COMPETITIVE_SNAPSHOTS__ || [];

  if (!data) {
    return {
      status: "INACTIVE",
      loaded: false,
      market_patterns: { loaded: false, health: "FAIL" },
      competitor_data: { present: false, count: 0, health: "FAIL" },
      gap_analysis: { status: "unavailable", gaps_count: 0, health: "FAIL" },
      market_score: null,
      recommendations_count: 0,
      runner_available: typeof window.__LIFEOS_RUN_COMPETITIVE__ === "function",
      audited_at: Date.now()
    };
  }

  const patterns = data.patterns || {};
  const gaps = data.gaps || [];
  const recommendations = data.recommendations || [];
  const competitorsAnalyzed = data.competitors_analyzed || 0;

  const marketPatterns = auditMarketPatterns(patterns);
  const competitorData = auditCompetitorData(competitorsAnalyzed, config, snapshots);
  const gapAnalysis = auditGapAnalysis(gaps, data.marketScore);

  return {
    status: resolveCompetitiveStatus(marketPatterns, competitorData, gapAnalysis),
    loaded: true,
    mode: data.mode || "advisory",
    market_score: data.marketScore ?? null,
    market_patterns: marketPatterns,
    competitor_data: competitorData,
    gap_analysis: gapAnalysis,
    recommendations_count: recommendations.length,
    offers_compared: Boolean(data.offers),
    updated_at: data.updated_at || null,
    sync_fallback: data.sync_fallback === true,
    runner_available: typeof window.__LIFEOS_RUN_COMPETITIVE__ === "function",
    audited_at: Date.now()
  };
}

/**
 * @param {object} patterns
 * @returns {object}
 */
function auditMarketPatterns(patterns) {
  const loaded = Boolean(patterns && (patterns.rates || patterns.source));
  const sampleSize = patterns.sample_size ?? 0;
  const winning = Array.isArray(patterns.winning_structures) ? patterns.winning_structures.length : 0;

  return {
    loaded: loaded,
    source: patterns.source || "unknown",
    sample_size: sampleSize,
    winning_structures: winning,
    rates_present: Boolean(patterns.rates),
    health: loaded && (sampleSize > 0 || patterns.source === "benchmark") ? "OK" : "WARN"
  };
}

/**
 * @param {number} analyzed
 * @param {object} config
 * @param {object[]} snapshots
 * @returns {object}
 */
function auditCompetitorData(analyzed, config, snapshots) {
  const configCount = Array.isArray(config.competitors) ? config.competitors.length : 0;
  const snapshotCount = Array.isArray(snapshots) ? snapshots.length : 0;

  return {
    present: analyzed > 0 || snapshotCount > 0 || configCount > 0,
    analyzed: analyzed,
    config_inputs: configCount,
    runtime_snapshots: snapshotCount,
    registry_configured: Boolean(config.registryUrl),
    health: analyzed > 0 ? "OK" : snapshotCount > 0 || configCount > 0 ? "WARN" : "WARN"
  };
}

/**
 * @param {object[]} gaps
 * @param {number|null} marketScore
 * @returns {object}
 */
function auditGapAnalysis(gaps, marketScore) {
  const high = gaps.filter(function (g) { return g.severity === "high"; }).length;

  return {
    status: gaps.length > 0 ? "active" : "clear",
    gaps_count: gaps.length,
    high_severity: high,
    market_score: marketScore,
    health: high > 2 ? "FAIL" : high > 0 ? "WARN" : "OK"
  };
}

/**
 * @param {object} patterns
 * @param {object} competitors
 * @param {object} gaps
 * @returns {string}
 */
function resolveCompetitiveStatus(patterns, competitors, gaps) {
  if (patterns.health === "FAIL" && competitors.health === "FAIL") {
    return "FAIL";
  }
  if (gaps.health === "FAIL") {
    return "WARN";
  }
  if (patterns.health === "OK" && competitors.analyzed > 0) {
    return "OK";
  }
  return patterns.health === "OK" ? "OK" : "WARN";
}
