/**
 * Offer Scoring — ranks Progress Market offers by conversion, LTV, engagement (SAFE MODE).
 */

const DEFAULT_OFFERS = [
  {
    id: "wb-fbs-landing",
    name: "WB FBS SuperSite Landing",
    landing_id: "wb-fbs-v1",
    channel: "supersite",
    type: "acquisition",
    base_ltv_annual: 150000
  },
  {
    id: "free-calculation-lead",
    name: "Free Launch Calculation",
    landing_id: "wb-fbs-v1",
    channel: "supersite",
    type: "conversion",
    base_ltv_annual: 62000
  },
  {
    id: "video-education-funnel",
    name: "Video Education Funnel",
    landing_id: "wb-fbs-v1",
    channel: "supersite",
    type: "engagement",
    base_ltv_annual: 22000
  },
  {
    id: "progress-market-upsell",
    name: "Progress Market System Upsell",
    channel: "progress_market",
    type: "upsell",
    base_ltv_annual: 200000
  },
  {
    id: "retention-nurture",
    name: "Retention Nurture Program",
    channel: "lifeos",
    type: "retention",
    base_ltv_annual: 80000
  }
];

/**
 * @param {object} inputs
 * @returns {object}
 */
export function scoreOffers(inputs) {
  const revenue = inputs?.revenue_safe?.revenue || inputs?.revenue_full?.revenue || {};
  const funnels = inputs?.revenue_safe?.funnels || inputs?.revenue_full?.funnels || {};
  const eventCounts = inputs?.event_counts || {};
  const intent = inputs?.intent || {};
  const binding = inputs?.revenue_binding || {};

  const globalConversion = revenue.totals?.conversion_rate ?? funnels.conversion_rate ?? 0;
  const intentScore = intent.score ?? inputs?.lead_state?.score ?? 0;

  const offers = DEFAULT_OFFERS.map(function (offer) {
    return scoreSingleOffer(offer, {
      globalConversion: globalConversion,
      intentScore: intentScore,
      eventCounts: eventCounts,
      binding: binding,
      revenue: revenue
    });
  });

  offers.sort(function (a, b) {
    return b.composite_score - a.composite_score;
  });

  return {
    mode: "safe",
    advisory_only: true,
    offers: offers,
    top_offer: offers[0] || null,
    ranked_ids: offers.map(function (o) {
      return o.id;
    }),
    scored_at: Date.now()
  };
}

/**
 * @param {object} offer
 * @param {object} ctx
 * @returns {object}
 */
function scoreSingleOffer(offer, ctx) {
  const conversionScore = computeConversionScore(offer, ctx);
  const ltvScore = computeLtvScore(offer, ctx);
  const engagementScore = computeEngagementScore(offer, ctx);

  const composite = Math.round(conversionScore * 0.45 + ltvScore * 0.35 + engagementScore * 0.2);

  return {
    id: offer.id,
    name: offer.name,
    landing_id: offer.landing_id || null,
    channel: offer.channel,
    type: offer.type,
    scores: {
      conversion: conversionScore,
      ltv: ltvScore,
      engagement: engagementScore,
      composite: composite
    },
    metrics: {
      estimated_conversion_rate: estimateOfferConversion(offer, ctx),
      estimated_ltv_annual: offer.base_ltv_annual,
      engagement_quality: engagementScore >= 60 ? "high" : engagementScore >= 35 ? "medium" : "low"
    },
    rank_signal: composite >= 70 ? "prioritize" : composite >= 45 ? "maintain" : "optimize",
    advisory: true,
    executable: false
  };
}

/**
 * @param {object} offer
 * @param {object} ctx
 * @returns {number}
 */
function computeConversionScore(offer, ctx) {
  const base = Math.min(100, Math.round((ctx.globalConversion || 0) * 400));
  if (offer.type === "conversion") {
    return Math.min(100, base + (ctx.eventCounts.form_submits || 0) * 12);
  }
  if (offer.type === "acquisition") {
    return Math.min(100, base + (ctx.eventCounts.cta_clicks || 0) * 8);
  }
  if (offer.type === "engagement") {
    return Math.min(100, base + (ctx.eventCounts.video_events || 0) * 10);
  }
  return Math.min(100, base + 20);
}

/**
 * @param {object} offer
 * @param {object} ctx
 * @returns {number}
 */
function computeLtvScore(offer, ctx) {
  const segmentBinding = (ctx.binding?.bindings || []).find(function (b) {
    return b.segment === "A";
  });
  const annualPotential = segmentBinding?.ltv_estimate?.annual || offer.base_ltv_annual;
  const normalized = Math.min(100, Math.round((annualPotential / 200000) * 100));
  if (offer.type === "upsell") {
    return Math.min(100, normalized + 15);
  }
  if (offer.type === "retention") {
    return Math.min(100, normalized - 5);
  }
  return normalized;
}

/**
 * @param {object} offer
 * @param {object} ctx
 * @returns {number}
 */
function computeEngagementScore(offer, ctx) {
  const intent = Math.min(100, Number(ctx.intentScore) || 0);
  const activity = Math.min(100, ctx.eventCounts.engagement_score || 0);
  if (offer.type === "engagement") {
    return Math.min(100, Math.round(intent * 0.5 + activity * 0.5 + 10));
  }
  return Math.round(intent * 0.6 + activity * 0.4);
}

/**
 * @param {object} offer
 * @param {object} ctx
 * @returns {number}
 */
function estimateOfferConversion(offer, ctx) {
  const base = ctx.globalConversion || 0.02;
  if (offer.type === "conversion") {
    return Number(Math.min(0.25, base * 1.4).toFixed(4));
  }
  if (offer.type === "engagement") {
    return Number(Math.min(0.15, base * 0.7).toFixed(4));
  }
  return Number(base.toFixed(4));
}
