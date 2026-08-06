/**
 * State validation — safe defaults before any state update.
 */

const DEFAULT_APP_STATE = {
  video: { visible: true, play: true },
  ui: { sectionsVisible: true },
  shell: { appReady: true, preloaderHidden: true },
  page: { html: null }
};

const DEFAULT_NIKA_STATE = {
  mode: "advisory",
  ctr: 0,
  health: 100,
  events: [],
  insights: [],
  recommendations: []
};

/**
 * Validate and normalize application state.
 * @param {object} [state]
 * @returns {object}
 */
export function validateState(state) {
  const input = state && typeof state === "object" ? state : {};
  const next = Object.assign({}, input);

  const video = input.video && typeof input.video === "object" ? input.video : {};
  next.video = {
    visible: typeof video.visible === "boolean" ? video.visible : DEFAULT_APP_STATE.video.visible,
    play: typeof video.play === "boolean" ? video.play : DEFAULT_APP_STATE.video.play
  };

  const ui = input.ui && typeof input.ui === "object" ? input.ui : {};
  next.ui = {
    sectionsVisible:
      typeof ui.sectionsVisible === "boolean" ? ui.sectionsVisible : DEFAULT_APP_STATE.ui.sectionsVisible
  };

  const shell = input.shell && typeof input.shell === "object" ? input.shell : {};
  next.shell = Object.assign({}, DEFAULT_APP_STATE.shell, shell);

  if (input.page && typeof input.page === "object") {
    next.page = Object.assign({}, DEFAULT_APP_STATE.page, input.page);
  } else {
    next.page = DEFAULT_APP_STATE.page;
  }

  return next;
}

/**
 * Validate Nika state shape.
 * @param {object} [state]
 * @returns {object}
 */
export function validateNikaState(state) {
  const input = state && typeof state === "object" ? state : {};
  const next = Object.assign({}, DEFAULT_NIKA_STATE, input);

  next.mode = typeof input.mode === "string" && input.mode ? input.mode : DEFAULT_NIKA_STATE.mode;
  next.events = Array.isArray(input.events) ? input.events : [];
  next.insights = Array.isArray(input.insights) ? input.insights : [];
  next.recommendations = Array.isArray(input.recommendations) ? input.recommendations : [];

  return next;
}

/**
 * Fingerprint for render idempotency checks.
 * @param {object} state
 * @returns {string}
 */
export function stateFingerprint(state) {
  const s = validateState(state);
  return JSON.stringify({
    video: s.video,
    ui: s.ui,
    shell: {
      appReady: s.shell.appReady,
      preloaderHidden: s.shell.preloaderHidden,
      bootError: s.shell.bootError ? true : false
    },
    pageLen: s.page && s.page.html ? s.page.html.length : 0
  });
}

if (typeof window !== "undefined") {
  window.validateState = validateState;
  window.validateNikaState = validateNikaState;
}
