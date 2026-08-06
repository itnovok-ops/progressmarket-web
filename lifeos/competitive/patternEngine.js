/**
 * Pattern Engine — detect recurring market patterns and conversion-winning structures.
 */

const CANONICAL_FLOW = ["hero", "video", "problem", "insight", "cta", "footer"];

/**
 * Industry benchmark fallback when competitor sample is small.
 */
export const MARKET_BENCHMARKS = {
  video_present_rate: 0.82,
  video_autoplay_rate: 0.35,
  trust_present_rate: 0.68,
  sticky_cta_rate: 0.42,
  canonical_flow_rate: 0.76,
  avg_cta_count: 3.2,
  avg_headline_count: 4.5,
  primary_cta_above_fold_rate: 0.71
};

/**
 * @param {object[]} parsedPages
 * @returns {object}
 */
export function detectPatterns(parsedPages) {
  const pages = parsedPages || [];
  const count = pages.length;

  if (count === 0) {
    return buildBenchmarkPatterns();
  }

  const rates = {
    video_present: rate(pages, function (p) { return p.video?.present; }),
    video_autoplay: rate(pages, function (p) { return p.video?.has_autoplay; }),
    video_above_fold: rate(pages, function (p) { return p.video?.above_fold_hint; }),
    trust_present: rate(pages, function (p) { return (p.trust?.score || 0) >= 20; }),
    sticky_cta: rate(pages, function (p) {
      return (p.ctas || []).some(function (c) { return c.sticky_hint; });
    }),
    canonical_flow: rate(pages, function (p) { return matchesCanonicalFlow(p.structure); }),
    primary_cta_early: rate(pages, function (p) {
      return (p.ctas || []).some(function (c) { return c.primary_hint; });
    })
  };

  const avgCtaCount = average(pages, function (p) { return (p.ctas || []).length; });
  const avgHeadlines = average(pages, function (p) { return (p.headlines || []).length; });
  const avgTrustScore = average(pages, function (p) { return p.trust?.score || 0; });

  const sectionFrequency = computeSectionFrequency(pages);
  const winningStructures = identifyWinningStructures(rates, sectionFrequency);
  const ctaPhrases = topCtaPhrases(pages);

  return {
    sample_size: count,
    source: "competitors",
    rates: rates,
    averages: {
      cta_count: round(avgCtaCount),
      headline_count: round(avgHeadlines),
      trust_score: round(avgTrustScore)
    },
    section_frequency: sectionFrequency,
    winning_structures: winningStructures,
    top_cta_phrases: ctaPhrases,
    canonical_flow: CANONICAL_FLOW,
    detected_at: Date.now()
  };
}

/**
 * @returns {object}
 */
function buildBenchmarkPatterns() {
  return {
    sample_size: 0,
    source: "benchmark",
    rates: {
      video_present: MARKET_BENCHMARKS.video_present_rate,
      video_autoplay: MARKET_BENCHMARKS.video_autoplay_rate,
      video_above_fold: 0.55,
      trust_present: MARKET_BENCHMARKS.trust_present_rate,
      sticky_cta: MARKET_BENCHMARKS.sticky_cta_rate,
      canonical_flow: MARKET_BENCHMARKS.canonical_flow_rate,
      primary_cta_early: MARKET_BENCHMARKS.primary_cta_above_fold_rate
    },
    averages: {
      cta_count: MARKET_BENCHMARKS.avg_cta_count,
      headline_count: MARKET_BENCHMARKS.avg_headline_count,
      trust_score: 45
    },
    section_frequency: CANONICAL_FLOW.map(function (key, index) {
      return { key: key, frequency: 1 - index * 0.05 };
    }),
    winning_structures: [
      { id: "ws-hero-video-cta", label: "Hero → Video → CTA", confidence: 0.78 },
      { id: "ws-trust-before-cta", label: "Trust block before final CTA", confidence: 0.65 }
    ],
    top_cta_phrases: ["Get started", "Request demo", "Calculate", "Free trial"],
    canonical_flow: CANONICAL_FLOW,
    detected_at: Date.now()
  };
}

