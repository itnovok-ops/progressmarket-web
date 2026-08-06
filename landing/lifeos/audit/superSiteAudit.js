/**
 * SuperSite Landing — read-only system audit.
 * Produces window.__SUPER_SITE_REPORT__ (no UI mutations).
 */

import { runtimeDiagnostics } from "../boot/fullReport.js";

const EXPECTED_SECTIONS = [
  { id: "top", role: "main", label: "Hero (main)" },
  { id: "video", selector: "section#video", label: "Video" },
  { id: "problem", selector: "section#problem, [id*='problem']", label: "Problem" },
  { id: "insight", selector: "section#insight, [id*='insight']", label: "Insight" },
  { id: "cases", selector: "section#cases, [id*='cases']", label: "Cases" },
  { id: "faq", selector: "section#faq, [id*='faq']", label: "FAQ" },
  { id: "cta", selector: "section#cta", label: "CTA" }
];

const CANONICAL_ORDER = [
  "header",
  "hero",
  "video",
  "problem",
  "insight",
  "cases",
  "faq",
  "cta",
  "footer"
];

const BRIDGE_EVENTS = [
  "scroll_depth",
  "video_play",
  "video_click",
  "cta_click",
  "form_start",
  "form_submit",
  "exit_intent"
];

const SCORE_PENALTY = { high: 12, medium: 6, low: 2 };

/**
 * @param {string} severity
 * @param {string} code
 * @param {string} message
 * @returns {{ severity: string, code: string, message: string }}
 */
function issue(severity, code, message) {
  return { severity: severity, code: code, message: message };
}

/**
 * @returns {object}
 */
