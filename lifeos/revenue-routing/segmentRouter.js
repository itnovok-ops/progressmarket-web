/**
 * Segment Router — routes ABC segments to best-performing funnels (SAFE MODE).
 */

const FUNNEL_CATALOG = {
  A: {
    id: "funnel_a_direct",
    name: "Direct Conversion Funnel",
    path: ["landing", "cta", "form_submit"],
    emphasis: "high_intent_fast_close",
    expected_conversion: 0.12
  },
  B: {
    id: "funnel_b_video",
    name: "Video Nurture Funnel",
    path: ["landing", "video", "cta", "form_start"],
    emphasis: "education_then_convert",
    expected_conversion: 0.06
  },
  C: {
    id: "funnel_c_education",
    name: "Education Soft CTA Funnel",
    path: ["landing", "scroll", "insight", "soft_cta"],
    emphasis: "trust_building",
    expected_conversion: 0.025
  }
};

/**
 * @param {object} inputs
 * @param {object} offerScores
 * @param {object} trafficAllocation
 * @returns {object}
 */
export function routeSegments(inputs, offerScores, trafficAllocation) {
  const segmentSummary = inputs?.segment_summary || {};
  const funnels = inputs?.revenue_safe?.funnels || inputs?.revenue_full?.funnels || {};
  const allocations = trafficAllocation?.allocations || [];

  const routes = ["A", "B", "C"].map(function (segment) {
    return buildSegmentRoute(segment, segmentSummary, funnels, allocations, offerScores);
  });

  return {
    mode: "safe",
    advisory_only: true,
    executable: false,
    routes: routes,
    best_performing_segment: pickBestSegment(routes),
    weakest_segment: pickWeakestSegment(routes),
    routed_at: Date.now()
  };
}

/**
 * @param {"A"|"B"|"C"} segment
 * @param {object} segmentSummary
 * @param {object} funnels
 * @param {object[]} allocations
 * @param {object} offerScores
 * @returns {object}
 */
function buildSegmentRoute(segment, segmentSummary, funnels, allocations, offerScores) {
  const bucket = segmentSummary[segment] || { count: 0, share: 0 };
  const catalog = FUNNEL_CATALOG[segment];
  const matchingAllocation = allocations.find(function (a) {
    return a.recommended_segment === segment;
  });

  const performance = scoreFunnelPerformance(segment, funnels, offerScores);
  const recommendedOffer = pickOfferForSegment(segment, offerScores);

  return {
    segment: segment,
    client_count: bucket.count || 0,
    share: bucket.share || 0,
    funnel: catalog,
    recommended_offer: recommendedOffer,
    traffic_sources: allocations
      .filter(function (a) {
        return a.recommended_segment === segment;
      })
      .map(function (a) {
        return a.source;
      }),
    performance: performance,
    routing_decision: {
      action: "route_to_funnel",
      funnel_id: catalog.id,
      confidence: performance.confidence,
      advisory: true,
      executable: false,
      note: "Advisory routing only — no funnel switch executed"
    }
  };
}

/**
 * @param {string} segment
 * @param {object} funnels
 * @param {object} offerScores
 * @returns {object}
 */
function scoreFunnelPerformance(segment, funnels, offerScores) {
  const weakest = funnels.weakest_stage || null;
  const conversionRate = funnels.conversion_rate || 0;
  const expected = FUNNEL_CATALOG[segment]?.expected_conversion || 0.03;

  let confidence = 0.5;
  if (conversionRate >= expected) {
    confidence = 0.85;
  } else if (conversionRate >= expected * 0.5) {
    confidence = 0.65;
  } else {
    confidence = 0.4;
  }

  if (weakest && segment === "A" && weakest === "form_submit") {
    confidence -= 0.15;
  }
  if (weakest && segment === "B" && weakest === "video") {
    confidence -= 0.1;
  }

  const topOfferScore = offerScores?.top_offer?.scores?.composite || 50;
  confidence = Math.min(0.95, Math.max(0.2, confidence + (topOfferScore - 50) / 200));

  return {
    observed_conversion_rate: conversionRate,
    expected_conversion_rate: expected,
    weakest_stage: weakest,
    confidence: Number(confidence.toFixed(2)),
    label: confidence >= 0.75 ? "strong" : confidence >= 0.5 ? "moderate" : "weak"
  };
}

/**
 * @param {string} segment
 * @param {object} offerScores
 * @returns {object|null}
 */
function pickOfferForSegment(segment, offerScores) {
  const offers = offerScores?.offers || [];
  const typeMap = { A: "conversion", B: "engagement", C: "acquisition" };
  const preferred = typeMap[segment];

  return (
    offers.find(function (o) {
      return o.type === preferred;
    }) ||
    offers[0] ||
    null
  );
}

/**
 * @param {object[]} routes
 * @returns {string|null}
 */
function pickBestSegment(routes) {
  const sorted = routes.slice().sort(function (a, b) {
    return (b.performance?.confidence || 0) - (a.performance?.confidence || 0);
  });
  return sorted[0]?.segment || null;
}

/**
 * @param {object[]} routes
 * @returns {string|null}
 */
function pickWeakestSegment(routes) {
  const sorted = routes.slice().sort(function (a, b) {
    return (a.performance?.confidence || 0) - (b.performance?.confidence || 0);
  });
  return sorted[0]?.segment || null;
}
