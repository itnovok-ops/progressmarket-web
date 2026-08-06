/**
 * Traffic Attribution — maps traffic sources to conversions (SAFE MODE, read-only).
 */

/**
 * @param {object} sources
 * @returns {object}
 */
export function attributeTraffic(sources) {
  const session = sources?.session || {};
  const events = sources?.events || [];
  const context = session.context || {};
  const landing = sources?.landing || {};

  const primarySource = context.source || context.utm_source || "direct";
  const campaignId = context.campaignId || context.utm_campaign || null;

  const channelMap = {};
  registerChannel(channelMap, primarySource, events, landing);

  events.forEach(function (event) {
    const meta = event.metadata || {};
    const src = meta.source || meta.utm_source || meta.channel;
    if (src && src !== primarySource) {
      registerChannel(channelMap, String(src), [event], landing);
    }
  });

  const channels = Object.keys(channelMap).map(function (key) {
    return channelMap[key];
  }).sort(function (a, b) {
    return (b.conversions || 0) - (a.conversions || 0);
  });

  const totalConversions = channels.reduce(function (sum, c) {
    return sum + (c.conversions || 0);
  }, 0);

  return {
    primary_source: primarySource,
    campaign_id: campaignId,
    session_mode: session.status || "guest",
    channels: channels,
    quality: assessTrafficQuality(sources),
    total_attributed_conversions: totalConversions,
    attributed_at: Date.now()
  };
}

/**
 * @param {Record<string, object>} map
 * @param {string} source
 * @param {object[]} events
 * @param {object} landing
 */
function registerChannel(map, source, events, landing) {
  if (!map[source]) {
    map[source] = {
      source: source,
      sessions: landing.sessions || 1,
      events: 0,
      cta_clicks: 0,
      form_starts: 0,
      conversions: 0,
      conversion_rate: 0
    };
  }

  const channel = map[source];
  events.forEach(function (event) {
    channel.events += 1;
    const name = event.event || "";
    if (name === "cta_click") {
      channel.cta_clicks += 1;
    }
    if (name === "form_start" || name === "form_focus") {
      channel.form_starts += 1;
    }
    if (name === "form_submit") {
      channel.conversions += 1;
    }
  });

  if (source === (landing.landing_id ? "landing" : "direct") || channel.conversions === 0) {
    channel.conversions = Math.max(channel.conversions, landing.counters?.formSubmits || 0);
  }

  channel.conversion_rate = channel.sessions > 0
    ? Number((channel.conversions / channel.sessions).toFixed(4))
    : 0;
}

/**
 * @param {object} sources
 * @returns {object}
 */
function assessTrafficQuality(sources) {
  const intent = sources?.intent || {};
  const landing = sources?.landing || {};

  return {
    intent_level: intent.level || landing.intent_level || "UNKNOWN",
    intent_score: intent.score ?? landing.average_intent_score ?? 0,
    ctr: landing.ctr ?? 0,
    video_engagement: landing.video_engagement_rate ?? 0,
    label: intent.level === "HIGH" ? "high_quality" : intent.level === "LOW" ? "low_quality" : "mixed"
  };
}