function auditUI() {
  const mount = document.getElementById("app");
  const issues = [];

  const sectionsPresent = {};
  EXPECTED_SECTIONS.forEach(function (def) {
    let node = null;
    if (def.id === "top") {
      node = mount ? mount.querySelector("main#top") : null;
    } else if (def.selector) {
      node = mount ? mount.querySelector(def.selector) : null;
    }
    sectionsPresent[def.label] = Boolean(node);
    if (!node) {
      issues.push(issue("high", "UI_SECTION_MISSING", def.label + " section not found in DOM"));
    }
  });

  const header = document.querySelector(".site-header, header");
  const footer = document.querySelector(".site-footer, footer");
  sectionsPresent.Header = Boolean(header);
  sectionsPresent.Footer = Boolean(footer);

  const video = mount ? mount.querySelector("#heroVideo") : null;
  const playBtn = mount ? mount.querySelector("#videoPlayBtn, .video-play-overlay") : null;
  const videoSection = mount ? mount.querySelector("section#video") : null;

  const videoBlock = {
    sectionPresent: Boolean(videoSection),
    videoElement: Boolean(video),
    playOverlay: Boolean(playBtn),
    autoplay: video ? video.hasAttribute("autoplay") : false,
    muted: video ? video.muted || video.hasAttribute("muted") : false,
    poster: video ? Boolean(video.getAttribute("poster")) : false,
    fallbackImage: Boolean(mount && mount.querySelector("#heroVideoFallback")),
    modalConflict: Boolean(document.getElementById("lifeos-video-modal"))
  };

  if (videoBlock.modalConflict) {
    issues.push(
      issue(
        "high",
        "UI_VIDEO_MODAL_CONFLICT",
        "conversionBoostEngine video modal coexists with inline heroVideoPlayer — click UX may conflict"
      )
    );
  }

  const ctaSection = mount ? mount.querySelector("section#cta") : null;
  const form = document.getElementById("lead-form");
  const formFields = form
    ? Array.from(form.querySelectorAll("input, textarea, select")).map(function (el) {
        return el.name || el.id || el.type;
      })
    : [];

  const ctaBlocks = {
    primarySection: Boolean(ctaSection),
    stickyCta: Boolean(document.querySelector(".sticky-cta")),
    softCta: Boolean(document.querySelector(".soft-cta")),
    exitCta: Boolean(document.querySelector(".exit-cta")),
    headerCta: Boolean(document.querySelector(".site-header .btn, header .btn-primary"))
  };

  const formBehavior = {
    formPresent: Boolean(form),
    hasLeadFormAttr: form ? form.hasAttribute("data-lead-form") : false,
    successPanel: Boolean(document.getElementById("lead-form-success")),
    statusElement: Boolean(document.getElementById("form-status")),
    honeypot: form ? Boolean(form.querySelector("[name='hp_trap']")) : false,
    consentRequired: form ? Boolean(form.querySelector("[name='consent'][required]")) : false,
    marketingConsentField: form ? Boolean(form.querySelector("[name='marketingConsent']")) : false,
    fields: formFields
  };

  if (!formBehavior.formPresent) {
    issues.push(issue("high", "UI_FORM_MISSING", "#lead-form not found after boot"));
  }

  const viewport = window.innerWidth || 0;
  const responsive = {
    viewportWidth: viewport,
    isMobile: viewport <= 768,
    isTablet: viewport > 768 && viewport <= 1200,
    isDesktop: viewport > 1200,
    stickyCtaVisible:
      viewport <= 768 ? Boolean(document.querySelector(".sticky-cta")) : null,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    touchDevice: window.matchMedia("(pointer: coarse)").matches
  };

  const systemContentDefined =
    Boolean(window.PAGE_CONTENT && window.PAGE_CONTENT.system && window.PAGE_CONTENT.system.steps);
  const systemSectionRendered = Boolean(mount && mount.querySelector("section#system, .system-flow"));
  if (systemContentDefined && !systemSectionRendered) {
    issues.push(
      issue(
        "medium",
        "UI_SYSTEM_ORPHANED",
        "content.system exists but SystemFlowSection is not rendered in renderPage.js"
      )
    );
  }

  const domOrder = [];
  if (header) {
    domOrder.push("header");
  }
  if (mount) {
    const main = mount.querySelector("main");
    if (main) {
      const children = main.querySelectorAll("section");
      children.forEach(function (section) {
        const id = section.id || section.className.split(" ")[0] || "unknown";
        domOrder.push(id);
      });
    }
  }
  if (footer) {
    domOrder.push("footer");
  }

  return {
    layout: {
      structure: "Header → main(sections) → Footer",
      canonicalOrder: CANONICAL_ORDER,
      domOrder: domOrder,
      mountReady: mount ? mount.classList.contains("ready") : false
    },
    sections: sectionsPresent,
    video: videoBlock,
    cta: ctaBlocks,
    form: formBehavior,
    responsive: responsive,
    _issues: issues
  };
}

/**
 * @returns {object}
 */
