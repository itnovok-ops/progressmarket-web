/**
 * ABC Segmentation — classify Progress Market clients by activity, revenue, engagement.
 * SAFE MODE: read-only classification, no automated actions.
 */

export const SEGMENTS = ["A", "B", "C"];

const THRESHOLDS = {
  A: { activity: 70, revenue: 70000, engagement: 65 },
  B: { activity: 40, revenue: 25000, engagement: 35 }
};

/**
 * @param {object} client
 * @returns {{ activity: number, revenue: number, engagement: number, composite: number }}
 */
export function scoreClient(client) {
  const activity = normalizeScore(client.activity_score ?? client.activity ?? client.sessions_30d ?? 0, 100);
  const revenue = normalizeScore(client.revenue_total ?? client.revenue ?? client.deal_amount ?? 0, 200000);
  const engagement = normalizeScore(
    client.engagement_score ?? client.engagement ?? client.nika_score ?? client.intent_score ?? 0,
    100
  );

  const composite = Math.round(activity * 0.4 + revenue * 0.4 + engagement * 0.2);

  return { activity, revenue, engagement, composite };
}

/**
 * @param {number} value
 * @param {number} max
 * @returns {number}
 */
function normalizeScore(value, max) {
  const num = Number(value) || 0;
  if (max <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((num / max) * 100));
}

/**
 * @param {object} client
 * @returns {"A"|"B"|"C"}
 */
export function classifyClient(client) {
  const scores = scoreClient(client);

  if (
    scores.activity >= THRESHOLDS.A.activity &&
    scores.revenue >= THRESHOLDS.A.revenue &&
    scores.engagement >= THRESHOLDS.A.engagement
  ) {
    return "A";
  }

  if (
    scores.activity >= THRESHOLDS.B.activity ||
    scores.revenue >= THRESHOLDS.B.revenue ||
    scores.engagement >= THRESHOLDS.B.engagement
  ) {
    return "B";
  }

  return "C";
}

/**
 * @param {object[]} clients
 * @returns {object}
 */
export function buildSegmentSummary(clients) {
  const list = Array.isArray(clients) ? clients : [];
  const buckets = { A: [], B: [], C: [] };

  list.forEach(function (client) {
    const segment = classifyClient(client);
    buckets[segment].push(
      Object.assign({}, client, {
        abc_segment: segment,
        abc_scores: scoreClient(client)
      })
    );
  });

  const total = list.length || 1;

  return {
    A: summarizeBucket("A", buckets.A, total),
    B: summarizeBucket("B", buckets.B, total),
    C: summarizeBucket("C", buckets.C, total),
    total_clients: list.length,
    distribution: {
      A: Number((buckets.A.length / total).toFixed(4)),
      B: Number((buckets.B.length / total).toFixed(4)),
      C: Number((buckets.C.length / total).toFixed(4))
    },
    classified_at: Date.now()
  };
}

/**
 * @param {"A"|"B"|"C"} label
 * @param {object[]} items
 * @param {number} total
 * @returns {object}
 */
function summarizeBucket(label, items, total) {
  const revenueSum = items.reduce(function (sum, c) {
    return sum + (Number(c.revenue_total ?? c.revenue ?? c.deal_amount) || 0);
  }, 0);

  const avgEngagement =
    items.length > 0
      ? Math.round(
          items.reduce(function (sum, c) {
            return sum + scoreClient(c).engagement;
          }, 0) / items.length
        )
      : 0;

  return {
    segment: label,
    count: items.length,
    share: Number((items.length / total).toFixed(4)),
    avg_revenue: items.length > 0 ? Math.round(revenueSum / items.length) : 0,
    total_revenue: Math.round(revenueSum),
    avg_engagement: avgEngagement,
    sample_ids: items.slice(0, 5).map(function (c) {
      return c.id || c.pm_client_id || c.lifeos_id || null;
    })
  };
}
