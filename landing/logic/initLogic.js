/**
 * ULS Logic Layer bootstrap — wires forms, header, video, carousel, analytics.
 */

import { initHeaderController } from "./headerController.js";
import { initHeroVideoController } from "./videoController.js";
import { logUlsEvent } from "../uls/observability.js";

function runWhenIdle(fn, timeout) {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(fn, { timeout: timeout || 1200 });
  } else {
    window.setTimeout(fn, 100);
  }
}

/**
 * @param {HTMLElement} mount
 * @param {import('../assets/data/content.js').PAGE_CONTENT} pageContent
 */
export function initLogicLayer(mount, pageContent) {
  if (!mount || !pageContent || window.__ULS_LOGIC_READY__ === true) {
    return;
  }
  window.__ULS_LOGIC_READY__ = true;

  logUlsEvent("page_view", {
    path: window.location.pathname,
    product: pageContent.meta && pageContent.meta.brand
  });

  initHeaderController();

  runWhenIdle(function () {
    import("../components/leads.js")
      .then(function (mod) {
        if (mod && typeof mod.initLeadForm === "function") {
          mod.initLeadForm(pageContent.cta);
        }
      })
      .catch(function (error) {
        console.warn("[ULS] initLeadForm skipped:", error);
      });

    import("../components/tracking.js")
      .then(function (mod) {
        if (!mod) {
          return;
        }
        if (typeof mod.initMetrika === "function") {
          mod.initMetrika();
        }
        if (typeof mod.initTracking === "function") {
          mod.initTracking(mount);
        }
      })
      .catch(function (error) {
        console.warn("[ULS] tracking skipped:", error);
      });
  }, 1200);

  import("../components/Carousel.js")
    .then(function (mod) {
      if (mod && typeof mod.initCarousels === "function") {
        mod.initCarousels(mount);
      }
    })
    .catch(function (error) {
      console.warn("[ULS] carousel skipped:", error);
    });

  runWhenIdle(function () {
    initHeroVideoController();
  }, 800);
}
