/**
 * Revenue Decision Map — full path: entry → conversion → upsell → retention (SAFE MODE).
 */

/**
 * @param {object} inputs
 * @param {object} offerScores
 * @param {object} segmentRoutes
 * @returns {object}
 */
export function buildRevenueDecisionMap(inputs, offerScores, segmentRoutes) {
  const revenue = inputs?.revenue_safe?.revenue || inputs?.revenue_full?.revenue || {};
  const binding = inputs?.revenue_binding || {};
  const topOffer = offerScores?.top_offer || null;
  const bestSegment = segmentRoutes?.best_performing_segment || "B";

  const stages = [
    buildStage("entry", entryNodes(inputs)),
    buildStage("conversion", conversionNodes(inputs, topOffer, bestSegment)),
    buildStage("upsell", upsellNodes(offerScores, binding)),
    buildStage("retention", retentionNodes(binding))
  ];

  const paths = buildPaths(stages, bestSegment);

  return {
    mode: "safe",
    advisory_only: true,
    executable: false,
    ecosystem: "progress_market",
    landing_id: inputs?.landing_id || "wb-fbs-v1",
    stages: stages,
    paths: paths,
    primary_path: paths[0] || null,
    revenue_potential: {
      observed: binding.observed_revenue || null,
      segment_annual: binding.totals?.annual_potential || null,
      uplift: binding.uplift_vs_observed || null
    },
    mapped_at: Date.now()
  };
}

/**
 * @param {string} id
 * @param {object[]} nodes
 * @returns {object}
 */
function buildStage(id, nodes) {
  return {
    stage: id,
    nodes: nodes,
    node_count: nodes.length
  };
}

/**
 * @param {object} inputs
 * @returns {object[]}
 */
function entryNodes(inputs) {
  const session = inputs?.session || {};
  const context = session.context || {};

  return [
    {
      id: "entry-supersite",
      channel: "supersite",
      source: context.source || context.utm_source || "direct",
      landing: inputs?.landing_id || "wb-fbs-v1",
      events_seen: inputs?.events?.length || 0,
      advisory: true
    },
    {
      id: "entry-progress-market",
      channel: "progress_market",
      source: "crm_sync",
      available: Boolean(window.__LIFEOS_PM_CLIENTS__ || window.__PROGRESS_MARKET_CLIENTS__),
      advisory: true
    }
  ];
}

/**
 * @param {object} inputs
 * @param {object|null} topOffer
 * @param {string} segment
 * @returns {object[]}
 */
function conversionNodes(inputs, topOffer, segment) {
  const eventCounts = inputs?.event_counts || {};
  const funnels = inputs?.revenue_safe?.funnels || {};

  return [
    {
      id: "conv-landing-cta",
      step: "cta_click",
      offer: topOffer?.id || "wb-fbs-landing",
      segment: segment,
      observed: eventCounts.cta_clicks || 0,
      rate: funnels.visit_to_cta || 0,
      advisory: true
    },
    {
      id: "conv-form-submit",
      step: "form_submit",
      offer: "free-calculation-lead",
      observed: eventCounts.form_submits || 0,
      rate: funnels.conversion_rate || 0,
      advisory: true
    }
  ];
}

/**
 * @param {object} offerScores
 * @param {object} binding
 * @returns {object[]}
 */
function upsellNodes(offerScores, binding) {
  const upsell = (offerScores?.offers || []).find(function (o) {
    return o.type === "upsell";
  });

  const segmentA = (binding.bindings || []).find(function (b) {
    return b.segment === "A";
  });

  return [
    {
      id: "upsell-pm-system",
      offer: upsell?.id || "progress-market-upsell",
      target_segment: "A",
      ltv_annual: segmentA?.ltv_estimate?.annual || upsell?.metrics?.estimated_ltv_annual || null,
      trigger: "post_conversion_high_intent",
      advisory: true,
      executable: false
    }
  ];
}

/**
 * @param {object} binding
 * @returns {object[]}
 */
function retentionNodes(binding) {
  const segmentB = (binding.bindings || []).find(function (b) {
    return b.segment === "B";
  });

  return [
    {
      id: "retention-nurture",
      program: "retention-nurture",
      target_segments: ["B", "C"],
      monthly_value: segmentB?.ltv_estimate?.monthly || null,
      trigger: "ongoing_engagement",
      advisory: true,
      executable: false
    }
  ];
}

/**
 * @param {object[]} stages
 * @param {string} segment
 * @returns {object[]}
 */
function buildPaths(stages, segment) {
  const entry = stages.find(function (s) {
    return s.stage === "entry";
  });
  const conversion = stages.find(function (s) {
    return s.stage === "conversion";
  });
  const upsell = stages.find(function (s) {
    return s.stage === "upsell";
  });
  const retention = stages.find(function (s) {
    return s.stage === "retention";
  });

  return [
    {
      id: "path-primary-" + segment.toLowerCase(),
      segment: segment,
      flow: ["entry", "conversion", "upsell", "retention"],
      nodes: [
        entry?.nodes?.[0]?.id,
        conversion?.nodes?.[0]?.id,
        conversion?.nodes?.[1]?.id,
        upsell?.nodes?.[0]?.id,
        retention?.nodes?.[0]?.id
      ].filter(Boolean),
      advisory: true,
      executable: false
    }
  ];
}
