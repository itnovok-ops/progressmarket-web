/**
 * Market Parser — extract headlines, CTAs, structure, video, trust from HTML snapshots.
 * Uses detached DOMParser only — never touches landing DOM.
 */

const SECTION_HINTS = [
  { key: "hero", patterns: [/hero/i, /banner/i, /jumbotron/i, /above-the-fold/i] },
  { key: "video", patterns: [/video/i, /player/i, /watch/i] },
  { key: "problem", patterns: [/problem/i, /pain/i, /challenge/i] },
  { key: "insight", patterns: [/insight/i, /solution/i, /benefit/i, /feature/i] },
  { key: "cta", patterns: [/cta/i, /lead-form/i, /signup/i, /contact/i, /form/i] },
  { key: "footer", patterns: [/footer/i, /contentinfo/i] }
];

const TRUST_HINTS = [
  /testimonial/i,
  /review/i,
  /trust/i,
  /client/i,
  /partner/i,
  /logo/i,
  /guarantee/i,
  /certificate/i,
  /award/i
];

/**
 * @param {string} html
 * @returns {Document|null}
 */
function parseDetached(html) {
  try {
    if (!html || typeof DOMParser === "undefined") {
      return null;
    }
    const parser = new DOMParser();
    return parser.parseFromString(html, "text/html");
  } catch (_error) {
    return null;
  }
}

/**
 * @param {string} html
 * @param {object} [meta]
 * @returns {object}
 */
export function parseMarketPage(html, meta) {
  const doc = parseDetached(html);
  if (!doc) {
    return emptyParse(meta);
  }

  return {
    id: meta?.id || "unknown",
    name: meta?.name || "unknown",
    url: meta?.url || "",
    headlines: extractHeadlines(doc),
    ctas: extractCtas(doc),
    structure: extractStructure(doc),
    video: extractVideoPresence(doc),
    trust: extractTrustElements(doc),
    word_count: countWords(doc),
    parsed_at: Date.now()
  };
}

/**
 * @param {object} [meta]
 * @returns {object}
 */
function emptyParse(meta) {
  return {
    id: meta?.id || "unknown",
    name: meta?.name || "unknown",
    url: meta?.url || "",
    headlines: [],
    ctas: [],
    structure: [],
    video: { present: false, count: 0, has_autoplay: false, above_fold_hint: false },
    trust: { score: 0, testimonials: 0, logos: 0, stats: 0, guarantees: 0, elements: [] },
    word_count: 0,
    parse_error: true,
    parsed_at: Date.now()
  };
}

/**
 * @param {Document} doc
 * @returns {object[]}
 */
function extractHeadlines(doc) {
  const nodes = doc.querySelectorAll("h1, h2, h3");
  const headlines = [];

  nodes.forEach(function (node, index) {
    const text = (node.textContent || "").trim().replace(/\s+/g, " ");
    if (text.length < 3) {
      return;
    }
    headlines.push({
      level: node.tagName.toLowerCase(),
      text: text.slice(0, 240),
      position: index,
      length: text.length
    });
  });

  return headlines.slice(0, 20);
}

/**
 * @param {Document} doc
 * @returns {object[]}
 */
function extractCtas(doc) {
  const selectors = [
    "button",
    "a.btn",
    "a.button",
    "[class*='cta']",
    "input[type='submit']",
    "[role='button']"
  ];
  const seen = new Set();
  const ctas = [];

  selectors.forEach(function (selector) {
    doc.querySelectorAll(selector).forEach(function (node) {
      const text = (node.textContent || node.value || "").trim().replace(/\s+/g, " ");
      if (text.length < 2 || text.length > 80) {
        return;
      }
      const key = text.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);

      const classes = node.className ? String(node.className) : "";
      ctas.push({
        text: text,
        tag: node.tagName.toLowerCase(),
        sticky_hint: /sticky|fixed/i.test(classes),
        primary_hint: /primary|main|hot/i.test(classes)
      });
    });
  });

  return ctas.slice(0, 15);
}

/**
 * @param {Document} doc
 * @returns {object[]}
 */
