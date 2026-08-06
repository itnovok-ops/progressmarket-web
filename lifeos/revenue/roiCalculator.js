/**
 * ROI Calculator — per landing / channel ROI estimates (SAFE MODE, read-only).
 */

import { getAssumedLeadValue, getAssumedTrafficCost } from "./revenueCore.js";

/**
 * @param {object} sources
 * @param {object} funnelAnalysis
 * @param {object} trafficAttribution
 * @returns {object}
 */
export function calculateRoi(sources, funnelAnalysis, trafficAttribution) {
  const config = sources?.config || {};
  const landing = sources?.landing || {};
  const leadValue = getAssumedLeadValue(config);
  const trafficCost = getAssumedTrafficCost(config);

  const sessions = Math.max(landing.sessions || sources?.growth?.sessionsTracked || 1, 1);
  const conversions = Math.max(
    landing.counters?.formSubmits || 0,
    sources?.growth?.conversionsRecorded || 0,
    funnelAnalysis?.conversion_rate > 0 ? 1 : 0
  );

  const conversionRate = funnelAnalysis?.conversion_rate || 0;
  const estimatedRevenue = conversions * leadValue;
  const estimatedCost = sessions * trafficCost;
  const roi = estimatedCost > 0 ? Number(((estimatedRevenue - estimatedCost) / estimatedCost).toFixed(4)) : 0;

  const byLanding = [
    {
      landing_id: landing.landing_id || "wb-fbs-v1",
      sessions: sessions,
      conversions: conversions,
      conversion_rate: conversionRate,
      estimated_revenue: estimatedRevenue,
      estimated_cost: estimatedCost,
      roi: roi,
      lead_value_assumed: leadValue
    }
  ];

  const byChannel = (trafficAttribution?.channels || []).map(function (channel) {
    const channelConversions = channel.conversions || 0;
    const channelSessions = Math.max(channel.sessions || 1, 1);
    const channelRevenue = channelConversions * leadValue;
    const channelCost = channelSessions * trafficCost;
    const channelRoi = channelCost > 0
      ? Number(((channelRevenue - channelCost) / channelCost).toFixed(4))
      : 0;

    return {
      channel: channel.source,
      sessions: channelSessions,
      conversions: channelConversions,
      conversion_rate: channel.conversion_rate || 0,
      estimated_revenue: channelRevenue,
      estimated_cost: channelCost,
      roi: channelRoi
    };
  });

  return {
    mode: "estimated",
    currency: config.currency || "RUB",
    totals: {
      sessions: sessions,
      conversions: conversions,
      conversion_rate: conversionRate,
      estimated_revenue: estimatedRevenue,
      estimated_cost: estimatedCost,
      roi: roi,
      profit_estimate: estimatedRevenue - estimatedCost
    },
    by_landing: byLanding,
    by_channel: byChannel,
    assumptions: {
      lead_value: leadValue,
      traffic_cost_per_session: trafficCost,
      advisory: true
    },
    calculated_at: Date.now()
  };
}
