const MAX_EVENTS = 500;
const SCROLL_THRESHOLDS = [25, 50, 75, 100];

import { throttle } from "../performance/throttle.js";
import { queueEvent, registerBatchProcessor } from "../performance/eventBatch.js";
import { validateNikaState } from "../safety/stateValidator.js";

let batchProcessorRegistered = false;
function ensureNikaState() {
  if (!window.__NIKA_STATE__ || typeof window.__NIKA_STATE__ !== "object") {
    window.__NIKA_STATE__ = validateNikaState({
      ctr: 0,
      health: 100,
      events: [],
      insights: [],
      recommendations: [],
      diagnostics: {},
      fixProposals: [],
      approvedFixes: [],
      appliedFixes: []
    });
    return window.__NIKA_STATE__;
  }

  window.__NIKA_STATE__ = validateNikaState(window.__NIKA_STATE__);
  const state = window.__NIKA_STATE__;
  state.fixProposals = Array.isArray(state.fixProposals) ? state.fixProposals : [];
  state.approvedFixes = Array.isArray(state.approvedFixes) ? state.approvedFixes : [];
  state.appliedFixes = Array.isArray(state.appliedFixes) ? state.appliedFixes : [];
  state.diagnostics = state.diagnostics || {};
  return state;
}

function trimEvents(state) {
  if (state.events.length > MAX_EVENTS) {
    state.events.splice(0, state.events.length - MAX_EVENTS);
  }
}

function computeScrollDepthPct() {
  const body = document.body;
  const doc = document.documentElement;
  if (!body || !doc) return 0;

  const scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
  const viewport = window.innerHeight || doc.clientHeight || 0;
  const fullHeight = Math.max(body.scrollHeight, doc.scrollHeight, doc.offsetHeight, body.offsetHeight);
  const totalScrollable = Math.max(fullHeight - viewport, 1);
  const pct = Math.min(100, Math.max(0, Math.round((scrollTop / totalScrollable) * 100)));
  return pct;
}

function summarizeTarget(target) {
  if (!target || !(target instanceof Element)) return "unknown";
  const tag = (target.tagName || "unknown").toLowerCase();
  const id = target.id ? "#" + target.id : "";
  const className =
    typeof target.className === "string" && target.className.trim()
      ? "." + target.className.trim().split(/\s+/).slice(0, 2).join(".")
      : "";
  return tag + id + className;
}

function recomputeMetrics(state) {
  const events = state.events;
  const clicks = events.filter(function (event) {
    return event.type === "click";
  }).length;
  const ctaClicks = events.filter(function (event) {
    return event.type === "cta_click";
  }).length;
  const scrollEvents = events.filter(function (event) {
    return event.type === "scroll_depth";
  }).length;
  const videoEvents = events.filter(function (event) {
    return event.type === "video_play" || event.type === "video_pause";
  }).length;
  const videoPlayEvents = events.filter(function (event) {
    return event.type === "video_play";
  }).length;
  const impressions = Math.max(clicks, 1);

  state.ctr = Number(((ctaClicks / impressions) * 100).toFixed(2));
  state.engagement = Number((((clicks + scrollEvents + videoEvents) / Math.max(events.length, 1)) * 100).toFixed(2));
  state.videoInteractionRate = Number(((videoPlayEvents / Math.max(videoEvents, 1)) * 100).toFixed(2));

  const healthBase = 100;
  const healthPenalty = Math.max(0, 20 - Math.min(events.length, 20)) * 2;
  state.health = Math.max(0, Math.min(100, healthBase - healthPenalty));

  state.analytics = {
    totalEvents: events.length,
    clicks: clicks,
    ctaClicks: ctaClicks,
    scrollEvents: scrollEvents,
    videoEvents: videoEvents,
    videoPlayEvents: videoPlayEvents,
    updatedAt: Date.now()
  };
}

function pushEvent(event) {
  queueEvent(event);
}

function processBatchedEvents(events) {
  const state = ensureNikaState();
  events.forEach(function (event) {
    state.events.push(event);
  });
  trimEvents(state);
  recomputeMetrics(state);
  window.__NIKA_STATE__ = state;
}

function collectClick(event) {
  const target = event.target;
  const timestamp = Date.now();

  pushEvent({
    type: "click",
    at: timestamp,
    target: summarizeTarget(target)
  });

  const ctaTarget =
    target instanceof Element
      ? target.closest("#cta a, #cta button, [data-cta], a[href*='#cta'], button[id*='cta']")
      : null;

  if (ctaTarget) {
    pushEvent({
      type: "cta_click",
      at: timestamp,
      target: summarizeTarget(ctaTarget)
    });
  }
}

function createScrollCollector() {
  let maxDepth = 0;
  const emitted = new Set();

  return function onScroll() {
    const currentDepth = computeScrollDepthPct();
    if (currentDepth <= maxDepth) return;
    maxDepth = currentDepth;

    SCROLL_THRESHOLDS.forEach(function (threshold) {
      if (maxDepth >= threshold && !emitted.has(threshold)) {
        emitted.add(threshold);
        pushEvent({
          type: "scroll_depth",
          at: Date.now(),
          depth: threshold
        });
      }
    });
  };
}

function collectVideoEvent(kind) {
  pushEvent({
    type: kind,
    at: Date.now(),
    target: "#heroVideo"
  });
}

export function initAnalyticsBridge() {
  ensureNikaState();

  if (!batchProcessorRegistered) {
    registerBatchProcessor(processBatchedEvents);
    batchProcessorRegistered = true;
  }

  if (window.__LIFEOS_ANALYTICS_BRIDGE_ACTIVE__ === true) {
    return { ok: true, active: true, reused: true };
  }

  const onClick = collectClick;
  const onScroll = throttle(createScrollCollector(), 250);
  const onVideoPlay = function () {
    collectVideoEvent("video_play");
  };
  const onVideoPause = function () {
    collectVideoEvent("video_pause");
  };

  document.addEventListener("click", onClick, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });

  const video = document.getElementById("heroVideo");
  if (video) {
    video.addEventListener("play", onVideoPlay, { passive: true });
    video.addEventListener("pause", onVideoPause, { passive: true });
  }

  window.__LIFEOS_ANALYTICS_BRIDGE_ACTIVE__ = true;
  window.__LIFEOS_ANALYTICS_BRIDGE_CLEANUP__ = function () {
    document.removeEventListener("click", onClick);
    window.removeEventListener("scroll", onScroll);
    if (video) {
      video.removeEventListener("play", onVideoPlay);
      video.removeEventListener("pause", onVideoPause);
    }
    window.__LIFEOS_ANALYTICS_BRIDGE_ACTIVE__ = false;
  };

  // Seed scroll analytics at init in case page is already scrolled.
  onScroll();

  return { ok: true, active: true };
}

