/**
 * UI Inspector Agent — read-only DOM structural UX/UI health scan.
 * Not analytics. Not tracking. Runs after boot PASS only.
 */

import { scorePlayButtonVisibility } from "./playButtonVisibility.js";

const SPACING_THRESHOLD_PX = 120;
const SECTION_GAP_TOLERANCE_PX = 48;

/** @type {readonly string[]} */
const EXPECTED_SECTION_KEYS = ["hero", "video", "problem", "insight", "cases", "faq", "cta"];

/** @type {readonly { selector: string, label: string }[]} */
const CARD_TARGETS = [
  { selector: ".problem-block", label: "Problem block" },
  { selector: ".slide-card", label: "Carousel slide" },
  { selector: ".insight-block", label: "Insight block" },
  { selector: ".insight-panel", label: "Insight panel" },
  { selector: ".case-card", label: "Case card" },
  { selector: ".faq-item", label: "FAQ item" },
  { selector: ".cta-form", label: "CTA form" }
];

/**
 * @param {string} code
 * @param {string} message
 * @param {"fail"|"warn"} severity
 * @param {string} [category]
 * @returns {{ code: string, message: string, severity: "fail"|"warn", category: string }}
 */
function issue(code, message, severity, category) {
  return {
    code: code,
    message: message,
    severity: severity,
    category: category || "general"
  };
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
 * @param {HTMLElement} section
 * @returns {string}
 */
function resolveSectionKey(section) {
  if (section.classList.contains("hero")) {
    return "hero";
  }
  if (section.id === "video" || section.classList.contains("section--video")) {
    return "video";
  }
  if (section.id) {
    return section.id;
  }
  if (section.classList.contains("section--problem")) {
    return "problem";
  }
  if (section.classList.contains("section--insight")) {
    return "insight";
  }
  if (section.classList.contains("section--cases")) {
    return "cases";
  }
  if (section.classList.contains("section--faq")) {
    return "faq";
  }
  if (section.classList.contains("section--cta")) {
    return "cta";
  }
  return "unknown";
}

/**
 * @param {string} value
 * @returns {number}
 */
function parseMarginPx(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
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
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}

/**
 * @param {HTMLElement | null} root
 * @returns {{ spacingIssues: object[], structureIssues: object[], typographyIssues: object[], missingBlocks: object[], metrics: object }}
 */
function collectInspectionData(root) {
  const mount = root || document.getElementById("app");
  const spacingIssues = [];
  const structureIssues = [];
  const typographyIssues = [];
  const missingBlocks = [];

  const sections = getMainSections(mount);
  const sectionKeys = sections.map(resolveSectionKey);

  const hero = mount ? mount.querySelector("section.hero") : null;
  const videoSection = mount ? mount.querySelector("section#video, section.section--video") : null;
  const ctaSection = mount ? mount.querySelector("section#cta, section.section--cta") : null;
  const h1Nodes = mount ? Array.from(mount.querySelectorAll("h1")) : [];

  const metrics = {
    sectionCount: sections.length,
    heroExists: !!hero,
    videoExists: !!videoSection,
    ctaExists: !!ctaSection,
    playButtonVisibility: scorePlayButtonVisibility(mount)
  };

  if (!hero) {
    missingBlocks.push(issue("MISSING_HERO", "Hero section (.hero.section) is missing from <main>", "fail", "structure"));
  }
  if (!videoSection) {
    missingBlocks.push(issue("MISSING_VIDEO", "Video section (#video) is missing from <main>", "fail", "structure"));
  }
  if (!ctaSection) {
    missingBlocks.push(issue("MISSING_CTA", "CTA section (#cta) is missing from <main>", "fail", "structure"));
  }

  EXPECTED_SECTION_KEYS.forEach(function (key) {
    if (sectionKeys.indexOf(key) === -1) {
      missingBlocks.push(
        issue("MISSING_SECTION_" + key.toUpperCase(), "Expected section not found: " + key, "fail", "structure")
      );
    }
  });

  const orderedKeys = sectionKeys.filter(function (key) {
    return EXPECTED_SECTION_KEYS.indexOf(key) !== -1;
  });
  const expectedOrder = EXPECTED_SECTION_KEYS.filter(function (key) {
    return orderedKeys.indexOf(key) !== -1;
  });
  if (orderedKeys.join("|") !== expectedOrder.join("|")) {
    structureIssues.push(
      issue(
        "SECTION_ORDER",
        "Section order mismatch. Expected: " + expectedOrder.join(" → ") + ". Found: " + orderedKeys.join(" → "),
        "fail",
        "structure"
      )
    );
  }

  if (hero && videoSection) {
    const heroIndex = sections.indexOf(hero);
    const videoIndex = sections.indexOf(videoSection);
    if (heroIndex === -1 || videoIndex === -1 || videoIndex <= heroIndex) {
      structureIssues.push(
        issue("VIDEO_PLACEMENT", "Video section must appear directly below Hero", "fail", "structure")
      );
    }
  }

  if (hero) {
    const heroVideoInside = hero.querySelector("#heroVideo, .video-container");
    if (heroVideoInside) {
      structureIssues.push(
        issue("HERO_VIDEO_EMBEDDED", "Video block must not be embedded inside Hero section", "fail", "structure")
      );
    }
    if (!hero.querySelector("#hero-title")) {
      structureIssues.push(issue("HERO_TITLE", "Hero is missing #hero-title heading", "fail", "structure"));
    }
    if (!hero.querySelector(".section-tag, .hero__tag")) {
      structureIssues.push(issue("HERO_TAG", "Hero is missing tagline (.section-tag)", "warn", "structure"));
    }
    if (!hero.querySelector(".hero-subtitle")) {
      structureIssues.push(issue("HERO_SUBTITLE", "Hero is missing subtitle (.hero-subtitle)", "warn", "structure"));
    }
    if (!hero.querySelector(".hero-stats")) {
      structureIssues.push(issue("HERO_STATS", "Hero is missing stats block (.hero-stats)", "warn", "structure"));
    }
    if (!hero.querySelector(".hero-actions, .cta-buttons")) {
      structureIssues.push(issue("HERO_CTA", "Hero is missing CTA actions (.hero-actions)", "warn", "structure"));
    }
  }

  const videos = mount ? mount.querySelectorAll("#heroVideo, main video") : [];
  if (videos.length === 0) {
    structureIssues.push(issue("VIDEO_ELEMENT", "No <video> element found on page", "fail", "structure"));
  } else if (videos.length > 1) {
    structureIssues.push(
      issue("VIDEO_DUPLICATE", "Multiple video elements found (" + videos.length + "), expected exactly one", "fail", "structure")
    );
  }

  const playButton = mount ? mount.querySelector("#videoPlayBtn, .play-button") : null;
  if (!playButton) {
    structureIssues.push(issue("VIDEO_PLAY_BUTTON", "Video play button (#videoPlayBtn / .play-button) is missing", "fail", "structure"));
  } else {
    const visibility = scorePlayButtonVisibility(mount);
    if (visibility.level === "LOW") {
      structureIssues.push(
        issue(
          "VIDEO_PLAY_VISIBILITY_LOW",
          "Play button visibility score is LOW (" + visibility.score + "/100): " + visibility.reasons.join("; "),
          "warn",
          "structure"
        )
      );
    }
  }

  if (h1Nodes.length === 0) {
    typographyIssues.push(issue("H1_MISSING", "Page must contain exactly one H1", "fail", "typography"));
  } else if (h1Nodes.length > 1) {
    typographyIssues.push(
      issue(
        "H1_MULTIPLE",
        "Multiple H1 elements detected (" + h1Nodes.length + "). Only one primary H1 is allowed",
        "fail",
        "typography"
      )
    );
  } else {
    const h1 = h1Nodes[0];
    if (!h1.closest("section.hero")) {
      typographyIssues.push(issue("H1_NOT_IN_HERO", "H1 is not inside Hero section", "warn", "typography"));
    }
    const h1Size = parseMarginPx(window.getComputedStyle(h1).fontSize);
    if (h1Size < 24) {
      typographyIssues.push(
        issue("H1_SIZE_SMALL", "H1 computed size is unusually small (" + h1Size + "px)", "warn", "typography")
      );
    }
    if (h1Size > 72) {
      typographyIssues.push(
        issue("H1_SIZE_LARGE", "H1 computed size is unusually large (" + h1Size + "px)", "warn", "typography")
      );
    }
  }

  const h2Nodes = mount ? mount.querySelectorAll("h2") : [];
  if (h2Nodes.length === 0) {
    typographyIssues.push(issue("H2_MISSING", "No H2 section headings found — hierarchy may be broken", "warn", "typography"));
  }

  const sectionMargins = [];
  sections.forEach(function (section, index) {
    const style = window.getComputedStyle(section);
    const marginTop = parseMarginPx(style.marginTop);
    const marginBottom = parseMarginPx(style.marginBottom);
    const key = resolveSectionKey(section);

    sectionMargins.push({ key: key, marginTop: marginTop, marginBottom: marginBottom });

    if (marginTop > SPACING_THRESHOLD_PX) {
      spacingIssues.push(
        issue(
          "SPACING_MARGIN_TOP",
          "Section '" + key + "' has excessive margin-top: " + Math.round(marginTop) + "px (max " + SPACING_THRESHOLD_PX + "px)",
          "warn",
          "spacing"
        )
      );
    }
    if (marginBottom > SPACING_THRESHOLD_PX) {
      spacingIssues.push(
        issue(
          "SPACING_MARGIN_BOTTOM",
          "Section '" + key + "' has excessive margin-bottom: " + Math.round(marginBottom) + "px",
          "warn",
          "spacing"
        )
      );
    }

    if (index > 0 && sectionMargins.length > 1) {
      const prev = sectionMargins[index - 1];
      const gapDelta = Math.abs(marginTop - prev.marginTop);
      if (gapDelta > SECTION_GAP_TOLERANCE_PX && marginTop > 0 && prev.marginTop > 0) {
        spacingIssues.push(
          issue(
            "SPACING_INCONSISTENT_GAP",
            "Inconsistent vertical gap between '" + prev.key + "' and '" + key + "' (" + Math.round(gapDelta) + "px delta)",
            "warn",
            "spacing"
          )
        );
      }
    }
  });

  if (sectionMargins.length >= 3) {
    const avgMargin =
      sectionMargins.reduce(function (sum, item) {
        return sum + item.marginTop;
      }, 0) / sectionMargins.length;
    if (avgMargin > 96) {
      spacingIssues.push(
        issue(
          "SPACING_DENSITY",
          "Average section margin-top is high (" + Math.round(avgMargin) + "px) — page may feel too sparse",
          "warn",
          "spacing"
        )
      );
    }
  }

  CARD_TARGETS.forEach(function (target) {
    const nodes = mount ? mount.querySelectorAll(target.selector) : [];
    nodes.forEach(function (node, index) {
      if (!node.classList.contains("card")) {
        structureIssues.push(
          issue(
            "CARD_MISSING_CLASS",
            target.label + " [" + (index + 1) + "] is missing .card class (" + target.selector + ")",
            "warn",
            "cards"
          )
        );
      }
    });
  });

  const structuredSections = mount
    ? mount.querySelectorAll("section.section:not(.hero):not(.section--video)")
    : [];
  structuredSections.forEach(function (section) {
    const key = resolveSectionKey(section);
    const hasHeader =
      section.querySelector(".section-header") ||
      section.querySelector(".section-title") ||
      section.querySelector("h2");
    const hasTag = section.querySelector(".section-tag");
    if (hasHeader && !hasTag && key !== "faq" && key !== "cta") {
      structureIssues.push(
        issue(
          "SECTION_TAG_MISSING",
          "Section '" + key + "' has a title but no .section-tag eyebrow",
          "warn",
          "structure"
        )
      );
    }
  });

  const headerCta = document.querySelector(".site-header .btn-primary, .site-header a.btn");
  const heroCta = hero ? hero.querySelector(".hero-actions .btn, .cta-buttons .btn") : null;
  const ctaVisibleAboveFold = isAboveFold(headerCta) || isAboveFold(heroCta);
  const ctaInFirstTwoSections =
    (headerCta && isVisible(headerCta)) ||
    (hero && hero.querySelector(".btn")) ||
    (sections[0] && sections[0].querySelector(".btn")) ||
    (sections[1] && sections[1].querySelector(".btn"));

  if (!ctaVisibleAboveFold && !ctaInFirstTwoSections) {
    structureIssues.push(
      issue(
        "CTA_VISIBILITY",
        "No primary CTA visible above the fold or within the first two sections",
        "warn",
        "structure"
      )
    );
  }

  return {
    spacingIssues: spacingIssues,
    structureIssues: structureIssues,
    typographyIssues: typographyIssues,
    missingBlocks: missingBlocks,
    metrics: metrics
  };
}

/**
 * @param {object[]} issues
 * @returns {number}
 */
function scoreIssues(issues) {
  let score = 100;
  issues.forEach(function (item) {
    if (item.severity === "fail") {
      score -= 18;
    } else {
      score -= 6;
    }
  });
  if (score < 0) {
    score = 0;
  }
  if (score > 100) {
    score = 100;
  }
  return score;
}

/**
 * @param {object} report
 */
function logInspectorAlerts(report) {
  const allIssues = report.spacingIssues
    .concat(report.structureIssues)
    .concat(report.typographyIssues)
    .concat(report.missingBlocks);

  const ranked = allIssues
    .slice()
    .sort(function (a, b) {
      if (a.severity === b.severity) {
        return 0;
      }
      return a.severity === "fail" ? -1 : 1;
    })
    .slice(0, 3);

  if (report.score < 50) {
    console.warn(
      "%c[UI INSPECTOR] FAIL — score " + report.score + "/100",
      "color:#ff6b6b;font-weight:bold;",
      "\nTop issues:",
      ranked.map(function (item) {
        return "• [" + item.severity.toUpperCase() + "] " + item.message;
      }),
      "\nSuggested fixes: tighten section margins (≤64px), restore Hero→Video order, ensure single H1 and unified .card usage."
    );
    return;
  }

  if (report.score < 70) {
    console.warn(
      "%c[UI INSPECTOR] WARNING — score " + report.score + "/100",
      "color:#ffb347;font-weight:bold;",
      "\nTop issues:",
      ranked.map(function (item) {
        return "• [" + item.severity.toUpperCase() + "] " + item.message;
      })
    );
  }
}

/**
 * @param {Element | null} [root]
 * @returns {object}
 */
export function generateUIReport(root) {
  if (window.__BOOT_STATE__ !== "PASS") {
    return {
      status: "FAIL",
      spacingIssues: [],
      structureIssues: [
        issue("BOOT_NOT_PASS", "UI Inspector requires window.__BOOT_STATE__ === 'PASS'", "fail", "boot")
      ],
      typographyIssues: [],
      missingBlocks: [],
      metrics: {
        sectionCount: 0,
        heroExists: false,
        videoExists: false,
        ctaExists: false
      },
      score: 0
    };
  }

  const data = collectInspectionData(root || document.getElementById("app"));
  const allIssues = data.spacingIssues
    .concat(data.structureIssues)
    .concat(data.typographyIssues)
    .concat(data.missingBlocks);

  const score = scoreIssues(allIssues);
  let status = "PASS";

  const hasCriticalFail = allIssues.some(function (item) {
    return item.severity === "fail";
  });

  if (score < 50 || data.missingBlocks.some(function (item) {
    return item.severity === "fail";
  })) {
    status = "FAIL";
  } else if (score < 70 || hasCriticalFail) {
    status = "WARN";
  }

  return {
    status: status,
    spacingIssues: data.spacingIssues,
    structureIssues: data.structureIssues,
    typographyIssues: data.typographyIssues,
    missingBlocks: data.missingBlocks,
    metrics: data.metrics,
    score: score
  };
}

/**
 * Run UI Inspector Agent and publish global report.
 * @param {Element | null} [root]
 * @returns {object}
 */
export function runUIInspectorAgent(root) {
  try {
    window.__LIFEOS_UI_INSPECTOR_READONLY__ = true;
    const report = generateUIReport(root);
    window.__LIFEOS_UI_REPORT__ = report;
    logInspectorAlerts(report);
    console.info("UI INSPECTOR REPORT READY");
    return report;
  } catch (error) {
    const fallback = {
      status: "FAIL",
      spacingIssues: [],
      structureIssues: [
        issue(
          "INSPECTOR_ERROR",
          error instanceof Error ? error.message : "UI Inspector failed",
          "fail",
          "agent"
        )
      ],
      typographyIssues: [],
      missingBlocks: [],
      metrics: {
        sectionCount: 0,
        heroExists: false,
        videoExists: false,
        ctaExists: false
      },
      score: 0
    };
    window.__LIFEOS_UI_REPORT__ = fallback;
    console.info("UI INSPECTOR REPORT READY");
    return fallback;
  }
}

/**
 * Manual DevTools trigger.
 * @returns {object}
 */
export function installUIInspectorHook() {
  window.__RUN_UI_CHECK__ = function () {
    return runUIInspectorAgent(document.getElementById("app"));
  };
}
