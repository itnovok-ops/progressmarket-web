import { initLeadIntelligenceEngine, updateLeadState, triggerCRMDecision } from "./leadIntelligenceEngine.js";
import { reachYmGoal } from "./tracking.js";

const CTA_KEYWORDS = ["расчёт", "получить", "заявка", "узнать"];
const SCROLL_INTENTS = [
  { ratio: 0.25, event: "scroll_intent_low", metrika: null },
  { ratio: 0.5, event: "scroll_intent_mid", metrika: "scroll_50" },
  { ratio: 0.75, event: "scroll_intent_high", metrika: null },
  { ratio: 0.9, event: "scroll_intent_deep", metrika: "scroll_90" }
];
const FORM_ABANDON_MS = 40000;

/** @type {Set<string>} */
const firedEvents = new Set();

/** @type {Map<HTMLElement, number>} */
const abandonTimers = new Map();

let metrikaFormStarted = false;

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [payload]
 */
function emitBusEvent(eventName, payload) {
  try {
    if (typeof window.__LIFEOS_EVENT_BUS__?.emit === "function") {
      window.__LIFEOS_EVENT_BUS__.emit(
        {
          event: eventName,
          metadata: payload || {},
          source: "conversionEngine",
          timestamp: Date.now()
        },
        "conversion"
      );
      return;
    }
    if (typeof window.__LIFEOS_SEND_EVENT === "function") {
      window.__LIFEOS_SEND_EVENT({
        event: eventName,
        metadata: payload || {},
        source: "conversionEngine",
        timestamp: Date.now()
      });
    }
  } catch (_error) {
    /* silent layer */
  }
}

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [payload]
 */
function forwardMetrika(eventName, payload) {
  try {
    if (eventName === "form_focus" && !metrikaFormStarted) {
      metrikaFormStarted = true;
      reachYmGoal("form_start");
      return;
    }
    const intent = SCROLL_INTENTS.find(function (item) {
      return item.event === eventName;
    });
    if (intent?.metrika) {
      reachYmGoal(intent.metrika);
    }
    if (eventName === "cta_click" && payload?.trackId) {
      reachYmGoal(String(payload.trackId));
    }
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [payload]
 */
export function track(eventName, payload) {
  try {
    emitBusEvent(eventName, payload);
    forwardMetrika(eventName, payload);
    updateLeadState({
      event: eventName,
      timestamp: Date.now(),
      meta: payload || {}
    });
    triggerCRMDecision();
  } catch (_error) {
    /* silent layer */
  }
}

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [payload]
 */
function trackOnce(eventName, payload) {
  if (firedEvents.has(eventName)) {
    return;
  }
  firedEvents.add(eventName);
  track(eventName, payload);
}

export function registerScrollIntentDetection() {
  const fired = new Set();

  function onScroll() {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop || 0;
    const scrollHeight = Math.max(doc.scrollHeight - window.innerHeight, 1);
    const ratio = scrollTop / scrollHeight;

    SCROLL_INTENTS.forEach(function (intent) {
      if (ratio >= intent.ratio && !fired.has(intent.event)) {
        fired.add(intent.event);
        trackOnce(intent.event, { ratio: intent.ratio, scrollTop: scrollTop });
      }
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function matchesCtaKeyword(text) {
  const normalized = String(text || "").toLowerCase();
  return CTA_KEYWORDS.some(function (keyword) {
    return normalized.includes(keyword);
  });
}

export function registerCTAOptimization() {
  const root = document.getElementById("app") || document;
  const nodes = root.querySelectorAll("a, button, input[type='submit'], input[type='button']");

  nodes.forEach(function (node) {
    const label = (node.textContent || node.value || "").trim();
    const trackId = node.getAttribute("data-track");
    const isCta = Boolean(trackId) || matchesCtaKeyword(label);

    if (!isCta) {
      return;
    }

    node.addEventListener(
      "click",
      function () {
        if (trackId) {
          reachYmGoal(trackId);
        }
        track("cta_click", {
          label: label,
          tag: node.tagName.toLowerCase(),
          href: node.getAttribute("href") || "",
          trackId: trackId || null
        });
      },
      { passive: true }
    );
  });
}

function clearAbandonTimer(input) {
  const timerId = abandonTimers.get(input);
  if (timerId) {
    window.clearTimeout(timerId);
    abandonTimers.delete(input);
  }
}

function scheduleFormAbandon(input) {
  clearAbandonTimer(input);
  const timerId = window.setTimeout(function () {
    if (!input.matches(":focus")) {
      return;
    }
    track("form_abandon", {
      field: input.name || input.id || input.type || "unknown",
      delayMs: FORM_ABANDON_MS
    });
  }, FORM_ABANDON_MS);
  abandonTimers.set(input, timerId);
}

export function registerFormFrictionTracking() {
  const form = document.getElementById("lead-form");
  if (!form) {
    return;
  }

  const statusEl = document.getElementById("form-status");
  let submitAttempted = false;

  form.querySelectorAll("input, textarea, select").forEach(function (input) {
    input.addEventListener(
      "focus",
      function () {
        track("form_focus", {
          field: input.name || input.id || input.type || "unknown"
        });
        scheduleFormAbandon(input);
      },
      { passive: true }
    );

    input.addEventListener(
      "blur",
      function () {
        clearAbandonTimer(input);
      },
      { passive: true }
    );
  });

  form.addEventListener(
    "submit",
    function () {
      submitAttempted = true;
      track("form_submit_attempt", {});
      form.querySelectorAll("input, textarea, select").forEach(function (input) {
        clearAbandonTimer(input);
      });
    },
    true
  );

  if (statusEl) {
    const observer = new MutationObserver(function () {
      if (!submitAttempted) {
        return;
      }
      if (statusEl.classList.contains("form-status--success")) {
        track("form_submit_success", {});
        submitAttempted = false;
        return;
      }
      if (statusEl.classList.contains("form-status--error")) {
        track("form_submit_fail", { message: statusEl.textContent || "" });
        submitAttempted = false;
      }
    });

    observer.observe(statusEl, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  const successPanel = document.getElementById("lead-form-success");
  if (successPanel) {
    const successObserver = new MutationObserver(function () {
      if (form.hidden && !successPanel.hidden) {
        track("form_submit_success", { source: "form_hidden" });
      }
    });
    successObserver.observe(form, { attributes: true, attributeFilter: ["hidden"] });
    successObserver.observe(successPanel, { attributes: true, attributeFilter: ["hidden"] });
  }
}

export function registerExitIntent() {
  if (window.matchMedia("(pointer: coarse)").matches) {
    return;
  }

  let fired = false;

  document.addEventListener(
    "mouseout",
    function (event) {
      if (fired || event.relatedTarget || event.clientY > 0) {
        return;
      }
      fired = true;
      track("exit_intent", { viewportY: event.clientY });
    },
    { passive: true }
  );
}

/**
 * @param {{ lock?: boolean, mode?: string }} [options]
 */
export function initConversionEngine(options) {
  if (options?.lock !== true) {
    return;
  }

  initLeadIntelligenceEngine();
  registerScrollIntentDetection();
  registerCTAOptimization();
  registerFormFrictionTracking();
  registerExitIntent();
}