function auditConversion() {
  const issues = [];
  const events = window.__LIFEOS_EVENTS__ || [];

  const eventCounts = {};
  events.forEach(function (entry) {
    const name = entry && entry.event;
    if (!name) {
      return;
    }
    eventCounts[name] = (eventCounts[name] || 0) + 1;
  });

  const engineActive =
    window.__LIFEOS_BUILD_LOCK__ === true && runtimeDiagnostics.mountValidatedAppCalled === true;

  if (!engineActive) {
    issues.push(issue("high", "CONVERSION_ENGINE_INACTIVE", "conversionEngine did not mount with production lock"));
  }

  const bridgeMap = {
    scroll_intent_low: "scroll_depth",
    scroll_intent_mid: "scroll_depth",
    scroll_intent_high: "scroll_depth",
    cta_click: "cta_click",
    form_focus: "form_start",
    form_submit_attempt: "form_submit",
    form_submit_success: "form_submit",
    exit_intent: "exit_intent"
  };

  const notForwarded = ["form_abandon", "form_submit_fail"].filter(function (name) {
    return eventCounts[name] > 0;
  });

  const funnelFlow = {
    stages: ["visit", "scroll", "video", "cta", "form_start", "form_submit"],
    scrollDepthMarks: [0.25, 0.5, 0.75],
    scrollEventsFired: (eventCounts.scroll_intent_low || 0) +
      (eventCounts.scroll_intent_mid || 0) +
      (eventCounts.scroll_intent_high || 0),
    ctaClicks: eventCounts.cta_click || 0,
    formStarts: eventCounts.form_focus || 0,
    formSubmits: (eventCounts.form_submit_attempt || 0) + (eventCounts.form_submit_success || 0),
    exitIntent: Boolean(eventCounts.exit_intent)
  };

  const videoPlacement = {
    position: "Hero → Video (section #2 after hero copy)",
    beforeProblem: Boolean(document.querySelector("main section#video")),
    boostMetrics: window.__LIFEOS_CONVERSION__?.video || null,
    intentLevel: window.__LIFEOS_INTENT__?.level || null,
    heatmap: window.__LIFEOS_HEATMAP__ || null
  };

  const formFlow = {
    endpoint: window.PAGE_CONTENT?.leads?.endpoint || "/api/v1/leads",
    submitHandler: Boolean(document.getElementById("lead-form")),
    conversionTracking: Boolean(window.__LIFEOS_LEAD_STATE__),
    leadScore: window.__LIFEOS_LEAD_STATE__?.score ?? null,
    leadSegment: window.__LIFEOS_LEAD_STATE__?.segment ?? null
  };

  if (formFlow.marketingConsentField && !formFlow.marketingConsentInPayload) {
    /* checked in form audit */
  }

  const overlays = {
    stickyCta: Boolean(document.querySelector(".sticky-cta")),
    softCta: Boolean(document.querySelector(".soft-cta")),
    exitCta: Boolean(document.querySelector(".exit-cta")),
    autoActionRecovery: Boolean(document.querySelector("[data-lifeos-exit-recovery]"))
  };

  return {
    engineActive: engineActive,
    eventCounts: eventCounts,
    totalEvents: events.length,
    bridgeForwarding: bridgeMap,
    bridgeGaps: notForwarded,
    funnel: funnelFlow,
    videoPlacement: videoPlacement,
    formFlow: formFlow,
    overlays: overlays,
    conversionReport: window.__LIFEOS_CONVERSION_REPORT__ || null,
    _issues: issues
  };
}

/**
 * @returns {object}
 */
function auditIntegrations() {
  const issues = [];

  const session = window.__LIFEOS_SESSION__;
  const sessionCore = {
    active: Boolean(session),
    status: session?.status || "missing",
    mode: session?.status || "missing",
    source: session?.context?.source || null,
    conversionTracking: session?.flags?.isConversionTracking !== false,
    hasToken: Boolean(session?.token),
    hasApi: typeof window.__LIFEOS_SESSION_API__?.fetch === "function"
  };

  if (!sessionCore.active) {
    issues.push(issue("high", "INTEGRATION_SESSION_MISSING", "window.__LIFEOS_SESSION__ not initialized"));
  }

  const bridge = window.__LIFEOS_BRIDGE__;
  const bridgeActive = Boolean(bridge?.active && typeof window.__LIFEOS_SEND_EVENT === "function");
  const queueLength = (window.__LIFEOS_EVENT_QUEUE__ || []).length;

  const growthBridge = {
    active: bridgeActive,
    endpoint: bridge?.endpoint || "/lifeos/growth/api/events.php",
    sendEventAvailable: typeof window.__LIFEOS_SEND_EVENT === "function",
    queueLength: queueLength,
    supportedEvents: BRIDGE_EVENTS,
    flushAvailable: typeof bridge?.flush === "function"
  };

  if (!bridgeActive) {
    issues.push(issue("medium", "INTEGRATION_BRIDGE_INACTIVE", "LifeOS bridge not initialized"));
  }

  const growthBackend = {
    transport: "lifeosBridge → POST /lifeos/growth/api/events.php",
    clientGrowthSdk: Boolean(window.__LIFEOS_GROWTH_ACTIVE__),
    note: window.__LIFEOS_GROWTH_ACTIVE__
      ? "Legacy growthCore.js active (may duplicate bridge events)"
      : "Bridge-only transport (growthCore.js not active)"
  };

  if (growthBackend.clientGrowthSdk) {
    issues.push(
      issue("medium", "INTEGRATION_GROWTH_DUPLICATE", "growthCore and bridge may both send events")
    );
  }

  const metrika = {
    counterInitialized: Boolean(window.__pmYmCounterInited),
    reachYmGoal: typeof window.reachYmGoal === "function"
  };

  return {
    sessionCore: sessionCore,
    growthBridge: growthBridge,
    growthBackend: growthBackend,
    metrika: metrika,
    eventSending: {
      active: bridgeActive && sessionCore.conversionTracking,
      queuePending: queueLength
    },
    conversionEngine: {
      localLog: Boolean(window.__LIFEOS_EVENTS__),
      eventCount: (window.__LIFEOS_EVENTS__ || []).length
    },
    _issues: issues
  };
}

