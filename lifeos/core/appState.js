/**
 * App State — single source of truth for SuperSite + LifeOS UI.
 */

/**
 * @returns {object}
 */
export function createDefaultState() {
  return {
    version: 1,
    boot: { status: "INIT" },
    shell: {
      preloaderHidden: false,
      appReady: false,
      bootError: null
    },
    page: {
      html: null
    },
    video: {
      visible: true,
      play: true,
      playing: true,
      overlayHidden: false
    },
    overlays: {
      stickyCta: false,
      softCta: false,
      exitCta: false
    },
    ui: {
      emphasis: [],
      ctaBoost: false,
      revealAll: true,
      visible: true,
      visibleRevealIndexes: []
    },
    meta: {
      updatedAt: Date.now()
    }
  };
}

/**
 * @param {object} state
 * @returns {object}
 */
function cloneState(state) {
  return JSON.parse(JSON.stringify(state || createDefaultState()));
}

/**
 * Deep-merge patch into base state.
 * @param {object} base
 * @param {object} patch
 * @returns {object}
 */
export function mergeAppState(base, patch) {
  const next = cloneState(base);

  function merge(target, source) {
    if (!source || typeof source !== "object") {
      return;
    }
    Object.keys(source).forEach(function (key) {
      const value = source[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== "object") {
          target[key] = {};
        }
        merge(target[key], value);
      } else {
        target[key] = value;
      }
    });
  }

  merge(next, patch);
  next.meta = Object.assign({}, next.meta, { updatedAt: Date.now() });
  return next;
}

/**
 * Initialize global app state containers.
 * @param {object} [initial]
 * @returns {object}
 */
export function initAppState(initial) {
  window.__APP_STATE__ = mergeAppState(createDefaultState(), initial || {});
  window.__APP_INTENTS__ = window.__APP_INTENTS__ || [];
  window.__APP_INTENT_STREAM__ = window.__APP_INTENT_STREAM__ || [];
  return window.__APP_STATE__;
}

/**
 * @returns {object}
 */
export function getAppState() {
  if (!window.__APP_STATE__) {
    return initAppState();
  }
  return window.__APP_STATE__;
}

/**
 * @param {object} patch
 * @returns {object}
 */
export function patchAppState(patch) {
  const next = mergeAppState(getAppState(), patch);
  window.__APP_STATE__ = next;
  return next;
}
