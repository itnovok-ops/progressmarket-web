/**
 * Competitive Core — orchestrates market intelligence pipeline (read-only, advisory).
 */

import { collectCompetitors } from "./competitorCollector.js";
import { parseMarketPage } from "./marketParser.js";
import { detectPatterns } from "./patternEngine.js";
import { analyzeGaps, buildOurProfile, computeMarketScore } from "./gapAnalyzer.js";
import { compareOffers } from "./offerComparator.js";
import { generateCompetitiveRecommendations } from "./recommendationEngine.js";

const COMPETITIVE_EVENT = "lifeos:competitive:update";
let cycleInFlight = false;
let lastPayload = null;
let intelStarted = false;

/**
 * @param {object} [sources]
 * @returns {Promise<object>}
 */
export async function runCompetitiveCycle(sources) {
  if (cycleInFlight) {
    return lastPayload || emptyPayload();
  }

  cycleInFlight = true;

  try {
    const ctx = sources || {};
    const competitors = await collectCompetitors();
    const parsedPages = competitors.map(function (comp) {
      return parseMarketPage(comp.html, {
        id: comp.id,
        name: comp.name,
        url: comp.url
      });
    });

    const ourProfile = buildOurProfile(ctx);
    const patterns = detectPatterns(parsedPages);
    const gaps = analyzeGaps(ourProfile, patterns);
    const offerComparison = compareOffers(ourProfile, parsedPages);
    const recommendations = generateCompetitiveRecommendations(gaps, patterns, offerComparison);
    const marketScore = computeMarketScore(ourProfile, patterns);

    const payload = {
      ok: true,
      mode: "advisory",
      patterns: patterns,
      gaps: gaps,
      recommendations: recommendations,
      marketScore: marketScore,
      offers: offerComparison,
      our_profile: ourProfile,
      competitors_analyzed: parsedPages.length,
      competitors_skipped: competitors.length - parsedPages.length,
      updated_at: Date.now()
    };

    publishCompetitiveState(payload);
    lastPayload = payload;
    return payload;
  } catch (_error) {
    const fallback = emptyPayload();
    fallback.ok = false;
    fallback.error = "competitive_cycle_failed_safely";
    publishCompetitiveState(fallback);
    lastPayload = fallback;
    return fallback;
  } finally {
    cycleInFlight = false;
  }
}

/**
 * Synchronous snapshot from cache or benchmark-only analysis.
 * @param {object} [sources]
 * @returns {object}
 */
export function runCompetitiveCycleSync(sources) {
  if (lastPayload && Date.now() - lastPayload.updated_at < 60000) {
    return lastPayload;
  }

  const ctx = sources || {};
  const ourProfile = buildOurProfile(ctx);
  const patterns = detectPatterns([]);
  const gaps = analyzeGaps(ourProfile, patterns);
  const offerComparison = compareOffers(ourProfile, []);
  const recommendations = generateCompetitiveRecommendations(gaps, patterns, offerComparison);
  const marketScore = computeMarketScore(ourProfile, patterns);

  const payload = {
    ok: true,
    mode: "advisory",
    patterns: patterns,
    gaps: gaps,
    recommendations: recommendations,
    marketScore: marketScore,
    offers: offerComparison,
    our_profile: ourProfile,
    competitors_analyzed: 0,
    competitors_skipped: 0,
    sync_fallback: true,
    updated_at: Date.now()
  };

  publishCompetitiveState(payload);
  lastPayload = payload;

  runCompetitiveCycle(ctx).catch(function () {
    /* async enrichment must not throw */
  });

  return payload;
}

/**
 * @param {object} payload
 */
function publishCompetitiveState(payload) {
  try {
    window.__LIFEOS_COMPETITIVE__ = payload;

    window.__LIFEOS_GET_COMPETITIVE__ = function () {
      return window.__LIFEOS_COMPETITIVE__;
    };

    window.__LIFEOS_RUN_COMPETITIVE__ = function () {
      return runCompetitiveCycleSync(collectInlineSources());
    };

    document.dispatchEvent(
      new CustomEvent(COMPETITIVE_EVENT, { detail: payload })
    );
  } catch (_error) {
    /* silent */
  }
}

/**
 * @returns {object}
 */
function collectInlineSources() {
  return {
    observer: window.__LIFEOS_OBSERVER_REPORT__ || null,
    landing_stats: window.__LIFEOS_LANDING_STATS__ || null
  };
}

/**
 * @returns {object}
 */
function emptyPayload() {
  return {
    ok: true,
    mode: "advisory",
    patterns: detectPatterns([]),
    gaps: [],
    recommendations: [],
    marketScore: 50,
    offers: null,
    competitors_analyzed: 0,
    updated_at: Date.now()
  };
}

/**
 * Start competitive intelligence refresh loop (LifeOS layer — not landing UI).
 * @param {{ intervalMs?: number }} [options]
 */
export function startCompetitiveIntel(options) {
  window.__LIFEOS_COMPETITIVE_READONLY__ = true;

  if (window.__LIFEOS_PRODUCTION_MODE__ === true) {
    return runCompetitiveCycleSync(collectInlineSources());
  }

  if (!intelStarted) {
    intelStarted = true;
    const interval = options?.intervalMs || 60000;

    window.setInterval(function () {
      runCompetitiveCycle(collectInlineSources()).catch(function () {});
    }, interval);

    document.addEventListener("lifeos:observer:update", function () {
      runCompetitiveCycleSync(collectInlineSources());
    });
  }

  return runCompetitiveCycleSync(collectInlineSources());
}
