/**
 * Traffic Intake — inbound source definitions (Telegram / Instagram / YouTube / Direct).
 * SAFE MODE: classification and mapping only.
 */

export const TRAFFIC_SOURCES = {
  telegram: {
    id: "telegram",
    label: "Telegram",
    channel: "messaging",
    utm_aliases: ["telegram", "tg", "t.me"]
  },
  instagram: {
    id: "instagram",
    label: "Instagram",
    channel: "social",
    utm_aliases: ["instagram", "ig", "insta"]
  },
  youtube: {
    id: "youtube",
    label: "YouTube",
    channel: "video",
    utm_aliases: ["youtube", "yt", "youtu"]
  },
  direct: {
    id: "direct",
    label: "Direct",
    channel: "owned",
    utm_aliases: ["direct", "organic", "landing", "none"]
  }
};

const SOURCE_KEYS = Object.keys(TRAFFIC_SOURCES);

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeSourceKey(raw) {
  const value = String(raw || "direct").trim().toLowerCase();

  for (let i = 0; i < SOURCE_KEYS.length; i++) {
    const key = SOURCE_KEYS[i];
    const def = TRAFFIC_SOURCES[key];
    if (key === value) {
      return key;
    }
    if (def.utm_aliases.some(function (alias) { return value.indexOf(alias) >= 0; })) {
      return key;
    }
  }

  if (value === "referral" || value === "unknown" || !value) {
    return "direct";
  }

  return "direct";
}

/**
 * @param {object|null} session
 * @param {object[]} [events]
 * @returns {object}
 */
export function classifyInboundSources(session, events) {
  const ctx = session?.context || {};
  const primary = normalizeSourceKey(ctx.source || ctx.utm_source || "direct");
  const counts = { telegram: 0, instagram: 0, youtube: 0, direct: 0 };
  counts[primary] = (counts[primary] || 0) + 1;

  (events || []).forEach(function (event) {
    const meta = event.payload || event.metadata || event.meta || {};
    const src = meta.source || meta.utm_source || meta.channel || meta.referrer;
    if (src) {
      const key = normalizeSourceKey(src);
      counts[key] = (counts[key] || 0) + 1;
    }
  });

  const totalTouches = Object.keys(counts).reduce(function (sum, k) {
    return sum + counts[k];
  }, 0);

  const channels = SOURCE_KEYS.map(function (key) {
    const def = TRAFFIC_SOURCES[key];
    const touches = counts[key] || 0;
    return {
      source: key,
      label: def.label,
      channel: def.channel,
      touches: touches,
      share: totalTouches > 0 ? Number((touches / totalTouches).toFixed(4)) : 0,
      primary: key === primary
    };
  }).sort(function (a, b) {
    return b.touches - a.touches;
  });

  return {
    primary_source: primary,
    primary_label: TRAFFIC_SOURCES[primary].label,
    campaign_id: ctx.campaignId || ctx.utm_campaign || null,
    channels: channels,
    total_touches: totalTouches,
    session_mode: session?.status || "guest",
    classified_at: Date.now()
  };
}

/**
 * @param {object[]} clients mapped clients with source field
 * @returns {object}
 */
export function aggregateClientSources(clients) {
  const counts = { telegram: 0, instagram: 0, youtube: 0, direct: 0 };

  (clients || []).forEach(function (client) {
    const key = normalizeSourceKey(client.source || "direct");
    counts[key] = (counts[key] || 0) + 1;
  });

  const total = (clients || []).length || 1;

  return {
    by_source: SOURCE_KEYS.map(function (key) {
      return {
        source: key,
        label: TRAFFIC_SOURCES[key].label,
        clients: counts[key] || 0,
        share: Number(((counts[key] || 0) / total).toFixed(4))
      };
    }),
    total_clients: (clients || []).length,
    aggregated_at: Date.now()
  };
}
