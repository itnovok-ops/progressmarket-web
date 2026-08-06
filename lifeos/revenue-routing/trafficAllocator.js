/**
 * Traffic Allocator — optimal segment assignment per source (SAFE MODE, advisory only).
 */

/**
 * @param {object} inputs
 * @returns {object}
 */
export function allocateTraffic(inputs) {
  const traffic = inputs?.revenue_safe?.traffic || inputs?.revenue_full?.traffic || {};
  const session = inputs?.session || {};
  const context = session.context || {};
  const channels = traffic.channels || [];
  const segmentSummary = inputs?.segment_summary || {};
  const eventCounts = inputs?.event_counts || {};

  const sources = buildSourceList(channels, context, eventCounts);
  const allocations = sources.map(function (source) {
    return allocateSource(source, segmentSummary);
  });

  allocations.sort(function (a, b) {
    return b.priority_score - a.priority_score;
  });

  const totalBudgetShare = allocations.reduce(function (sum, row) {
    return sum + row.recommended_share;
  }, 0);

  return {
    mode: "safe",
    advisory_only: true,
    executable: false,
    primary_source: traffic.primary_source || context.source || "direct",
    campaign_id: traffic.campaign_id || context.campaignId || null,
    quality: traffic.quality || null,
    allocations: allocations,
    summary: {
      source_count: allocations.length,
      top_source: allocations[0]?.source || null,
      total_recommended_share: Number(totalBudgetShare.toFixed(4)),
      high_priority_count: allocations.filter(function (a) {
        return a.priority === "high";
      }).length
    },
    allocated_at: Date.now()
  };
}

/**
 * @param {object[]} channels
 * @param {object} context
 * @param {object} eventCounts
 * @returns {object[]}
 */
function buildSourceList(channels, context, eventCounts) {
  const map = {};

  function ensure(source) {
    if (!map[source]) {
      map[source] = {
        source: source,
        sessions: 1,
        events: 0,
        cta_clicks: 0,
        form_starts: 0,
        conversions: 0,
        conversion_rate: 0
      };
    }
    return map[source];
  }

  channels.forEach(function (channel) {
    const row = ensure(channel.source || "unknown");
    row.sessions = Math.max(row.sessions, channel.sessions || 1);
    row.events = channel.events || 0;
    row.cta_clicks = channel.cta_clicks || 0;
    row.form_starts = channel.form_starts || 0;
    row.conversions = channel.conversions || 0;
    row.conversion_rate = channel.conversion_rate || 0;
  });

  const primary = context.source || context.utm_source || "landing";
  const primaryRow = ensure(primary);
  primaryRow.events += eventCounts.cta_clicks + eventCounts.form_starts + eventCounts.scroll_events;

  return Object.keys(map).map(function (key) {
    return map[key];
  });
}

/**
 * @param {object} source
 * @param {object} segmentSummary
 * @returns {object}
 */
function allocateSource(source, segmentSummary) {
  const conversionRate = source.conversion_rate || estimateConversion(source);
  const engagement = Math.min(100, source.cta_clicks * 20 + source.form_starts * 25 + source.events * 2);
  const segmentFit = inferSegmentFit(source, segmentSummary);

  const priorityScore = Math.round(conversionRate * 400 + engagement * 0.4 + segmentFit.score * 0.3);

  return {
    source: source.source,
    metrics: {
      sessions: source.sessions,
      conversion_rate: Number(conversionRate.toFixed(4)),
      engagement_score: engagement,
      cta_clicks: source.cta_clicks,
      form_starts: source.form_starts,
      conversions: source.conversions
    },
    recommended_segment: segmentFit.segment,
    recommended_funnel: segmentFit.funnel,
    recommended_share: computeShare(priorityScore),
    priority: priorityScore >= 65 ? "high" : priorityScore >= 40 ? "medium" : "low",
    priority_score: priorityScore,
    advisory: true,
    executable: false,
    note: "Advisory allocation only — no traffic redirection applied"
  };
}

/**
 * @param {object} source
 * @returns {number}
 */
function estimateConversion(source) {
  if (source.sessions <= 0) {
    return 0;
  }
  return source.conversions / source.sessions;
}

/**
 * @param {object} source
 * @param {object} segmentSummary
 * @returns {{ segment: string, funnel: string, score: number }}
 */
function inferSegmentFit(source, segmentSummary) {
  const dist = segmentSummary.distribution || {};
  const rate = estimateConversion(source);

  if (rate >= 0.08 || source.form_starts >= 2) {
    return { segment: "A", funnel: "direct_conversion", score: 90 };
  }
  if (rate >= 0.03 || source.cta_clicks >= 2) {
    return { segment: "B", funnel: "video_nurture", score: 65 };
  }
  if ((dist.C || 0) > 0.5) {
    return { segment: "C", funnel: "education_soft_cta", score: 40 };
  }
  return { segment: "C", funnel: "education_soft_cta", score: 35 };
}

/**
 * @param {number} priorityScore
 * @returns {number}
 */
function computeShare(priorityScore) {
  const raw = priorityScore / 100;
  return Number(Math.min(0.6, Math.max(0.05, raw * 0.35)).toFixed(4));
}
