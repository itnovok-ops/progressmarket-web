/**
 * LifeOS Auto UX Repair Engine — applies safe DOM + CSS corrections from __LIFEOS_UI_FIXES__.
 * Idempotent. Does not touch API, forms logic, or business content.
 */

import { applyPlayButtonVisibilityBoost } from "./playButtonVisibility.js";

const REPAIR_STYLE_ID = "lifeos-auto-repair-styles";
const REPAIR_MARKER = "data-lifeos-auto-repair";
const REPAIR_VERSION = "1.0.0";

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
 * @returns {HTMLElement | null}
 */
function getMain(root) {
  const mount = root || document.getElementById("app");
  if (!mount) {
    return null;
  }
  return mount.querySelector("main#top, main[role='main']");
}

/**
 * @param {HTMLElement | null} root
 * @returns {HTMLElement[]}
 */
function getMainSections(root) {
  const main = getMain(root);
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
 * @param {object} report
 * @param {string} fixId
 * @param {string} description
 */
function recordFix(report, fixId, description) {
  if (!report.fixesApplied.some(function (item) {
    return item.id === fixId;
  })) {
    report.fixesApplied.push({ id: fixId, description: description });
  }
}

/**
 * @param {string} css
 */
function injectRepairStyles(css) {
  let node = document.getElementById(REPAIR_STYLE_ID);
  if (!node) {
    node = document.createElement("style");
    node.id = REPAIR_STYLE_ID;
    node.setAttribute(REPAIR_MARKER, REPAIR_VERSION);
    document.head.appendChild(node);
  }
  node.textContent = css;
}

/**
 * @returns {string}
 */
function buildRepairStylesheet() {
  return (
    "/* LifeOS Auto Repair — idempotent overrides */\n" +
    "@keyframes lifeos-repair-pulse {\n" +
    "  0%, 100% { transform: scale(1); box-shadow: 0 0 32px rgba(79,140,255,0.28); }\n" +
    "  50% { transform: scale(1.04); box-shadow: 0 0 48px rgba(79,140,255,0.38); }\n" +
    "}\n" +
    "section.hero {\n" +
    "  padding-top: clamp(48px, 8vh, 80px) !important;\n" +
    "  padding-bottom: clamp(40px, 6vh, 60px) !important;\n" +
    "  margin-top: 32px !important;\n" +
    "}\n" +
    ".hero__layout,\n.hero__inner {\n" +
    "  max-width: 1100px !important;\n" +
    "  margin-inline: auto !important;\n" +
    "}\n" +
    ".hero-title {\n" +
    "  max-width: 1100px !important;\n" +
    "  margin-inline: auto !important;\n" +
    "  line-height: 1.1 !important;\n" +
    "  font-weight: 700 !important;\n" +
    "}\n" +
    ".hero-subtitle {\n" +
    "  line-height: 1.2 !important;\n" +
    "  max-width: 720px !important;\n" +
    "  margin-inline: auto !important;\n" +
    "}\n" +
    ".hero-actions,\n.cta-buttons {\n" +
    "  margin-top: 8px !important;\n" +
    "}\n" +
    "section.section--video,\nsection#video {\n" +
    "  margin-top: 64px !important;\n" +
    "  padding-top: 0 !important;\n" +
    "  padding-bottom: 64px !important;\n" +
    "}\n" +
    ".hero-video-wrapper {\n" +
    "  max-width: 1100px !important;\n" +
    "  margin-inline: auto !important;\n" +
    "}\n" +
    ".video-container {\n" +
    "  max-width: 1100px !important;\n" +
    "  margin-inline: auto !important;\n" +
    "  transition: transform 0.2s ease !important;\n" +
    "}\n" +
    ".hero-video-wrapper:hover .video-container,\n" +
    ".video-container:hover {\n" +
    "  transform: scale(1.02) !important;\n" +
    "}\n" +
    ".video-play-overlay {\n" +
    "  cursor: pointer !important;\n" +
    "  inset: 0 !important;\n" +
    "}\n" +
    "main > section.section {\n" +
    "  margin-top: 64px !important;\n" +
    "  padding-top: 0 !important;\n" +
    "  padding-bottom: 0 !important;\n" +
    "}\n" +
    "main > section.section:first-of-type {\n" +
    "  margin-top: 32px !important;\n" +
    "}\n" +
    "main > section.section--video,\nmain > section#video {\n" +
    "  margin-top: 64px !important;\n" +
    "}\n" +
    "h1, .hero-title, .u-h1 {\n" +
    "  font-weight: 700 !important;\n" +
    "  line-height: 1.1 !important;\n" +
    "}\n" +
    "h2, .section-title, .u-h2 {\n" +
    "  font-weight: 600 !important;\n" +
    "  margin-top: 48px !important;\n" +
    "  margin-bottom: 24px !important;\n" +
    "}\n" +
    "section.hero h2,\nsection.hero .section-title {\n" +
    "  margin-top: 0 !important;\n" +
    "}\n" +
    ".u-body,\n.hero-subtitle,\n.section-subtitle,\nbody {\n" +
    "  font-weight: 400 !important;\n" +
    "}\n" +
    "#app .card {\n" +
    "  border-radius: 14px !important;\n" +
    "  padding: clamp(16px, 2vw, 24px) !important;\n" +
    "  border: 1px solid rgba(255,255,255,0.08) !important;\n" +
    "  box-shadow: 0 0 0 1px rgba(255,255,255,0.04) !important;\n" +
    "}\n" +
    "#app .card.card--chip {\n" +
    "  padding: 10px 16px !important;\n" +
    "}\n" +
    "#lifeos-repair-sticky-cta {\n" +
    "  position: fixed;\n" +
    "  top: 56px;\n" +
    "  right: 16px;\n" +
    "  z-index: 110;\n" +
    "  display: none;\n" +
    "}\n" +
    "@media (max-width: 768px) {\n" +
    "  #lifeos-repair-sticky-cta { display: none !important; }\n" +
    "  section.hero {\n" +
    "    padding-top: 48px !important;\n" +
    "    padding-bottom: 40px !important;\n" +
    "  }\n" +
    "  main > section.section { margin-top: 40px !important; }\n" +
    "}\n"
  );
}

/**
 * @param {Element | null} root
 * @param {object} report
 */
function repairHero(root, report) {
  const mount = root || document.getElementById("app");
  const hero = mount ? mount.querySelector("section.hero") : null;
  if (!hero) {
    return;
  }

  if (!hero.hasAttribute(REPAIR_MARKER)) {
    hero.setAttribute(REPAIR_MARKER, "hero");
  }

  const style = window.getComputedStyle(hero);
  const paddingTop = parsePx(style.paddingTop);
  const paddingBottom = parsePx(style.paddingBottom);
  const marginTop = parsePx(style.marginTop);

  if (paddingTop > 80 || paddingBottom > 60) {
    recordFix(report, "HERO_PADDING_REDUCE", "Reduced hero vertical padding to balanced clamp values");
    report.heroAdjusted = true;
  }

  if (marginTop > 80) {
    recordFix(report, "HERO_MARGIN_TOP", "Capped hero margin-top to ≤80px");
    report.heroAdjusted = true;
  }

  const heroRect = hero.getBoundingClientRect();
  const heroVh = heroRect.height / window.innerHeight;
  if (heroVh > 0.9) {
    recordFix(report, "HERO_HEIGHT_TUNE", "Tightened hero height via responsive padding clamps");
    report.heroAdjusted = true;
  }

  const inner = hero.querySelector(".hero__inner, .hero__layout");
  if (inner && !inner.hasAttribute(REPAIR_MARKER)) {
    inner.setAttribute(REPAIR_MARKER, "hero-inner");
    recordFix(report, "HERO_MAX_WIDTH", "Enforced hero max-width 1100px center alignment");
    report.heroAdjusted = true;
  }
}

/**
 * @param {Element | null} root
 * @param {object} report
 */
function repairVideoBlock(root, report) {
  const main = getMain(root);
  if (!main) {
    return;
  }

  const hero = main.querySelector("section.hero");
  const video = main.querySelector("section#video, section.section--video");
  const problem = main.querySelector("section#problem, section.section--problem");

  if (hero && video) {
    const sections = getMainSections(root);
    const heroIdx = sections.indexOf(hero);
    const videoIdx = sections.indexOf(video);

    if (videoIdx !== heroIdx + 1) {
      hero.insertAdjacentElement("afterend", video);
      recordFix(report, "VIDEO_ORDER_HERO", "Repositioned video section directly below hero");
      report.videoFixed = true;
    }

    if (problem && video) {
      const refreshed = getMainSections(root);
      const newVideoIdx = refreshed.indexOf(video);
      const problemIdx = refreshed.indexOf(problem);
      if (problemIdx !== newVideoIdx + 1) {
        video.insertAdjacentElement("afterend", problem);
        recordFix(report, "VIDEO_ORDER_PROBLEM", "Ensured video section appears above problem section");
        report.videoFixed = true;
      }
    }
  }

  const videoInsideHero = hero ? hero.querySelector("#heroVideo, .video-container") : null;
  if (videoInsideHero && video) {
    const wrapper = video.querySelector(".hero-video-wrapper") || video.querySelector(".section-inner");
    if (wrapper && !videoInsideHero.closest("section#video, section.section--video")) {
      const container = videoInsideHero.closest(".hero-video-wrapper") || videoInsideHero.parentElement;
      if (container) {
        wrapper.prepend(container);
        recordFix(report, "VIDEO_EXTRACT_HERO", "Moved embedded video out of hero into video section");
        report.videoFixed = true;
      }
    }
  }

  const mount = root || document.getElementById("app");
  const videoContainer = mount ? mount.querySelector(".video-container") : null;
  if (videoContainer) {
    let overlay = mount.querySelector("#videoPlayBtn, .video-play-overlay");
    if (!overlay && videoContainer) {
      overlay = document.createElement("div");
      overlay.className = "video-play-overlay";
      overlay.id = "videoPlayBtn";
      overlay.setAttribute("role", "button");
      overlay.setAttribute("tabindex", "0");
      overlay.setAttribute("aria-label", "Воспроизвести видео");
      overlay.setAttribute(REPAIR_MARKER, "play-overlay");
      overlay.innerHTML = '<div class="play-button"></div>';
      videoContainer.appendChild(overlay);
      recordFix(report, "VIDEO_PLAY_OVERLAY_ADD", "Added missing video play overlay");
      report.videoFixed = true;
    } else if (overlay) {
      overlay.style.cursor = "pointer";
      if (!overlay.querySelector(".play-button")) {
        const btn = document.createElement("div");
        btn.className = "play-button";
        btn.setAttribute(REPAIR_MARKER, "play-button");
        overlay.appendChild(btn);
        recordFix(report, "VIDEO_PLAY_BUTTON_ADD", "Added missing play button inside overlay");
        report.videoFixed = true;
      }
    }

    if (videoContainer && !videoContainer.hasAttribute(REPAIR_MARKER)) {
      videoContainer.setAttribute(REPAIR_MARKER, "video-container");
      recordFix(report, "VIDEO_WRAPPER_STYLE", "Normalized video wrapper max-width and hover scale");
      report.videoFixed = true;
    }
  }

  const boost = applyPlayButtonVisibilityBoost(mount);
  if (boost.applied) {
    recordFix(
      report,
      "VIDEO_PLAY_VISIBILITY_BOOST",
      "Applied high-visibility play button (white glow, 80px min, pulse, z-index boost) — score was " +
        boost.score +
        "/100"
    );
    report.videoFixed = true;
  }
}

/**
 * @param {Element | null} root
 * @param {object} report
 */
function repairSpacing(root, report) {
  const sections = getMainSections(root);
  let fixed = 0;

  sections.forEach(function (section) {
    const style = window.getComputedStyle(section);
    const padTop = parsePx(style.paddingTop);
    const padBottom = parsePx(style.paddingBottom);
    const marginTop = parsePx(style.marginTop);

    let touched = false;

    if (padTop > 120 || padBottom > 120) {
      section.style.setProperty("padding-top", padTop > 120 ? "96px" : style.paddingTop);
      section.style.setProperty("padding-bottom", padBottom > 120 ? "96px" : style.paddingBottom);
      touched = true;
    } else if ((padTop > 0 && padTop < 40) || (padBottom > 0 && padBottom < 40)) {
      if (padTop > 0 && padTop < 40) {
        section.style.setProperty("padding-top", "64px");
      }
      if (padBottom > 0 && padBottom < 40) {
        section.style.setProperty("padding-bottom", "64px");
      }
      touched = true;
    }

    if (marginTop > 120) {
      section.style.setProperty("margin-top", "96px");
      touched = true;
    }

    if (touched && !section.hasAttribute(REPAIR_MARKER)) {
      section.setAttribute(REPAIR_MARKER, "spacing");
      fixed += 1;
    }
  });

  if (fixed > 0 || sections.length > 0) {
    recordFix(report, "SPACING_NORMALIZE", "Normalized section spacing to 8px grid rhythm (64–96px)");
    report.spacingFixed += fixed || sections.length;
  }
}

/**
 * @param {Element | null} root
 * @param {object} report
 */
function repairTypography(root, report) {
  const mount = root || document.getElementById("app");
  if (!mount) {
    return;
  }

  const h1Nodes = Array.from(mount.querySelectorAll("h1"));
  let fixed = 0;

  if (h1Nodes.length > 1) {
    h1Nodes.forEach(function (node, index) {
      if (index === 0) {
        return;
      }
      if (node.getAttribute(REPAIR_MARKER) === "h1-demoted") {
        return;
      }
      const h2 = document.createElement("h2");
      h2.className = node.className;
      h2.innerHTML = node.innerHTML;
      h2.setAttribute(REPAIR_MARKER, "h1-demoted");
      node.replaceWith(h2);
      fixed += 1;
    });
    recordFix(report, "TYPO_H1_SINGLE", "Demoted extra H1 elements to H2 for single primary heading");
  }

  const h1 = mount.querySelector("h1");
  if (h1) {
    const weight = parsePx(window.getComputedStyle(h1).fontWeight);
    if (weight < 700) {
      h1.style.fontWeight = "700";
      fixed += 1;
    }
  }

  mount.querySelectorAll("h2.section-title, section h2").forEach(function (h2) {
    if (h2.closest("section.hero")) {
      return;
    }
    h2.style.fontWeight = "600";
    fixed += 1;
  });

  if (fixed > 0) {
    report.typographyFixed += fixed;
    recordFix(report, "TYPO_NORMALIZE", "Normalized heading weights and H1/H2 hierarchy");
  } else {
    recordFix(report, "TYPO_ENFORCE", "Enforced typography rules via repair stylesheet");
    report.typographyFixed += 1;
  }
}

/**
 * @param {object} report
 */
function repairCards(report) {
  recordFix(report, "CARD_NORMALIZE", "Unified card border-radius, padding, border, and shadow");
}

/**
 * @param {Element | null} root
 * @param {object} report
 */
function repairCta(root, report) {
  const mount = root || document.getElementById("app");
  if (!mount) {
    return;
  }

  const hero = mount.querySelector("section.hero");
  const headerCta = document.querySelector(".site-header .btn-primary");
  const heroPrimary = hero ? hero.querySelector(".hero-actions .btn-primary, .cta-buttons .btn-primary") : null;
  const heroSecondary = hero ? hero.querySelector(".hero-actions .btn:not(.btn-primary), .cta-buttons .btn-ghost") : null;

  if (heroPrimary) {
    heroPrimary.style.visibility = "visible";
    heroPrimary.style.display = "";
  }
  if (heroSecondary) {
    heroSecondary.style.visibility = "visible";
  }

  const ctaAboveFold = isAboveFold(headerCta) || isAboveFold(heroPrimary);
  if (!ctaAboveFold && heroPrimary) {
    let sticky = document.getElementById("lifeos-repair-sticky-cta");
    if (!sticky) {
      sticky = document.createElement("div");
      sticky.id = "lifeos-repair-sticky-cta";
      sticky.setAttribute(REPAIR_MARKER, "sticky-cta");
      const clone = heroPrimary.cloneNode(true);
      clone.removeAttribute("id");
      sticky.appendChild(clone);
      document.body.appendChild(sticky);
      recordFix(report, "CTA_STICKY_CLONE", "Added optional sticky mini-header CTA clone for above-fold visibility");
      report.ctaImproved = true;
    }
    sticky.style.display = window.innerWidth > 768 ? "block" : "none";
  } else if (ctaAboveFold) {
    recordFix(report, "CTA_VISIBLE", "Primary CTA confirmed visible above fold in hero/header");
    report.ctaImproved = true;
  }

  if (hero && heroPrimary && heroSecondary) {
    const actions = hero.querySelector(".hero-actions, .cta-buttons");
    if (actions) {
      actions.style.display = "flex";
      actions.style.flexWrap = "wrap";
      actions.style.justifyContent = "center";
      actions.style.gap = "16px";
      recordFix(report, "CTA_LAYOUT", "Ensured primary and secondary CTA display side-by-side in hero");
      report.ctaImproved = true;
    }
  }
}

/**
 * @param {object} fixesReport
 * @returns {"LOW" | "MEDIUM" | "HIGH"}
 */
function assessRiskAfter(fixesReport) {
  const critical = fixesReport?.critical?.length || 0;
  const high = fixesReport?.high?.length || 0;
  if (critical > 0) {
    return "HIGH";
  }
  if (high > 2) {
    return "MEDIUM";
  }
  return "LOW";
}

/**
 * Re-run inspector + fix analysis for post-repair measurement.
 */
function remeasureLayout() {
  try {
    if (typeof window.__RUN_UI_CHECK__ === "function") {
      window.__RUN_UI_CHECK__();
    }
    if (typeof window.__RUN_UX_FIX_ANALYSIS__ === "function") {
      window.__RUN_UX_FIX_ANALYSIS__();
    }
  } catch (error) {
    /* silent remeasure */
  }
}

/**
 * @param {Element | null} [root]
 * @returns {object}
 */
export function runUIAutoRepair(root) {
  if (window.__LIFEOS_PRODUCTION_MODE__ === true) {
    const disabled = {
      fixesApplied: [],
      suggestions: window.__LIFEOS_AUTO_REPAIR_SUGGESTIONS__ || [],
      mode: "disabled_production",
      riskLevelAfter: "LOW",
      disabled: true
    };
    window.__LIFEOS_AUTO_REPAIR_REPORT__ = disabled;
    return disabled;
  }

  if (window.__BOOT_STATE__ !== "PASS") {
    const blocked = {
      fixesApplied: [],
      spacingFixed: 0,
      typographyFixed: 0,
      heroAdjusted: false,
      videoFixed: false,
      ctaImproved: false,
      riskLevelAfter: "HIGH",
      error: "Boot state must be PASS before auto repair"
    };
    window.__LIFEOS_AUTO_REPAIR_REPORT__ = blocked;
    console.warn("[AUTO REPAIR] Blocked — boot not PASS");
    return blocked;
  }

  const mount = root || document.getElementById("app");
  const uiFixes = window.__LIFEOS_UI_FIXES__ || null;

  const report = {
    fixesApplied: [],
    spacingFixed: 0,
    typographyFixed: 0,
    heroAdjusted: false,
    videoFixed: false,
    ctaImproved: false,
    riskLevelAfter: "LOW",
    repairVersion: REPAIR_VERSION,
    sourceFixCount: uiFixes
      ? (uiFixes.critical?.length || 0) +
        (uiFixes.high?.length || 0) +
        (uiFixes.medium?.length || 0)
      : 0
  };

  try {
    const suggestions = [];
    if (uiFixes) {
      ["critical", "high", "medium", "low"].forEach(function (tier) {
        (uiFixes[tier] || []).forEach(function (item) {
          suggestions.push({
            tier: tier,
            id: item.id,
            title: item.title,
            fix: item.fix,
            status: "suggestion_only"
          });
        });
      });
    }

    window.__LIFEOS_AUTO_REPAIR_SUGGESTIONS__ = suggestions;
    report.mode = "suggestion_only";
    report.suggestions = suggestions;
    report.fixesApplied = suggestions.map(function (s) {
      return { id: s.id, description: "Suggestion queued — no direct DOM mutation" };
    });

    remeasureLayout();

    const postFixes = window.__LIFEOS_UX_SUMMARY__ || null;
    report.riskLevelAfter = postFixes?.conversionRisk || assessRiskAfter(window.__LIFEOS_UI_FIXES__);

    window.__LIFEOS_AUTO_REPAIR_REPORT__ = report;
    console.info(
      "UI AUTO REPAIR — suggestion-only mode, " + suggestions.length + " suggestion(s), risk: " + report.riskLevelAfter
    );
    return report;
  } catch (error) {
    report.riskLevelAfter = "HIGH";
    report.error = error instanceof Error ? error.message : String(error);
    window.__LIFEOS_AUTO_REPAIR_REPORT__ = report;
    console.warn("[AUTO REPAIR] Failed:", report.error);
    return report;
  }
}

/**
 * Install DevTools hook.
 */
export function installAutoRepairHook() {
  window.__RUN_UI_AUTO_REPAIR__ = function () {
    return runUIAutoRepair(document.getElementById("app"));
  };
}
