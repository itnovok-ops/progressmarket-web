/**
 * Gap Analyzer — compare competitor patterns vs our landing profile (read-only globals).
 */

const CANONICAL_FLOW = ["hero", "video", "problem", "insight", "cta", "footer"];

/**
 * Build our landing profile from observer / stats globals — no live DOM access.
 * @param {object} [sources]
 * @returns {object}
 */
export function buildOurProfile(sources) {
  const observer = sources?.observer || window.__LIFEOS_OBSERVER_REPORT__ || {};
  const menu = observer.menu_structure || {};
  const uiScan = observer.ui_scan || {};
  const landing = sources?.landing_stats || window.__LIFEOS_LANDING_STATS__ || {};

  const sections = (uiScan.sections || menu.sections || []).map(function (s) {
    return {
      key: s.key || s.section,
      present: s.present !== false,
      label: s.label || s.key
    };
  });

  const presentKeys = sections.filter(function (s) { return s.present; }).map(function (s) { return s.key; });

  return {
    sections: sections,
    present_keys: presentKeys,
    chaotic: menu.chaotic === true,
    missing: menu.missing || [],
    deviations: menu.deviations || [],
    ui_issues: (uiScan.issues || []).slice(0, 10),
    video_engagement: landing.video_engagement_rate,
    ctr: landing.ctr,
    conversion_rate: landing.conversion_rate,
    headline_hint: observer.hero_headline || landing.hero_headline || "",
    trust_hint: Boolean(menu.has_trust || landing.has_trust),
    sticky_cta_hint: Boolean(landing.sticky_cta || menu.sticky_cta),
    built_at: Date.now()
  };
}

/**
 * @param {object} ourProfile
 * @param {object} patterns
 * @returns {object[]}
 */
export function analyzeGaps(ourProfile, patterns) {
  const gaps = [];
  const rates = patterns?.rates || {};
  const our = ourProfile || buildOurProfile();
  const present = new Set(our.present_keys || []);

  CANONICAL_FLOW.forEach(function (key) {
    const marketFreq = (patterns.section_frequency || []).find(function (s) { return s.key === key; });
    const freq = marketFreq?.frequency ?? 0.5;

    if (!present.has(key) && freq >= 0.55) {
      gaps.push({
        id: "gap-missing-" + key,
        type: "structure",
        element: key,
        severity: key === "cta" || key === "hero" ? "high" : "medium",
        message: "Market frequently includes '" + key + "' section (" + pct(freq) + ") — missing on our landing",
        market_frequency: freq,
        our_status: "missing"
      });
    }
  });

  if (rates.video_present >= 0.6 && !present.has("video")) {
    gaps.push({
      id: "gap-no-video",
      type: "media",
      element: "video",
      severity: "high",
      message: pct(rates.video_present) + " of market pages use video — our landing lacks video section",
      market_rate: rates.video_present,
      our_status: "missing"
    });
  }

  if (rates.trust_present >= 0.55 && !our.trust_hint) {
    gaps.push({
      id: "gap-no-trust",
      type: "trust",
      element: "trust",
      severity: "medium",
      message: "Competitors show trust elements in " + pct(rates.trust_present) + " of pages — weak or absent on ours",
      market_rate: rates.trust_present,
      our_status: "weak"
    });
  }

  if (rates.sticky_cta >= 0.4 && !our.sticky_cta_hint) {
    gaps.push({
      id: "gap-no-sticky-cta",
      type: "cta",
      element: "sticky_cta",
      severity: "medium",
      message: "Market uses sticky CTAs in " + pct(rates.sticky_cta) + " of pages",
      market_rate: rates.sticky_cta,
      our_status: "missing"
    });
  }

  if (our.chaotic && rates.canonical_flow >= 0.5) {
    gaps.push({
      id: "gap-chaotic-flow",
      type: "structure",
      element: "flow",
      severity: "high",
      message: "Our section order is chaotic while " + pct(rates.canonical_flow) + " of market follows canonical funnel flow",
      market_rate: rates.canonical_flow,
      our_status: "chaotic",
      deviations: our.deviations || []
    });
  }

  if (typeof our.ctr === "number" && our.ctr < 0.02 && rates.primary_cta_early >= 0.5) {
    gaps.push({
      id: "gap-low-ctr-vs-market",
      type: "conversion",
      element: "cta",
      severity: "high",
      message: "CTR below 2% while market emphasizes early primary CTAs",
      market_rate: rates.primary_cta_early,
      our_status: "underperforming",
      our_ctr: our.ctr
    });
  }

  (our.ui_issues || []).forEach(function (issue, index) {
    if (issue.severity !== "high") {
      return;
    }
    gaps.push({
      id: "gap-ui-issue-" + index,
      type: "ui",
      element: issue.section || issue.element_id || "unknown",
      severity: "high",
      message: issue.message || "High-severity UI issue on our landing",
      our_status: "issue",
      evidence: issue
    });
  });

  return gaps.sort(function (a, b) {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] || 9) - (order[b.severity] || 9);
  });
}

/**
 * @param {number} value
 * @returns {string}
 */
function pct(value) {
  return Math.round((value || 0) * 100) + "%";
}

/**
 * @param {object} ourProfile
 * @param {object} patterns
 * @returns {number}
 */
export function computeMarketScore(ourProfile, patterns) {
  const gaps = analyzeGaps(ourProfile, patterns);
  const high = gaps.filter(function (g) { return g.severity === "high"; }).length;
  const medium = gaps.filter(function (g) { return g.severity === "medium"; }).length;

  let score = 100 - high * 12 - medium * 6;
  const present = new Set((ourProfile?.present_keys || []));
  const sectionCoverage = CANONICAL_FLOW.filter(function (k) { return present.has(k); }).length;
  score += sectionCoverage * 2;

  if (ourProfile?.chaotic) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
