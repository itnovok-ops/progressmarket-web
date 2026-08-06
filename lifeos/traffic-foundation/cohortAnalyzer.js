/**
 * Cohort Analyzer — behavior cohorts over time (read-only).
 * SAFE MODE: analysis only, no routing changes.
 */

const WINDOWS = [
  { key: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
  { key: "90d", ms: 90 * 24 * 60 * 60 * 1000 }
];

/**
 * @param {object[]} clients
 * @param {object[]} [events]
 * @param {number} [now]
 * @returns {object}
 */
export function analyzeCohorts(clients, events, now) {
  const ts = now || Date.now();
  const clientList = Array.isArray(clients) ? clients : [];
  const eventList = Array.isArray(events) ? events : [];

  const timeCohorts = WINDOWS.map(function (window) {
    return buildTimeCohort(window.key, window.ms, ts, clientList, eventList);
  });

  const segmentCohorts = buildSegmentCohorts(clientList);
  const sourceCohorts = buildSourceCohorts(clientList);

  return {
    windows: timeCohorts,
    by_segment: segmentCohorts,
    by_source: sourceCohorts,
    engagement_trend: computeEngagementTrend(eventList, ts),
    analyzed_at: ts
  };
}

/**
 * @param {string} label
 * @param {number} windowMs
 * @param {number} now
 * @param {object[]} clients
 * @param {object[]} events
 * @returns {object}
 */
function buildTimeCohort(label, windowMs, now, clients, events) {
  const cutoff = now - windowMs;
  const activeClients = clients.filter(function (c) {
    const last = Number(c.last_active_at ?? c.mapped_at ?? c.updated_at) || 0;
    return last >= cutoff;
  });

  const windowEvents = events.filter(function (e) {
    return (Number(e.timestamp) || 0) >= cutoff;
  });

  const conversions = windowEvents.filter(function (e) {
    const type = e.type || e.event || "";
    return type === "form_submit" || type === "form_submit_success";
  }).length;

  return {
    window: label,
    active_clients: activeClients.length,
    events: windowEvents.length,
    conversions: conversions,
    conversion_rate:
      windowEvents.length > 0 ? Number((conversions / windowEvents.length).toFixed(4)) : 0,
    avg_events_per_client:
      activeClients.length > 0 ? Number((windowEvents.length / activeClients.length).toFixed(2)) : 0
  };
}

/**
 * @param {object[]} clients
 * @returns {object[]}
 */
function buildSegmentCohorts(clients) {
  const buckets = { A: [], B: [], C: [] };

  clients.forEach(function (client) {
    const seg = client.abc_segment || "C";
    if (buckets[seg]) {
      buckets[seg].push(client);
    }
  });

  return ["A", "B", "C"].map(function (seg) {
    const group = buckets[seg];
    const avgEngagement =
      group.length > 0
        ? Math.round(
            group.reduce(function (sum, c) {
              return sum + (c.abc_scores?.engagement ?? c.engagement_score ?? 0);
            }, 0) / group.length
          )
        : 0;

    return {
      segment: seg,
      size: group.length,
      avg_engagement: avgEngagement,
      retention_signal: group.length > 0 ? "active" : "empty"
    };
  });
}

/**
 * @param {object[]} clients
 * @returns {object[]}
 */
function buildSourceCohorts(clients) {
  const map = {};

  clients.forEach(function (client) {
    const src = client.source || "direct";
    if (!map[src]) {
      map[src] = { source: src, clients: 0, segments: { A: 0, B: 0, C: 0 } };
    }
    map[src].clients += 1;
    const seg = client.abc_segment || "C";
    map[src].segments[seg] = (map[src].segments[seg] || 0) + 1;
  });

  return Object.keys(map)
    .map(function (key) {
      return map[key];
    })
    .sort(function (a, b) {
      return b.clients - a.clients;
    });
}

/**
 * @param {object[]} events
 * @param {number} now
 * @returns {object}
 */
function computeEngagementTrend(events, now) {
  const recent = events.filter(function (e) {
    return (Number(e.timestamp) || 0) >= now - WINDOWS[0].ms;
  }).length;

  const prior = events.filter(function (e) {
    const ts = Number(e.timestamp) || 0;
    return ts >= now - WINDOWS[1].ms && ts < now - WINDOWS[0].ms;
  }).length;

  let direction = "stable";
  if (recent > prior * 1.15) {
    direction = "rising";
  } else if (recent < prior * 0.85) {
    direction = "falling";
  }

  return {
    recent_7d_events: recent,
    prior_7d_events: prior,
    direction: direction
  };
}
