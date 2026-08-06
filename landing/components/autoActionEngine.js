import { updateLeadState, triggerCRMDecision } from "./leadIntelligenceEngine.js";

const INACTIVITY_MS = 45000;
const STYLE_ID = "lifeos-auto-action-styles";

/** @type {boolean} */
let engineActive = false;

/** @type {string | null} */
let lastAppliedSegment = null;

/** @type {boolean} */
let exitRecoveryShown = false;

/** @type {boolean} */
let scrollBoost50 = false;

/** @type {boolean} */
let scrollBoost75 = false;

const CTA_MAP = {
  cold: {
    primary: "Посмотреть как работает",
    secondary: "Как зарабатывают на WB"
  },
  warm: {
    primary: "Получить расчёт прибыли",
    secondary: "Примеры товаров"
  },
  hot: {
    primary: "Получить запуск под ключ",
    secondary: "Разбор вашей ниши"
  },
  purchase_ready: {
    primary: "Оставить заявку сейчас",
    secondary: "Разбор вашей ниши"
  }
};

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [meta]
 */
function emitActionEvent(eventName, meta) {
  try {
    window.__LIFEOS_EVENTS__ = window.__LIFEOS_EVENTS__ || [];
    window.__LIFEOS_EVENTS__.push({
      event: eventName,
      timestamp: Date.now(),
      meta: meta || {}
    });
    updateLeadState();
    triggerCRMDecision();
  } catch (error) {
    /* silent layer */
  }
}

function injectAutoActionStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent =
    "@keyframes lifeos-cta-pulse{0%,100%{box-shadow:0 0 0 0 rgba(99,179,255,.35)}50%{box-shadow:0 0 0 10px rgba(99,179,255,0)}}" +
    ".cta-hot{animation:lifeos-cta-pulse 1.4s ease-in-out infinite}" +
    ".section-emphasis{box-shadow:inset 0 0 0 1px rgba(99,179,255,.35)}" +
    ".auto-action-hidden{visibility:hidden!important;pointer-events:none!important}" +
    ".lifeos-exit-recovery{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9998;max-width:min(520px,calc(100vw - 24px));padding:12px 16px;border-radius:12px;background:rgba(15,20,32,.96);color:#f4f7fc;border:1px solid rgba(99,179,255,.35);box-shadow:0 8px 32px rgba(0,0,0,.35);pointer-events:auto}" +
    ".lifeos-exit-recovery__text{margin:0 0 10px;font-size:14px;line-height:1.4}" +
    ".lifeos-exit-recovery__actions{display:flex;gap:8px;flex-wrap:wrap}";
  document.head.appendChild(style);
}

/**
 * @returns {{ segment: string, score: number }}
 */
function readLeadContext() {
  const state = window.__LIFEOS_LEAD_STATE__ || {};
  const score = typeof state.score === "number" ? state.score : 0;
  let segment = state.segment || "cold";

  if (score >= 80) {
    segment = "purchase_ready";
  }

  return { segment: segment, score: score };
}

function setButtonText(node, text) {
  if (!node || !text) {
    return;
  }
  node.textContent = text;
}

export function applyDynamicCTA() {
  if (!engineActive) {
    return;
  }

  try {
    const context = readLeadContext();
    const copy = CTA_MAP[context.segment] || CTA_MAP.cold;
    const root = document.getElementById("app") || document;

    const primaryNodes = root.querySelectorAll(
      ".hero-actions .btn-primary, #lead-submit, .site-header .btn-primary, .sticky-cta__btn, .soft-cta__action, .exit-cta__action"
    );
    primaryNodes.forEach(function (node) {
      setButtonText(node, copy.primary);
      node.classList.remove("cta-hot");
      if (context.score >= 80 || context.segment === "purchase_ready") {
        node.classList.add("cta-hot");
      }
    });

    const secondaryNodes = root.querySelectorAll(".hero-actions .btn-secondary");
    secondaryNodes.forEach(function (node) {
      setButtonText(node, copy.secondary);
    });

    lastAppliedSegment = context.segment;
  } catch (error) {
    /* silent layer */
  }
}

