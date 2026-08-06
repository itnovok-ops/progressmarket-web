import { startEventCollector } from "./eventCollector.js";
import { flushQueue, sendSessionSummary } from "./growthAPI.js";
import { getSummary } from "./conversionPipeline.js";
import { getLinkedSession } from "./sessionLinker.js";
import { getFunnelMetrics } from "./funnelEngine.js";
import { getIntentMap } from "./intentEngineClient.js";
import { getLandingStats } from "./landingStatsEngine.js";
import { publishGrowthReport } from "./growthReport.js";

let started = false;
let flushTimer = 0;
let summaryTimer = 0;

function publishGrowthState() {
  try {
    const funnel = getFunnelMetrics();
    const intent = getIntentMap();
    const landing = getLandingStats();
    const report = publishGrowthReport();

    window.__LIFEOS_GROWTH__ = {
      session: getLinkedSession(),
      pipeline: getSummary(),
      funnel: funnel,
      intent: intent,
      landing: landing,
      report: report,
      active: true
    };
  } catch (_error) {
    /* silent */
  }
}

/**
 * Initialize LifeOS Growth layer (data only — no UI changes).
 * @param {{ root?: ParentNode }} [options]
 */
export function initGrowth(options) {
  try {
    if (
      window.__LIFEOS_PRODUCTION_MODE__ === true ||
      window.__LIFEOS_PASSIVE_GROWTH_RUNTIME__ === true
    ) {
      publishGrowthState();
      window.__LIFEOS_GROWTH_ACTIVE__ = false;
      return window.__LIFEOS_GROWTH__ || { active: false, passive: true, mode: "analytics_only" };
    }

    if (started || window.__LIFEOS_GROWTH_ACTIVE__) {
      publishGrowthState();
      return window.__LIFEOS_GROWTH__;
    }

    if (window.__BOOT_STATE__ && window.__BOOT_STATE__ !== "PASS") {
      return null;
    }

    const lifeosSession = window.__LIFEOS_SESSION__;
    if (lifeosSession && lifeosSession.flags && lifeosSession.flags.isConversionTracking === false) {
      return null;
    }

    const root = (options && options.root) || document.getElementById("app");

    startEventCollector(root);
    publishGrowthState();

    flushQueue().catch(function () {
      /* silent */
    });

    flushTimer = window.setInterval(function () {
      flushQueue().catch(function () {
        /* silent */
      });
    }, 15000);

    summaryTimer = window.setInterval(function () {
      try {
        publishGrowthState();
        sendSessionSummary(getSummary()).catch(function () {
          /* silent */
        });
      } catch (_error) {
        /* silent */
      }
    }, 60000);

    window.addEventListener(
      "beforeunload",
      function () {
        try {
          publishGrowthState();
          sendSessionSummary(getSummary());
        } catch (_error) {
          /* silent */
        }
      },
      { passive: true }
    );

    document.addEventListener("lifeos:session:update", function () {
      publishGrowthState();
    });

    window.__LIFEOS_GROWTH_ACTIVE__ = true;
    window.__RUN_CONVERSION_BOOST__ = window.__RUN_CONVERSION_BOOST__ || function () {};

    started = true;
    publishGrowthState();

    return window.__LIFEOS_GROWTH__;
  } catch (_error) {
    return null;
  }
}

export function stopGrowth() {
  if (flushTimer) {
    window.clearInterval(flushTimer);
  }
  if (summaryTimer) {
    window.clearInterval(summaryTimer);
  }
  started = false;
  window.__LIFEOS_GROWTH_ACTIVE__ = false;
}
