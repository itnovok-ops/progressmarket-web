/**
 * Client-side intent scoring for the active session.
 * Publishes window.__LIFEOS_INTENT_MAP__
 */

const state = {
  fastScroll: false,
  scrollStops: 0,
  hasInteraction: false,
  videoView: false,
  videoClick: false,
  ctaClick: false,
  formInteraction: false,
  formSubmit: false,
  score: 15
};

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [metadata]
 */
export function ingestIntentEvent(eventName, metadata) {
  try {
    if (eventName === "scroll") {
      if (metadata && metadata.fast_scroll) {
        state.fastScroll = true;
        state.score = Math.max(0, state.score - 10);
      }
      if (metadata && metadata.pause_ms && Number(metadata.pause_ms) > 2000) {
        state.scrollStops += 1;
        state.score = Math.max(state.score, 45);
      }
      if (metadata && metadata.depth && Number(metadata.depth) >= 0.4 && !metadata.fast_scroll) {
        state.scrollStops += 1;
        state.score = Math.max(state.score, 42);
      }
    }

    if (eventName === "video_view" || eventName === "video_play") {
      state.videoView = true;
      state.hasInteraction = true;
      state.score = Math.max(state.score, 48);
    }

    if (eventName === "video_click") {
      state.videoClick = true;
      state.hasInteraction = true;
      state.score = Math.max(state.score, 72);
    }

    if (eventName === "cta_click") {
      state.ctaClick = true;
      state.hasInteraction = true;
      state.score = Math.max(state.score, 78);
    }

    if (eventName === "form_start" || eventName === "form_focus") {
      state.formInteraction = true;
      state.hasInteraction = true;
      state.score = Math.max(state.score, 82);
    }

    if (eventName === "form_submit") {
      state.formSubmit = true;
      state.hasInteraction = true;
      state.score = Math.max(state.score, 92);
    }

    if (state.fastScroll && !state.hasInteraction) {
      state.score = Math.min(state.score, 32);
    }

    state.score = Math.max(0, Math.min(100, state.score));
    publishIntentMap();
  } catch (_error) {
    /* silent */
  }
}

function resolveLevel(score) {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function publishIntentMap() {
  const level = resolveLevel(state.score);

  const distribution = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  distribution[level] = 1;

  const map = {
    level: level,
    score: state.score,
    signals: {
      fast_scroll: state.fastScroll,
      scroll_stops: state.scrollStops,
      video_view: state.videoView,
      video_click: state.videoClick,
      cta_click: state.ctaClick,
      form_interaction: state.formInteraction,
      form_submit: state.formSubmit
    },
    distribution: distribution,
    rules: {
      LOW: "fast scroll, no interaction",
      MEDIUM: "scroll stop, video view",
      HIGH: "video click, CTA click, form interaction"
    },
    calculated_at: Date.now()
  };

  if (typeof window !== "undefined") {
    window.__LIFEOS_INTENT_MAP__ = map;
  }

  return map;
}

export function getIntentMap() {
  return publishIntentMap();
}

if (typeof window !== "undefined") {
  publishIntentMap();
}