function showExitRecoveryBanner() {
  if (exitRecoveryShown || !engineActive) {
    return;
  }

  exitRecoveryShown = true;
  emitActionEvent("exit_recovery_triggered", { source: "auto_action_engine" });

  const banner = document.createElement("div");
  banner.className = "lifeos-exit-recovery";
  banner.setAttribute("role", "status");
  banner.innerHTML =
    '<p class="lifeos-exit-recovery__text">Хотите посчитать, сколько вы заработаете на WB?</p>' +
    '<div class="lifeos-exit-recovery__actions">' +
    '<button type="button" class="btn btn-primary lifeos-exit-recovery__cta">Получить расчёт</button>' +
    '<button type="button" class="btn btn-secondary lifeos-exit-recovery__close">Закрыть</button>' +
    "</div>";

  const ctaBtn = banner.querySelector(".lifeos-exit-recovery__cta");
  const closeBtn = banner.querySelector(".lifeos-exit-recovery__close");

  if (ctaBtn) {
    ctaBtn.addEventListener("click", function () {
      const target = document.getElementById("cta");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      banner.remove();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      banner.remove();
    });
  }

  document.body.appendChild(banner);
}

export function initExitRecovery() {
  if (!engineActive) {
    return;
  }

  try {
    let inactivityTimer = window.setTimeout(function () {
      showExitRecoveryBanner();
    }, INACTIVITY_MS);

    function resetInactivity() {
      window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(function () {
        showExitRecoveryBanner();
      }, INACTIVITY_MS);
    }

    ["mousemove", "keydown", "scroll", "touchstart", "click"].forEach(function (eventName) {
      window.addEventListener(eventName, resetInactivity, { passive: true });
    });

    if (!window.matchMedia("(pointer: coarse)").matches) {
      document.addEventListener(
        "mouseout",
        function (event) {
          if (event.relatedTarget || event.clientY > 0) {
            return;
          }
          showExitRecoveryBanner();
        },
        { passive: true }
      );
    }
  } catch (error) {
    /* silent layer */
  }
}

function hideSecondaryDistractions() {
  const selectors = [".soft-cta", ".exit-cta", ".hero-actions .btn-secondary"];
  selectors.forEach(function (selector) {
    document.querySelectorAll(selector).forEach(function (node) {
      node.classList.add("auto-action-hidden");
    });
  });
}

export function applyContentBoost() {
  if (!engineActive) {
    return;
  }

  try {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop || 0;
    const scrollHeight = Math.max(doc.scrollHeight - window.innerHeight, 1);
    const ratio = scrollTop / scrollHeight;

    if (ratio >= 0.5 && !scrollBoost50) {
      scrollBoost50 = true;
      const casesSection = document.getElementById("cases");
      if (casesSection) {
        casesSection.classList.add("section-emphasis");
      }
    }

    if (ratio >= 0.75 && !scrollBoost75) {
      scrollBoost75 = true;
      const ctaSection = document.getElementById("cta");
      if (ctaSection) {
        ctaSection.classList.add("section-emphasis");
      }
      hideSecondaryDistractions();
    }
  } catch (error) {
    /* silent layer */
  }
}

function bindScrollBoost() {
  window.addEventListener(
    "scroll",
    function () {
      applyContentBoost();
    },
    { passive: true }
  );
  applyContentBoost();
}

function bindLeadStateWatcher() {
  window.setInterval(function () {
    try {
      const context = readLeadContext();
      if (context.segment !== lastAppliedSegment) {
        applyDynamicCTA();
      }
    } catch (error) {
      /* silent layer */
    }
  }, 2000);
}

/**
 * @param {{ events?: Array, leadState?: object }} [_options]
 */
export function initAutoActionEngine(_options) {
  if (window.__LIFEOS_PASSIVE_AUTO_ACTION__ === true) {
    engineActive = false;
    return { active: false, passive: true };
  }

  if (window.__LIFEOS_BUILD_LOCK__ !== true) {
    return;
  }

  try {
    if (typeof window.__LIFEOS_CAN_MODIFY_UI__ === "function" && !window.__LIFEOS_CAN_MODIFY_UI__()) {
      engineActive = false;
      return { active: false, reason: "control_layer_blocked" };
    }
    engineActive = true;
    injectAutoActionStyles();
    applyDynamicCTA();
    initExitRecovery();
    bindScrollBoost();
    bindLeadStateWatcher();
  } catch (error) {
    engineActive = false;
  }
}