/**
 * @returns {object}
 */
function auditTechnical() {
  const issues = [];
  const mount = document.getElementById("app");

  const boot = {
    state: window.__BOOT_STATE__ || "unknown",
    buildLock: window.__LIFEOS_BUILD_LOCK__ ?? null,
    buildVersion: window.__LIFEOS_BUILD_VERSION || null,
    buildHash: window.__BUILD_HASH || null,
    appJsVersion: (function () {
      const script = document.querySelector('script[src*="app.js"]');
      return script ? script.getAttribute("src") : null;
    })()
  };

  if (boot.state !== "PASS") {
    issues.push(issue("high", "TECH_BOOT_NOT_PASS", "Boot state is " + boot.state));
  }

  const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(function (link) {
    return link.getAttribute("href");
  });

  const versionDrift =
    boot.buildVersion &&
    boot.appJsVersion &&
    boot.appJsVersion.indexOf(boot.buildVersion) === -1;

  if (versionDrift) {
    issues.push(
      issue(
        "medium",
        "TECH_VERSION_DRIFT",
        "__LIFEOS_BUILD_VERSION (" +
          boot.buildVersion +
          ") differs from app.js cache param (" +
          boot.appJsVersion +
          ")"
      )
    );
  }

  const images = mount ? mount.querySelectorAll("img") : [];
  let imagesLoaded = 0;
  let imagesBroken = 0;
  images.forEach(function (img) {
    if (img.complete && img.naturalWidth > 0) {
      imagesLoaded += 1;
    } else if (img.complete) {
      imagesBroken += 1;
    }
  });

  if (imagesBroken > 0) {
    issues.push(issue("medium", "TECH_ASSET_BROKEN", imagesBroken + " image(s) failed to load"));
  }

  const modules = {
    renderPage: runtimeDiagnostics.renderPageCalled === true,
    mountValidatedApp: runtimeDiagnostics.mountValidatedAppCalled === true,
    preRenderGate: runtimeDiagnostics.preRenderGatePassed === true,
    fullReport: typeof window.__LIFEOS_GET_REPORT__ === "function",
    uiInspector: typeof window.__RUN_UI_CHECK__ === "function",
    uxFixEngine: typeof window.__RUN_UX_FIX_ANALYSIS__ === "function",
    conversionBoost: typeof window.__RUN_CONVERSION_BOOST__ === "function",
    lifeosBridge: Boolean(window.__LIFEOS_BRIDGE__?.active)
  };

  const missingModules = Object.keys(modules).filter(function (key) {
    return modules[key] === false;
  });

  if (missingModules.length > 0) {
    issues.push(
      issue("low", "TECH_MODULE_GAP", "Runtime modules not confirmed: " + missingModules.join(", "))
    );
  }

  const telemetry =
    typeof window.__LIFEOS_GET_REPORT__ === "function" ? window.__LIFEOS_GET_REPORT__() : null;

  return {
    boot: boot,
    buildCheck: {
      gatePassed: runtimeDiagnostics.preRenderGatePassed === true,
      productionLock: window.__LIFEOS_BUILD_LOCK__ === true,
      telemetryStage: telemetry?.telemetry?.stage || null,
      validationErrors: telemetry?.telemetry?.errors?.length || 0
    },
    modules: modules,
    assets: {
      css: cssLinks,
      imagesTotal: images.length,
      imagesLoaded: imagesLoaded,
      imagesBroken: imagesBroken,
      fontsExternal: Boolean(document.querySelector('link[href*="fonts.googleapis.com"]'))
    },
    fullReport: telemetry,
    _issues: issues
  };
}