function extractStructure(doc) {
  const sections = doc.querySelectorAll("section, main > div, header, footer, [data-track-section]");
  const structure = [];
  let order = 0;

  sections.forEach(function (node) {
    const id = node.id || "";
    const classes = node.className ? String(node.className) : "";
    const dataSection = node.getAttribute("data-track-section") || "";
    const hint = id + " " + classes + " " + dataSection;
    const key = resolveSectionKey(hint);
    if (!key) {
      return;
    }
    structure.push({
      key: key,
      order: order,
      present: true,
      label: key
    });
    order += 1;
  });

  if (!structure.length) {
    SECTION_HINTS.forEach(function (def, index) {
      const found = def.patterns.some(function (pattern) {
        return doc.body && pattern.test(doc.body.innerHTML.slice(0, 12000));
      });
      if (found) {
        structure.push({ key: def.key, order: index, present: true, label: def.key });
      }
    });
  }

  return structure;
}

/**
 * @param {string} hint
 * @returns {string|null}
 */
function resolveSectionKey(hint) {
  for (let i = 0; i < SECTION_HINTS.length; i++) {
    const def = SECTION_HINTS[i];
    if (def.patterns.some(function (p) { return p.test(hint); })) {
      return def.key;
    }
  }
  return null;
}

/**
 * @param {Document} doc
 * @returns {object}
 */
function extractVideoPresence(doc) {
  const videos = doc.querySelectorAll("video, iframe[src*='youtube'], iframe[src*='vimeo'], [class*='video']");
  let hasAutoplay = false;

  doc.querySelectorAll("video").forEach(function (node) {
    if (node.autoplay || node.hasAttribute("autoplay")) {
      hasAutoplay = true;
    }
  });

  const firstVideo = videos[0];
  const aboveFoldHint = Boolean(firstVideo && isEarlyInBody(firstVideo));

  return {
    present: videos.length > 0,
    count: videos.length,
    has_autoplay: hasAutoplay,
    above_fold_hint: aboveFoldHint
  };
}

/**
 * @param {Element} node
 * @returns {boolean}
 */
function isEarlyInBody(node) {
  try {
    const body = node.ownerDocument?.body;
    if (!body) {
      return false;
    }
    const html = body.innerHTML;
    const idx = html.indexOf(node.outerHTML.slice(0, 40));
    return idx >= 0 && idx < html.length * 0.35;
  } catch (_error) {
    return false;
  }
}

/**
 * @param {Document} doc
 * @returns {object}
 */
function extractTrustElements(doc) {
  const elements = [];
  let testimonials = 0;
  let logos = 0;
  let stats = 0;
  let guarantees = 0;

  doc.querySelectorAll("section, div, article, blockquote, ul").forEach(function (node) {
    const hint = (
      (node.id || "") +
      " " +
      (node.className || "") +
      " " +
      (node.getAttribute("data-track-section") || "")
    );

    if (!TRUST_HINTS.some(function (p) { return p.test(hint); })) {
      return;
    }

    const text = (node.textContent || "").trim();
    if (text.length < 8) {
      return;
    }

    let type = "trust_block";
    if (/testimonial|review|quote/i.test(hint)) {
      type = "testimonial";
      testimonials += 1;
    } else if (/logo|partner|client/i.test(hint)) {
      type = "logo_wall";
      logos += 1;
    } else if (/guarantee|warranty/i.test(hint)) {
      type = "guarantee";
      guarantees += 1;
    } else if (/\d+[%+]|years|clients|customers/i.test(text)) {
      type = "stat";
      stats += 1;
    }

    elements.push({ type: type, sample: text.slice(0, 120) });
  });

  const score = Math.min(100, testimonials * 20 + logos * 15 + stats * 10 + guarantees * 15);

  return {
    score: score,
    testimonials: testimonials,
    logos: logos,
    stats: stats,
    guarantees: guarantees,
    elements: elements.slice(0, 8)
  };
}

/**
 * @param {Document} doc
 * @returns {number}
 */
function countWords(doc) {
  const text = (doc.body?.textContent || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return 0;
  }
  return text.split(" ").length;
}
