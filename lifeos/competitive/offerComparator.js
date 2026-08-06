/**
 * Offer Comparator — compare value propositions across market vs our landing.
 */

/**
 * @param {object} ourProfile
 * @param {object[]} parsedPages
 * @returns {object}
 */
export function compareOffers(ourProfile, parsedPages) {
  const ourOffer = extractOurOffer(ourProfile);
  const competitorOffers = (parsedPages || []).map(extractCompetitorOffer).filter(Boolean);
  const themes = clusterThemes(competitorOffers);
  const differentiation = findDifferentiation(ourOffer, competitorOffers, themes);

  return {
    ours: ourOffer,
    competitors: competitorOffers,
    themes: themes,
    differentiation: differentiation,
    alignment_score: computeAlignmentScore(ourOffer, themes),
    compared_at: Date.now()
  };
}

/**
 * @param {object} profile
 * @returns {object}
 */
function extractOurOffer(profile) {
  const headline = String(profile?.headline_hint || "").trim();
  const keywords = tokenize(headline);

  return {
    source: "our_landing",
    headline: headline || "Unknown value proposition",
    keywords: keywords,
    themes: detectThemes(headline),
    word_count: headline ? headline.split(/\s+/).length : 0
  };
}

/**
 * @param {object} page
 * @returns {object|null}
 */
function extractCompetitorOffer(page) {
  const headlines = page.headlines || [];
  const h1 = headlines.find(function (h) { return h.level === "h1"; });
  const primary = h1 || headlines[0];
  if (!primary) {
    return null;
  }

  const text = primary.text || "";
  return {
    source: page.id || page.name,
    name: page.name || page.id,
    url: page.url || "",
    headline: text,
    keywords: tokenize(text),
    themes: detectThemes(text),
    word_count: primary.length || text.split(/\s+/).length
  };
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(function (w) { return w.length > 3; })
    .slice(0, 12);
}

const THEME_LEXICON = {
  revenue: [/revenue|profit|earn|income|roi|money|sales/i],
  speed: [/fast|quick|instant|minutes|hours|automate/i],
  trust: [/trusted|proven|guarantee|certified|secure/i],
  simplicity: [/easy|simple|no code|one click|step/i],
  scale: [/scale|grow|expand|marketplace|wb|wildberries/i],
  analytics: [/analytics|data|insight|metric|dashboard/i]
};

/**
 * @param {string} text
 * @returns {string[]}
 */
function detectThemes(text) {
  const themes = [];
  Object.keys(THEME_LEXICON).forEach(function (theme) {
    if (THEME_LEXICON[theme].some(function (re) { return re.test(text); })) {
      themes.push(theme);
    }
  });
  return themes;
}

/**
 * @param {object[]} offers
 * @returns {object[]}
 */
function clusterThemes(offers) {
  const counts = {};

  offers.forEach(function (offer) {
    (offer.themes || []).forEach(function (theme) {
      counts[theme] = (counts[theme] || 0) + 1;
    });
  });

  const total = offers.length || 1;

  return Object.keys(counts)
    .map(function (theme) {
      return {
        theme: theme,
        count: counts[theme],
        share: Math.round((counts[theme] / total) * 100) / 100
      };
    })
    .sort(function (a, b) { return b.count - a.count; });
}

/**
 * @param {object} ourOffer
 * @param {object[]} competitorOffers
 * @param {object[]} themes
 * @returns {object}
 */
function findDifferentiation(ourOffer, competitorOffers, themes) {
  const ourThemes = new Set(ourOffer.themes || []);
  const dominant = themes.slice(0, 3).map(function (t) { return t.theme; });
  const missingDominant = dominant.filter(function (t) { return !ourThemes.has(t); });
  const uniqueOurs = (ourOffer.themes || []).filter(function (t) {
    return !competitorOffers.some(function (c) {
      return (c.themes || []).indexOf(t) !== -1;
    });
  });

  const competitorHeadlines = competitorOffers.map(function (c) { return c.headline; });
  const overlap = keywordOverlap(ourOffer.keywords, competitorHeadlines);

  return {
    dominant_market_themes: dominant,
    missing_dominant_themes: missingDominant,
    unique_our_themes: uniqueOurs,
    headline_keyword_overlap: overlap,
    recommendation:
      missingDominant.length > 0
        ? "Consider emphasizing market-dominant themes: " + missingDominant.join(", ")
        : uniqueOurs.length > 0
          ? "Leverage unique positioning themes: " + uniqueOurs.join(", ")
          : "Value proposition aligns with market — optimize clarity and CTA pairing"
  };
}

/**
 * @param {string[]} ourKeywords
 * @param {string[]} headlines
 * @returns {number}
 */
function keywordOverlap(ourKeywords, headlines) {
  if (!ourKeywords.length || !headlines.length) {
    return 0;
  }
  const pool = headlines.join(" ").toLowerCase();
  let hits = 0;
  ourKeywords.forEach(function (kw) {
    if (pool.indexOf(kw) !== -1) {
      hits += 1;
    }
  });
  return Math.round((hits / ourKeywords.length) * 100) / 100;
}

/**
 * @param {object} ourOffer
 * @param {object[]} themes
 * @returns {number}
 */
function computeAlignmentScore(ourOffer, themes) {
  if (!themes.length) {
    return 50;
  }
  const ourThemes = new Set(ourOffer.themes || []);
  let aligned = 0;
  themes.slice(0, 5).forEach(function (t) {
    if (ourThemes.has(t.theme)) {
      aligned += t.share || 0.2;
    }
  });
  return Math.max(0, Math.min(100, Math.round(aligned * 100)));
}
