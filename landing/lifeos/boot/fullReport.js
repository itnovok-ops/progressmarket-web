import { BootTelemetry } from "./BootTelemetry.js";

export const runtimeDiagnostics = {
  preRenderGatePassed: false,
  renderPageCalled: false,
  mountValidatedAppCalled: false
};

const SCROLL_EVENT_PREFIX = "scroll_intent_";

/**
 * @returns {number}
 */
function countLoadedAssets() {
  try {
    const root = document.getElementById("app");
    if (!root) {
      return 0;
    }
    const images = root.querySelectorAll("img");
    let loaded = 0;
    images.forEach(function (img) {
      if (img.complete && img.naturalWidth > 0) {
        loaded += 1;
      }
    });
    return loaded;
  } catch (error) {
    return 0;
  }
}

/**
 * @returns {object}
 */
function buildConversionSummary(events) {
  let scrollEvents = 0;
  let ctaClicks = 0;
  let formFocus = 0;
  let exitIntent = false;

  events.forEach(function (entry) {
    const name = entry && entry.event;
    if (!name) {
      return;
    }
    if (name.indexOf(SCROLL_EVENT_PREFIX) === 0) {
      scrollEvents += 1;
      return;
    }
    if (name === "cta_click") {
      ctaClicks += 1;
      return;
    }
    if (name === "form_focus") {
      formFocus += 1;
      return;
    }
    if (name === "exit_intent") {
      exitIntent = true;
    }
  });

  return {
    scrollEvents: scrollEvents,
    ctaClicks: ctaClicks,
    formFocus: formFocus,
    exitIntent: exitIntent
  };
}

/**
 * @returns {object}
 */
export function buildFullReport() {
  try {
    const events = window.__LIFEOS_EVENTS__ || [];
    const expectedAssets = BootTelemetry.report?.metrics?.assets_checked || 17;
    const loadedAssets = countLoadedAssets();

    let telemetry = null;
    try {
      telemetry = typeof BootTelemetry.getReport === "function" ? BootTelemetry.getReport() : null;
    } catch (error) {
      telemetry = null;
    }

    return {
      boot: window.__BOOT_STATE__ ?? null,
      buildLock: window.__LIFEOS_BUILD_LOCK__ ?? null,
      buildVersion: window.__LIFEOS_BUILD_VERSION ?? null,
      buildHash: window.__BUILD_HASH ?? null,
      telemetry: telemetry,
      events: events,
      leadState: window.__LIFEOS_LEAD_STATE__ || null,
      conversionSummary: buildConversionSummary(events),
      systemHealth: {
        renderPageCalled: runtimeDiagnostics.renderPageCalled === true,
        mountValidatedAppCalled: runtimeDiagnostics.mountValidatedAppCalled === true,
        preRenderGatePassed: runtimeDiagnostics.preRenderGatePassed === true,
        footerRendered: !!document.querySelector(".site-footer__requisites"),
        assetsLoaded: loadedAssets + "/" + expectedAssets
      }
    };
  } catch (error) {
    return {
      boot: window.__BOOT_STATE__ ?? null,
      buildLock: window.__LIFEOS_BUILD_LOCK__ ?? null,
      buildVersion: window.__LIFEOS_BUILD_VERSION ?? null,
      buildHash: window.__BUILD_HASH ?? null,
      telemetry: null,
      events: window.__LIFEOS_EVENTS__ || [],
      leadState: window.__LIFEOS_LEAD_STATE__ || null,
      conversionSummary: {
        scrollEvents: 0,
        ctaClicks: 0,
        formFocus: 0,
        exitIntent: false
      },
      systemHealth: {
        renderPageCalled: false,
        mountValidatedAppCalled: false,
        preRenderGatePassed: false,
        footerRendered: false,
        assetsLoaded: "0/17"
      }
    };
  }
}

export function refreshFullReport() {
  try {
    window.__LIFEOS_FULL_REPORT__ = buildFullReport();
    return window.__LIFEOS_FULL_REPORT__;
  } catch (error) {
    return window.__LIFEOS_FULL_REPORT__ || null;
  }
}

export function publishFullReport() {
  try {
    refreshFullReport();
    window.__LIFEOS_GET_REPORT__ = function () {
      return refreshFullReport();
    };
    console.info("LIFEOS FULL REPORT READY");
  } catch (error) {
    /* silent layer */
  }
}
