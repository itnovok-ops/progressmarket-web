/**
 * UX Fix Intelligence Layer — converts UI Inspector output into actionable dev guidance.
 * Analysis only. Does not modify the DOM.
 */

const SCORE_IMPACT = {
  heroBroken: 30,
  videoBroken: 20,
  ctaHidden: 25,
  spacingCritical: 20,
  spacingWarn: 10,
  typography: 10
};

const HERO_VH_MIN = 0.7;
const HERO_VH_MAX = 0.9;
const SECTION_GAP_IDEAL_MIN = 64;
const SECTION_GAP_IDEAL_MAX = 96;
const SECTION_GAP_WARN = 120;
const SECTION_GAP_CRITICAL = 180;
const CARD_RADIUS_MIN = 12;
const CARD_RADIUS_MAX = 16;
const CARD_PADDING_MIN = 16;
const CARD_PADDING_MAX = 24;

/**
 * @param {string} id
 * @param {string} title
 * @param {string} rootCause
 * @param {string} fix
 * @param {string} [codeHint]
 * @param {string} [priority]
 * @returns {object}
 */
function fixItem(id, title, rootCause, fix, codeHint, priority) {
  return {
    id: id,
    title: title,
    rootCause: rootCause,
    fix: fix,
    codeHint: codeHint || "",
    priority: priority || "medium"
  };
}

/**
 * @param {string} issue
 * @param {string} whyItMatters
 * @param {string} fix
 * @param {string} [codeHint]
 * @returns {object}
 */
function recommendation(issue, whyItMatters, fix, codeHint) {
  return { issue: issue, whyItMatters: whyItMatters, fix: fix, codeHint: codeHint || "" };
}

/**
 * @param {string} value
 * @returns {number}
 */
