/**
 * Client-side funnel metrics for the active session.
 * Publishes window.__LIFEOS_FUNNEL_METRICS__
 */

const STAGES = ["visit", "scroll", "video", "cta", "form_start", "form_submit"];

const state = {
  reached: {
    visit: false,
    scroll: false,
    video: false,
    cta: false,
    form_start: false,
    form_submit: false
  }
};

/**
 * @param {string} eventName
 */
export function ingestFunnelEvent(eventName) {
  try {
    if (eventName === "visit") {
      state.reached.visit = true;
    }
    if (eventName === "scroll") {
      state.reached.scroll = true;
    }
    if (eventName === "video_view" || eventName === "video_play" || eventName === "video_click") {
      state.reached.video = true;
    }
    if (eventName === "cta_click") {
      state.reached.cta = true;
    }
    if (eventName === "form_start" || eventName === "form_focus") {
      state.reached.form_start = true;
    }
    if (eventName === "form_submit") {
      state.reached.form_submit = true;
    }

    publishFunnelMetrics();
  } catch (_error) {
    /* silent */
  }
}

function publishFunnelMetrics() {
  const entryCount = state.reached.visit ? 1 : 0;
  const rates = {};
  const dropOffs = {};
  let prevCount = Math.max(entryCount, 1);
  let weakest = "visit";
  let maxDrop = -1;

  STAGES.forEach(function (stage, index) {
    const count = state.reached[stage] ? 1 : 0;
    rates[stage] = entryCount > 0 ? Number((count / entryCount).toFixed(4)) : 0;

    if (index > 0) {
      const drop = prevCount > 0 ? Number((1 - count / prevCount).toFixed(4)) : 0;
      dropOffs[stage] = drop;
      if (drop > maxDrop) {
        maxDrop = drop;
        weakest = stage;
      }
    } else {
      dropOffs[stage] = 0;
    }

    prevCount = Math.max(count, prevCount > 0 ? prevCount : 1);
  });

  const metrics = {
    stages: STAGES,
    reached: Object.assign({}, state.reached),
    rates: rates,
    drop_offs: dropOffs,
    weakest_stage: weakest,
    conversion_rate: rates.form_submit || 0,
    bottleneck: weakest,
    calculated_at: Date.now()
  };

  if (typeof window !== "undefined") {
    window.__LIFEOS_FUNNEL_METRICS__ = metrics;
  }

  return metrics;
}

export function getFunnelMetrics() {
  return publishFunnelMetrics();
}

if (typeof window !== "undefined") {
  publishFunnelMetrics();
}