/**
 * @param {Array<{ severity: string }>} issues
 * @returns {number}
 */
function computeScore(issues) {
  let score = 100;
  issues.forEach(function (item) {
    score -= SCORE_PENALTY[item.severity] || 4;
  });
  return Math.max(0, Math.min(100, score));
}

/**
 * @returns {object}
 */
export function buildSuperSiteReport() {
  try {
    const uiResult = auditUI();
    const conversionResult = auditConversion();
    const integrationsResult = auditIntegrations();
    const technicalResult = auditTechnical();

    const issues = []
      .concat(uiResult._issues || [])
      .concat(conversionResult._issues || [])
      .concat(integrationsResult._issues || [])
      .concat(technicalResult._issues || []);

    if (uiResult.form && uiResult.form.marketingConsentField) {
      issues.push(
        issue(
          "low",
          "CONVERSION_MARKETING_CONSENT",
          "marketingConsent field rendered but not included in leads.js payload"
        )
      );
    }

    if (conversionResult.bridgeGaps && conversionResult.bridgeGaps.length > 0) {
      issues.push(
        issue(
          "low",
          "INTEGRATION_BRIDGE_GAPS",
          "Events not forwarded to Growth: " + conversionResult.bridgeGaps.join(", ")
        )
      );
    }

    const ui = Object.assign({}, uiResult);
    const conversion = Object.assign({}, conversionResult);
    const integrations = Object.assign({}, integrationsResult);
    const technical = Object.assign({}, technicalResult);

    delete ui._issues;
    delete conversion._issues;
    delete integrations._issues;
    delete technical._issues;

    const report = {
      generatedAt: new Date().toISOString(),
      ui: ui,
      conversion: conversion,
      integrations: integrations,
      technical: technical,
      issues: issues,
      score: computeScore(issues)
    };

    return report;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      ui: {},
      conversion: {},
      integrations: {},
      technical: { error: error instanceof Error ? error.message : String(error) },
      issues: [issue("high", "AUDIT_FAILURE", "SuperSite audit failed to complete")],
      score: 0
    };
  }
}

/**
 * Publish report to window global (read-only diagnostic).
 */
export function publishSuperSiteReport() {
  try {
    window.__SUPER_SITE_REPORT__ = buildSuperSiteReport();
    window.__RUN_SUPER_SITE_AUDIT__ = function () {
      window.__SUPER_SITE_REPORT__ = buildSuperSiteReport();
      return window.__SUPER_SITE_REPORT__;
    };
    console.info("SUPER SITE REPORT READY — score:", window.__SUPER_SITE_REPORT__.score);
    return window.__SUPER_SITE_REPORT__;
  } catch (error) {
    window.__SUPER_SITE_REPORT__ = {
      generatedAt: new Date().toISOString(),
      ui: {},
      conversion: {},
      integrations: {},
      technical: {},
      issues: [issue("high", "AUDIT_PUBLISH_FAIL", "Could not publish SuperSite report")],
      score: 0
    };
    return window.__SUPER_SITE_REPORT__;
  }
}
