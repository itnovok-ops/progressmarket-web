/**
 * Client-side conversion pipeline metrics (local session).
 */

import { getSessionSnapshot } from "./eventSchema.js";

const state = {
  maxScrollDepth: 0,
  ctaClicks: 0,
  formStarts: 0,
  formSubmits: 0,
  videoPlays: 0,
  exitIntent: false,
  lastStage: "visit",
  dropOffStage: null
};

const STAGES = ["visit", "scroll", "video_view", "video_click", "cta_click", "form_start", "form_submit"];

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [metadata]
 */
export function ingest(eventName, metadata) {
  try {
    if (eventName === "visit") {
      state.lastStage = "visit";
    }
    if (eventName === "scroll") {
      state.lastStage = "scroll";
      const depth = Number(metadata?.depth ?? metadata?.ratio ?? 0);
      if (depth > state.maxScrollDepth) {
        state.maxScrollDepth = depth;
      }
    }
    if (eventName === "video_view") {
      state.lastStage = "video_view";
    }
    if (eventName === "video_play") {
      state.videoPlays += 1;
      state.lastStage = "video_click";
    }
    if (eventName === "video_click") {
      state.videoPlays += 1;
      state.lastStage = "video_click";
    }
    if (eventName === "cta_click") {
      state.ctaClicks += 1;
      state.lastStage = "cta_click";
    }
    if (eventName === "form_focus") {
      state.formStarts += 1;
      state.lastStage = "form_start";
    }
    if (eventName === "form_start") {
      state.formStarts += 1;
      state.lastStage = "form_start";
    }
    if (eventName === "form_submit") {
      state.formSubmits += 1;
      state.lastStage = "form_submit";
    }
    if (eventName === "exit_intent") {
      state.exitIntent = true;
    }

    publish();
  } catch (error) {
    /* silent */
  }
}

function publish() {
  const scrollDepthPct = Math.round(state.maxScrollDepth * 100);
  const ctaRate = state.ctaClicks > 0 ? 1 : 0;
  const formConversion = state.formStarts > 0 ? state.formSubmits / state.formStarts : 0;

  let dropOff = null;
  for (let i = 0; i < STAGES.length - 1; i++) {
    const stage = STAGES[i];
    const next = STAGES[i + 1];
    if (state.lastStage === stage && next !== state.lastStage) {
      const reachedNext = STAGES.indexOf(state.lastStage) >= STAGES.indexOf(next);
      if (!reachedNext && stage !== "form_submit") {
        dropOff = next;
      }
    }
  }

  if (state.exitIntent && state.lastStage !== "form_submit") {
    state.dropOffStage = state.lastStage;
  }

  const snapshot = {
    scroll_depth_pct: scrollDepthPct,
    cta_click_rate: ctaRate,
    form_conversion_rate: Number(formConversion.toFixed(4)),
    drop_off_stage: state.dropOffStage || dropOff,
    counters: {
      cta_clicks: state.ctaClicks,
      form_starts: state.formStarts,
      form_submits: state.formSubmits,
      video_plays: state.videoPlays
    }
  };

  if (typeof window !== "undefined") {
    window.__LIFEOS_GROWTH_PIPELINE__ = snapshot;
  }

  return snapshot;
}

/**
 * @returns {object}
 */
export function getSummary() {
  const pipeline = publish();
  return Object.assign(
    {
      session: getSessionSnapshot(),
      timestamp: Date.now()
    },
    pipeline
  );
}

export function resetPipeline() {
  state.maxScrollDepth = 0;
  state.ctaClicks = 0;
  state.formStarts = 0;
  state.formSubmits = 0;
  state.videoPlays = 0;
  state.exitIntent = false;
  state.lastStage = "visit";
  state.dropOffStage = null;
  publish();
}

// initial publish in browser only
if (typeof window !== "undefined") {
  publish();
}
