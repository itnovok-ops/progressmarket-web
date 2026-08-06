/**
 * Revenue Binding — connect ABC segments to revenue metrics and LTV estimates.
 * SAFE MODE: advisory projections only, no execution.
 */

const DEFAULT_LTV = {
  A: { monthly: 12500, annual: 150000, currency: "RUB" },
  B: { monthly: 5200, annual: 62000, currency: "RUB" },
  C: { monthly: 1800, annual: 22000, currency: "RUB" }
};

/**
 * @param {object} segmentSummary from abcSegmentation.buildSegmentSummary
 * @param {object} [revenueData] from __LIFEOS_REVENUE_SAFE__
 * @param {object} [config]
 * @returns {object}
 */
export function bindSegmentsToRevenue(segmentSummary, revenueData, config) {
  const segments = segmentSummary || {};
  const revenue = revenueData || {};
  const ltvConfig = Object.assign({}, DEFAULT_LTV, config?.ltv || {});

  const bindings = SEGMENT_KEYS.map(function (key) {
    const bucket = segments[key] || { count: 0, segment: key };
    const ltv = estimateLTV(key, ltvConfig);
    const count = bucket.count || 0;

    return {
      segment: key,
      client_count: count,
      share: bucket.share || 0,
      avg_observed_revenue: bucket.avg_revenue || 0,
      ltv_estimate: ltv,
      revenue_potential: {
        monthly: count * ltv.monthly,
        annual: count * ltv.annual,
        currency: ltv.currency
      }
    };
  });

  const totals = bindings.reduce(
    function (acc, row) {
      acc.monthly += row.revenue_potential.monthly;
      acc.annual += row.revenue_potential.annual;
      acc.clients += row.client_count;
      return acc;
    },
    { monthly: 0, annual: 0, clients: 0, currency: ltvConfig.A.currency }
  );

  return {
    bindings: bindings,
    totals: {
      monthly_potential: Math.round(totals.monthly),
      annual_potential: Math.round(totals.annual),
      client_count: totals.clients,
      currency: totals.currency
    },
    observed_revenue: extractObservedRevenue(revenue),
    uplift_vs_observed: computeUplift(totals.annual, revenue),
    bound_at: Date.now()
  };
}

const SEGMENT_KEYS = ["A", "B", "C"];

/**
 * @param {"A"|"B"|"C"} segment
 * @param {object} [config]
 * @returns {{ monthly: number, annual: number, currency: string }}
 */
export function estimateLTV(segment, config) {
  const table = config || DEFAULT_LTV;
  const row = table[segment] || table.C;
  return {
    monthly: row.monthly,
    annual: row.annual,
    currency: row.currency || "RUB"
  };
}

/**
 * @param {object} revenueData
 * @returns {object}
 */
function extractObservedRevenue(revenueData) {
  const roi = revenueData?.revenue || revenueData || {};
  const funnel = revenueData?.funnels || {};

  return {
    estimated_monthly: roi.estimated_monthly_revenue ?? roi.monthly_revenue ?? null,
    estimated_annual: roi.estimated_annual_revenue ?? roi.annual_revenue ?? null,
    conversion_value: roi.conversion_value ?? null,
    funnel_conversion_rate: funnel.overall?.conversion_rate ?? funnel.conversion_rate ?? null,
    mode: "observed_snapshot"
  };
}

/**
 * @param {number} annualPotential
 * @param {object} revenueData
 * @returns {object|null}
 */
function computeUplift(annualPotential, revenueData) {
  const observed = extractObservedRevenue(revenueData);
  const base = Number(observed.estimated_annual) || 0;

  if (!base || !annualPotential) {
    return null;
  }

  return {
    annual_gap: Math.round(annualPotential - base),
    ratio: Number((annualPotential / base).toFixed(2))
  };
}