/**
 * @param {object[]} pages
 * @param {function} predicate
 * @returns {number}
 */
function rate(pages, predicate) {
  if (!pages.length) {
    return 0;
  }
  let hits = 0;
  pages.forEach(function (p) {
    if (predicate(p)) {
      hits += 1;
    }
  });
  return round(hits / pages.length);
}

/**
 * @param {object[]} pages
 * @param {function} getter
 * @returns {number}
 */
function average(pages, getter) {
  if (!pages.length) {
    return 0;
  }
  let sum = 0;
  pages.forEach(function (p) {
    sum += getter(p);
  });
  return sum / pages.length;
}

/**
 * @param {number} value
 * @returns {number}
 */
function round(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * @param {object[]} structure
 * @returns {boolean}
 */
function matchesCanonicalFlow(structure) {
  const keys = (structure || []).map(function (s) { return s.key; });
  if (keys.length < 3) {
    return false;
  }

  let lastIndex = -1;
  let matched = 0;

  CANONICAL_FLOW.forEach(function (key) {
    const idx = keys.indexOf(key);
    if (idx !== -1 && idx > lastIndex) {
      matched += 1;
      lastIndex = idx;
    }
  });

  return matched >= 4;
}

/**
 * @param {object[]} pages
 * @returns {object[]}
 */
function computeSectionFrequency(pages) {
  const totals = {};

  CANONICAL_FLOW.forEach(function (key) {
    totals[key] = 0;
  });

  pages.forEach(function (page) {
    const keys = new Set((page.structure || []).map(function (s) { return s.key; }));
    CANONICAL_FLOW.forEach(function (key) {
      if (keys.has(key)) {
        totals[key] += 1;
      }
    });
  });

  return CANONICAL_FLOW.map(function (key) {
    return {
      key: key,
      frequency: pages.length ? round(totals[key] / pages.length) : 0
    };
  });
}

/**
 * @param {object} rates
 * @param {object[]} sectionFrequency
 * @returns {object[]}
 */
function identifyWinningStructures(rates, sectionFrequency) {
  const structures = [];

  if (rates.video_present >= 0.6 && rates.canonical_flow >= 0.5) {
    structures.push({
      id: "ws-canonical-funnel",
      label: "Canonical Hero → Video → Problem → Insight → CTA flow",
      confidence: round((rates.video_present + rates.canonical_flow) / 2)
    });
  }

  if (rates.trust_present >= 0.5) {
    structures.push({
      id: "ws-trust-layer",
      label: "Trust elements (logos, stats, testimonials) before conversion",
      confidence: rates.trust_present
    });
  }

  if (rates.sticky_cta >= 0.35) {
    structures.push({
      id: "ws-sticky-cta",
      label: "Persistent sticky CTA on scroll",
      confidence: rates.sticky_cta
    });
  }

  const weakSections = sectionFrequency.filter(function (s) { return s.frequency < 0.4; });
  if (weakSections.length) {
    structures.push({
      id: "ws-rare-sections",
      label: "Market rarely uses: " + weakSections.map(function (s) { return s.key; }).join(", "),
      confidence: 0.5,
      rare_sections: weakSections.map(function (s) { return s.key; })
    });
  }

  return structures;
}

/**
 * @param {object[]} pages
 * @returns {string[]}
 */
function topCtaPhrases(pages) {
  const counts = {};

  pages.forEach(function (page) {
    (page.ctas || []).forEach(function (cta) {
      const key = (cta.text || "").toLowerCase();
      if (!key) {
        return;
      }
      counts[key] = (counts[key] || 0) + 1;
    });
  });

  return Object.keys(counts)
    .sort(function (a, b) { return counts[b] - counts[a]; })
    .slice(0, 6)
    .map(function (k) {
      return counts[k] > 1 ? k : k;
    });
}