function parsePx(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {Element | null} root
 * @returns {HTMLElement[]}
 */
function getMainSections(root) {
  const main = (root || document).querySelector("main#top, main[role='main'], #app main");
  if (!main) {
    return [];
  }
  return Array.from(main.querySelectorAll(":scope > section"));
}

/**
 * @param {HTMLElement} el
 * @returns {boolean}
 */
function isVisible(el) {
  if (!el) {
    return false;
  }
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * @param {HTMLElement} el
 * @returns {boolean}
 */
function isAboveFold(el) {
  if (!isVisible(el)) {
    return false;
  }
  return el.getBoundingClientRect().top < window.innerHeight;
}

/**
 * @param {HTMLElement} section
 * @returns {string}
 */
function sectionKey(section) {
  if (section.classList.contains("hero")) {
    return "hero";
  }
  if (section.id === "video" || section.classList.contains("section--video")) {
    return "video";
  }
  return section.id || "unknown";
}

/**
 * @param {object} report
 * @param {Element | null} root
 * @returns {object}
 */
function analyzeDOMHeuristics(report, root) {
  const mount = root || document.getElementById("app");
  const findings = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    layoutFixes: [],
    spacingFixes: [],
    typographyFixes: [],
    conversionFixes: [],
    recommendations: [],
    scorePenalty: 0
  };

  if (!mount || window.__BOOT_STATE__ !== "PASS") {
    findings.critical.push(
      fixItem(
        "BOOT_BLOCKED",
        "UX analysis blocked — boot not PASS",
        "Inspector and fix engine require a fully mounted landing",
        "Resolve boot failures before running UX fix analysis",
        "window.__BOOT_STATE__ must be 'PASS'",
        "critical"
      )
    );
    findings.scorePenalty += 50;
    return findings;
  }

  const sections = getMainSections(mount);
  const hero = mount.querySelector("section.hero");
  const videoSection = mount.querySelector("section#video, section.section--video");
  const problemSection = mount.querySelector("section#problem, section.section--problem");
  const h1 = mount.querySelector("h1");
  const h2First = mount.querySelector("h2");
  const playOverlay = mount.querySelector("#videoPlayBtn, .video-play-overlay");
  const playButton = mount.querySelector(".play-button");
  const videoEl = mount.querySelector("#heroVideo, main video");

  /* ── Hero heuristics ── */
  if (!hero || !report?.metrics?.heroExists) {
    findings.critical.push(
      fixItem(
        "HERO_MISSING",
        "Hero section is missing or not mounted",
        "renderPage() may have dropped renderHeroSection() or hero markup was replaced",
        "Restore HeroSection in renderPage.js before Video; verify content.hero renders",
        "renderHeroSection(content.hero) in renderPage.js",
        "critical"
      )
    );
    findings.layoutFixes.push("Restore full Hero block above video section");
    findings.scorePenalty += SCORE_IMPACT.heroBroken;
    findings.recommendations.push(
      recommendation(
        "Hero section missing",
        "Without a hero, value proposition and primary CTA are lost — conversion drops sharply",
        "Re-mount HeroSection with label, H1, subtitle, stats, and CTA from content.js",
        "components/HeroSection.js + renderPage.js order"
      )
    );
  } else {
    const heroRect = hero.getBoundingClientRect();
    const heroVh = heroRect.height / window.innerHeight;
    if (heroVh < HERO_VH_MIN) {
      findings.high.push(
        fixItem(
          "HERO_HEIGHT_LOW",
          "Hero occupies less than 70vh (" + Math.round(heroVh * 100) + "%)",
          "Reduced vertical presence weakens first impression and pushes video/CTA too high",
          "Increase hero padding-top/bottom or content density in styles.css .hero",
          ".hero { padding-top: 80px; padding-bottom: 60px; } /* tune to reach 70–90vh */",
          "high"
        )
      );
      findings.layoutFixes.push("Increase hero vertical presence to 70–90vh");
      findings.scorePenalty += 8;
    } else if (heroVh > HERO_VH_MAX) {
      findings.medium.push(
        fixItem(
          "HERO_HEIGHT_HIGH",
          "Hero exceeds 90vh (" + Math.round(heroVh * 100) + "%)",
          "Oversized hero delays access to video and problem sections",
          "Reduce hero padding or tighten hero-stats / subtitle spacing",
          ".hero { padding-top/bottom } and .hero__layout { gap } in styles.css",
          "medium"
        )
      );
      findings.layoutFixes.push("Tighten hero height to ≤90vh");
      findings.scorePenalty += 5;
    }

    const heroH2 = hero.querySelector("h2, h3");
    if (heroH2 && h1) {
      findings.medium.push(
        fixItem(
          "HERO_COMPETING_HEADER",
          "Competing section header inside hero (" + heroH2.tagName + ")",
          "Multiple heading levels in hero dilute H1 dominance",
          "Keep only H1 + subtitle in hero; move secondary headings to sections below",
          "HeroSection.js — remove extra headings from hero__inner",
          "medium"
        )
      );
      findings.typographyFixes.push("Remove competing headers from hero block");
      findings.scorePenalty += SCORE_IMPACT.typography;
    }

    if (h1 && h2First) {
      const h1Size = parsePx(window.getComputedStyle(h1).fontSize);
      const h2Size = parsePx(window.getComputedStyle(h2First).fontSize);
      if (h2Size > 0 && h1Size / h2Size < 1.25) {
        findings.high.push(
          fixItem(
            "H1_NOT_DOMINANT",
            "H1 is not visually dominant over H2 (ratio " + (h1Size / h2Size).toFixed(2) + ")",
            "Weak typographic hierarchy reduces scan clarity",
            "Increase --text-h1 clamp max or reduce --text-h2 in ui-kit.css",
            "--text-h1: clamp(2.125rem, 5vw, 3.75rem); --text-h2: clamp(2rem, 3vw, 2.5rem);",
            "high"
          )
        );
        findings.typographyFixes.push("Strengthen H1 vs H2 size contrast (≥1.25×)");
        findings.scorePenalty += SCORE_IMPACT.typography;
      }
    }
  }

  /* ── CTA / conversion ── */
  const headerCta = document.querySelector(".site-header .btn-primary");
  const heroCta = hero ? hero.querySelector(".hero-actions .btn-primary, .cta-buttons .btn-primary") : null;
  const ctaAboveFold = isAboveFold(headerCta) || isAboveFold(heroCta);

  if (!ctaAboveFold) {
    findings.critical.push(
      fixItem(
        "CTA_NOT_ABOVE_FOLD",
        "Primary CTA is not visible without scrolling",
        "Users must scroll before seeing a conversion action — high bounce risk",
        "Ensure hero-actions or header CTA fits within viewport; reduce hero padding if needed",
        ".hero-actions .btn-primary { } + reduce .hero padding-top",
        "critical"
      )
    );
    findings.conversionFixes.push("Expose primary CTA above the fold in hero or header");
    findings.scorePenalty += SCORE_IMPACT.ctaHidden;
    findings.recommendations.push(
      recommendation(
        "CTA hidden below fold",
        "First-screen CTA is the highest-converting placement on SaaS landings",
        "Keep at least one .btn-primary in header or hero visible on load",
        "HeroSection.js renderButton(data.cta.primary) + SiteHeader headerCta"
      )
    );
  }

  /* ── Video heuristics ── */
  if (!videoSection || !report?.metrics?.videoExists) {
    findings.critical.push(
      fixItem(
        "VIDEO_SECTION_MISSING",
        "Video section is missing",
        "How-it-works video is a core trust asset for WB FBS landing",
        "Add renderVideoSection(content.hero) immediately after Hero in renderPage.js",
        "renderVideoSection(content.hero) after renderHeroSection",
        "critical"
      )
    );
    findings.layoutFixes.push("Insert VideoSection between Hero and Problem");
    findings.scorePenalty += SCORE_IMPACT.videoBroken;
  } else {
    const sectionKeys = sections.map(sectionKey);
    const heroIdx = hero ? sectionKeys.indexOf("hero") : -1;
    const videoIdx = sectionKeys.indexOf("video");
    const problemIdx = sectionKeys.indexOf("problem");

    if (heroIdx === -1 || videoIdx <= heroIdx) {
      findings.critical.push(
        fixItem(
          "VIDEO_BELOW_HERO",
          "Video is not positioned below Hero",
          "Incorrect narrative flow — users see video before value proposition",
          "Order: Hero → Video → Problem in renderPage.js",
          "renderHeroSection + renderVideoSection + renderProblemCarousel",
          "critical"
        )
      );
      findings.scorePenalty += SCORE_IMPACT.videoBroken;
    }
    if (problemIdx !== -1 && videoIdx !== -1 && videoIdx >= problemIdx) {
      findings.critical.push(
        fixItem(
          "VIDEO_ABOVE_PROBLEM",
          "Video must appear above Problem section",
          "Problem context should follow product demonstration",
          "Move VideoSection before Problem in renderPage.js",
          "renderVideoSection before renderProblemCarousel",
          "critical"
        )
      );
      findings.scorePenalty += SCORE_IMPACT.videoBroken;
    }

    if (!playButton || !isVisible(playButton)) {
      findings.high.push(
        fixItem(
          "VIDEO_PLAY_HIDDEN",
          "Video play button is missing or not visible",
          "Users cannot discover that video is interactive",
          "Ensure #videoPlayBtn + .play-button render in VideoSection.js",
          "VideoSection.js — .video-play-overlay > .play-button",
          "high"
        )
      );
      findings.scorePenalty += 12;
    }

    if (playOverlay) {
      const overlayStyle = window.getComputedStyle(playOverlay);
      const hasTransition =
        overlayStyle.transitionDuration !== "0s" || overlayStyle.transitionProperty !== "all";
      if (!hasTransition) {
        findings.low.push(
          fixItem(
            "VIDEO_OVERLAY_NO_HOVER",
            "Video overlay lacks hover transition feedback",
            "Subtle hover states increase perceived polish and click affordance",
            "Add transition on .video-play-overlay:hover in styles.css",
            ".video-play-overlay:hover { background: rgba(11,15,23,0.35); }",
            "low"
          )
        );
      }
    }

    if (videoEl) {
      const preload = videoEl.getAttribute("preload") || "auto";
      if (preload === "auto" && !videoEl.hasAttribute("loading")) {
        findings.medium.push(
          fixItem(
            "VIDEO_LAZY_LOAD",
            "Video uses preload=auto without lazy strategy",
            "Heavy autoplay video can hurt LCP and mobile performance",
            "Consider preload='metadata' + poster; defer unmute until interaction",
            "heroVideoPlayer.js + <video preload=\"metadata\" poster=\"...\">",
            "medium"
          )
        );
        findings.recommendations.push(
          recommendation(
            "Video eager preload",
            "Autoplay video competes with hero text for bandwidth on first paint",
            "Keep muted autoplay but use poster + metadata preload until user engages",
            "VideoSection.js video attributes"
          )
        );
      }
    }
  }

  /* ── Spacing heuristics ── */
  sections.forEach(function (section) {
    const key = sectionKey(section);
    const marginTop = parsePx(window.getComputedStyle(section).marginTop);

    if (marginTop > SECTION_GAP_CRITICAL) {
      findings.critical.push(
        fixItem(
          "SPACING_CRITICAL_" + key.toUpperCase(),
          "Section '" + key + "' margin-top is critical (" + Math.round(marginTop) + "px)",
          "Excessive whitespace breaks visual rhythm and feels like disconnected blocks",
          "Set --section-gap: 64px and .section { margin-top: var(--section-gap) } in ui-kit.css",
          ".section { margin-top: 64px; } /* max ideal 96px */",
          "critical"
        )
      );
      findings.spacingFixes.push("Reduce '" + key + "' margin-top from " + Math.round(marginTop) + "px to 64–96px");
      findings.scorePenalty += SCORE_IMPACT.spacingCritical;
    } else if (marginTop > SECTION_GAP_WARN) {
      findings.high.push(
        fixItem(
          "SPACING_WARN_" + key.toUpperCase(),
          "Section '" + key + "' margin-top exceeds 120px (" + Math.round(marginTop) + "px)",
          "Large gaps reduce content density and scroll engagement",
          "Align section gaps to --section-gap (64px) token",
          "styles.css .section { margin-top: var(--section-gap); }",
          "high"
        )
      );
      findings.spacingFixes.push("Tighten '" + key + "' section gap to ≤96px");
      findings.scorePenalty += SCORE_IMPACT.spacingWarn;
    } else if (marginTop > 0 && (marginTop < SECTION_GAP_IDEAL_MIN || marginTop > SECTION_GAP_IDEAL_MAX)) {
      findings.low.push(
        fixItem(
          "SPACING_DRIFT_" + key.toUpperCase(),
          "Section '" + key + "' gap outside ideal 64–96px (" + Math.round(marginTop) + "px)",
          "Minor rhythm inconsistency across sections",
          "Normalize --section-gap token usage across all sections",
          "--section-gap: 64px in ui-kit.css",
          "low"
        )
      );
    }
  });

  /* ── Typography from inspector ── */
  (report?.typographyIssues || []).forEach(function (item) {
    findings.typographyFixes.push(item.message);
    if (item.severity === "fail") {
      findings.high.push(
        fixItem(
          item.code,
          item.message,
          "Broken heading hierarchy hurts SEO and scan patterns",
          item.code === "H1_MULTIPLE"
            ? "Keep single H1 in HeroSection; demote duplicates to H2"
            : "Ensure one H1 in section.hero with id hero-title",
          "HeroSection.js — single <h1 id=\"hero-title\">",
          "high"
        )
      );
      findings.scorePenalty += SCORE_IMPACT.typography;
    } else {
      findings.medium.push(
        fixItem(item.code, item.message, "Typography drift from design system", "Align with ui-kit.css tokens", "", "medium")
      );
    }
  });

  /* ── Card system consistency ── */
  const cards = mount.querySelectorAll(".card");
  const radii = new Set();
  const paddings = new Set();
  const shadows = new Set();

  cards.forEach(function (card) {
    const style = window.getComputedStyle(card);
    radii.add(Math.round(parsePx(style.borderRadius)));
    paddings.add(Math.round(parsePx(style.paddingTop)));
    shadows.add(style.boxShadow);
  });

  if (radii.size > 1) {
    const radiusList = Array.from(radii).join(", ");
    findings.medium.push(
      fixItem(
        "CARD_RADIUS_MIXED",
        "Inconsistent card border-radius (" + radiusList + "px)",
        "Mixed radii break unified glass-card system",
        "Standardize --radius-lg (16px) on all .card components",
        ".card { border-radius: var(--radius-lg); } in ui-kit.css",
        "medium"
      )
    );
    const outOfRange = Array.from(radii).some(function (r) {
      return r < CARD_RADIUS_MIN || r > CARD_RADIUS_MAX;
    });
    if (outOfRange) {
      findings.spacingFixes.push("Normalize card border-radius to 12–16px");
    }
  }

  if (paddings.size > 2) {
    findings.medium.push(
      fixItem(
        "CARD_PADDING_MIXED",
        "Inconsistent card padding values detected",
        "Uneven internal density makes grids feel unpolished",
        "Use --card-padding: 16px and .card--chip variant for compact items",
        "ui-kit.css --card-padding: 16px",
        "medium"
      )
    );
    const padList = Array.from(paddings);
    const outOfPad = padList.some(function (p) {
      return p < CARD_PADDING_MIN || p > CARD_PADDING_MAX;
    });
    if (outOfPad) {
      findings.spacingFixes.push("Align card padding to 16–24px range");
    }
  }

  if (shadows.size > 2) {
    findings.low.push(
      fixItem(
        "CARD_SHADOW_MIXED",
        "Multiple box-shadow styles on .card elements",
        "Shadow inconsistency reduces premium SaaS feel",
        "Use single --shadow-glow on .card in ui-kit.css",
        ".card { box-shadow: var(--shadow-glow); }",
        "low"
      )
    );
  }

  /* ── Map inspector issues into buckets ── */
  const inspectorBuckets = [
    { list: report?.missingBlocks, defaultPriority: "critical" },
    { list: report?.structureIssues, defaultPriority: "high" },
    { list: report?.spacingIssues, defaultPriority: "medium" },
    { list: report?.typographyIssues, defaultPriority: "medium" }
  ];

  inspectorBuckets.forEach(function (bucket) {
    (bucket.list || []).forEach(function (item) {
      const priority = item.severity === "fail" ? bucket.defaultPriority : "medium";
      const entry = fixItem(
        item.code,
        item.message,
        "Detected by UI Inspector (" + (item.category || "general") + ")",
        mapInspectorFix(item),
        mapInspectorCodeHint(item),
        priority
      );
      if (priority === "critical") {
        if (!findings.critical.some(function (f) {
          return f.id === entry.id;
        })) {
          findings.critical.push(entry);
        }
      } else if (priority === "high") {
        if (!findings.high.some(function (f) {
          return f.id === entry.id;
        })) {
          findings.high.push(entry);
        }
      } else if (!findings.medium.some(function (f) {
        return f.id === entry.id;
      })) {
        findings.medium.push(entry);
      }
    });
  });

  return findings;
}

/**
 * @param {{ code: string }} item
 * @returns {string}
 */
function mapInspectorFix(item) {
  const fixes = {
    MISSING_HERO: "Restore HeroSection in renderPage.js using content.hero",
    MISSING_VIDEO: "Add VideoSection after Hero in renderPage.js",
    MISSING_CTA: "Ensure renderCTASection(content.cta) is in renderPage.js",
    SECTION_ORDER: "Reorder sections: Hero → Video → Problem → Insight → Cases → FAQ → CTA",
    VIDEO_PLACEMENT: "Move video section directly below hero",
    HERO_VIDEO_EMBEDDED: "Extract video from HeroSection into VideoSection.js",
    CTA_VISIBILITY: "Place primary CTA in hero-actions or sticky header",
    CARD_MISSING_CLASS: "Add .card class to structured block components",
    SPACING_MARGIN_TOP: "Reduce section margin-top to 64px via --section-gap",
    SPACING_DENSITY: "Tighten vertical rhythm in styles.css section rules"
  };
  return fixes[item.code] || "Review DOM structure and align with landing design system";
}

/**
 * @param {{ code: string }} item
 * @returns {string}
 */
function mapInspectorCodeHint(item) {
  const hints = {
    MISSING_HERO: "renderPage.js — renderHeroSection(content.hero)",
    MISSING_VIDEO: "renderPage.js — renderVideoSection(content.hero)",
    SECTION_ORDER: "renderPage.js section concatenation order",
    SPACING_MARGIN_TOP: "styles.css .section { margin-top: var(--section-gap); }",
    CARD_MISSING_CLASS: "ui-kit.css .card + component classList"
  };
  return hints[item.code] || "";
}

/**
 * @param {object} findings
 * @param {number} baseScore
 * @returns {number}
 */
function computeAdjustedScore(findings, baseScore) {
  let score = typeof baseScore === "number" ? baseScore : 100;
  score -= findings.scorePenalty;
  if (score < 0) {
    score = 0;
  }
  if (score > 100) {
    score = 100;
  }
  return score;
}

/**
 * @param {object} fixes
 * @param {object} report
 * @returns {object}
 */
function buildUXSummary(fixes, report) {
  const all = fixes.critical.concat(fixes.high).concat(fixes.medium).concat(fixes.low);
  const top = all[0] || null;

  let conversionRisk = "LOW";
  const hasCtaIssue = fixes.conversionFixes.length > 0 || fixes.critical.some(function (f) {
    return f.id.indexOf("CTA") !== -1;
  });
  const hasHeroIssue = fixes.critical.some(function (f) {
    return f.id.indexOf("HERO") !== -1;
  });
  const hasVideoIssue = fixes.critical.some(function (f) {
    return f.id.indexOf("VIDEO") !== -1;
  });

  if (hasCtaIssue || hasHeroIssue) {
    conversionRisk = "HIGH";
  } else if (hasVideoIssue || fixes.high.length > 2) {
    conversionRisk = "MEDIUM";
  }

  let biggestUXLeak = "No major UX leaks detected";
  if (fixes.conversionFixes[0]) {
    biggestUXLeak = fixes.conversionFixes[0];
  } else if (fixes.layoutFixes[0]) {
    biggestUXLeak = fixes.layoutFixes[0];
  } else if (fixes.spacingFixes[0]) {
    biggestUXLeak = fixes.spacingFixes[0];
  } else if (top) {
    biggestUXLeak = top.title;
  }

  return {
    topProblem: top ? top.title : "None — landing UX structure looks healthy",
    conversionRisk: conversionRisk,
    biggestUXLeak: biggestUXLeak,
    inspectorStatus: report?.status || "UNKNOWN",
    inspectorScore: report?.score ?? null,
    fixScoreAdjusted: fixes.scoreAdjusted ?? null
  };
}

/**
 * @param {object} [options]
 * @param {object} [options.report]
 * @param {Element | null} [options.root]
 * @returns {object}
 */
export function generateUIFixReport(options) {
  const root = (options && options.root) || document.getElementById("app");
  const report = (options && options.report) || window.__LIFEOS_UI_REPORT__ || null;
  const baseScore = report?.score ?? 100;

  const findings = analyzeDOMHeuristics(report, root);
  const scoreAdjusted = computeAdjustedScore(findings, baseScore);

  const output = {
    critical: findings.critical,
    high: findings.high,
    medium: findings.medium,
    low: findings.low,
    layoutFixes: findings.layoutFixes,
    spacingFixes: findings.spacingFixes,
    typographyFixes: findings.typographyFixes,
    conversionFixes: findings.conversionFixes,
    recommendations: findings.recommendations,
    scoreAdjusted: scoreAdjusted
  };

  return output;
}

/**
 * Run UX Fix Intelligence Layer and publish globals.
 * @param {Element | null} [root]
 * @returns {{ fixes: object, summary: object }}
 */
export function runUXFixAnalysis(root) {
  try {
    const report = window.__LIFEOS_UI_REPORT__ || null;
    const fixes = generateUIFixReport({ report: report, root: root || document.getElementById("app") });
    const summary = buildUXSummary(fixes, report);

    window.__LIFEOS_UI_FIXES__ = fixes;
    window.__LIFEOS_UX_SUMMARY__ = summary;

    if (fixes.critical.length > 0) {
      console.warn(
        "%c[UX FIX ENGINE] " + fixes.critical.length + " critical issue(s)",
        "color:#ff6b6b;font-weight:bold;",
        fixes.critical.slice(0, 3).map(function (f) {
          return f.title;
        })
      );
    }

    console.info("UX FIX ANALYSIS READY");
    return { fixes: fixes, summary: summary };
  } catch (error) {
    const fallback = {
      critical: [
        fixItem(
          "UX_ENGINE_ERROR",
          error instanceof Error ? error.message : "UX fix analysis failed",
          "Unexpected error in uiFixEngine",
          "Check console stack trace",
          "",
          "critical"
        )
      ],
      high: [],
      medium: [],
      low: [],
      layoutFixes: [],
      spacingFixes: [],
      typographyFixes: [],
      conversionFixes: [],
      recommendations: [],
      scoreAdjusted: 0
    };
    window.__LIFEOS_UI_FIXES__ = fallback;
    window.__LIFEOS_UX_SUMMARY__ = {
      topProblem: "UX analysis failed",
      conversionRisk: "HIGH",
      biggestUXLeak: "Engine error"
    };
    console.info("UX FIX ANALYSIS READY");
    return { fixes: fallback, summary: window.__LIFEOS_UX_SUMMARY__ };
  }
}

/**
 * Install DevTools hook.
 */
export function installUXFixHook() {
  window.__RUN_UX_FIX_ANALYSIS__ = function () {
    return runUXFixAnalysis(document.getElementById("app"));
  };
}
