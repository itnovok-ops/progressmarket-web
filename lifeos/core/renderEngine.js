/**
 * Render Engine — minimal STATE → DOM restore.
 * Safe-boot: no static imports from safety/performance (avoids 404 cascade).
 *
 * Video rule: renderEngine controls ONLY the #video section visibility.
 * Media behavior is owned by heroVideoPlayer.js.
 */

const DEFAULT_APP_STATE = {
  video: { visible: true, play: true },
  ui: { sectionsVisible: true },
  shell: { appReady: true, preloaderHidden: true },
  page: { html: null }
};

let lastRenderFingerprint = "";
let renderTickLock = false;

function validateState(state) {
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
  next.shell = {
    appReady: typeof shell.appReady === "boolean" ? shell.appReady : DEFAULT_APP_STATE.shell.appReady,
    preloaderHidden:
      typeof shell.preloaderHidden === "boolean"
        ? shell.preloaderHidden
        : DEFAULT_APP_STATE.shell.preloaderHidden
  };

  const page = input.page && typeof input.page === "object" ? input.page : {};
  next.page = {
    html: typeof page.html === "string" ? page.html : DEFAULT_APP_STATE.page.html
  };

  return next;
}

function stateFingerprint(state) {
  const next = validateState(state);
  return JSON.stringify({
    video: next.video,
    ui: next.ui,
    shell: next.shell,
    pageLen: next.page && next.page.html ? next.page.html.length : 0
  });
}

function runCycle(_cycleName, fn) {
  try {
    return fn();
  } catch (error) {
    console.warn("[LIFEOS SAFE MODE] render cycle error (non-blocking):", error);
    return { ok: false, reason: "render_cycle_error" };
  }
}

/**
 * Ensure global app state exists before any render pass.
 * @returns {object}
 */
export function ensureAppState() {
  if (!window.__APP_STATE__) {
    window.__APP_STATE__ = validateState(DEFAULT_APP_STATE);
    return window.__APP_STATE__;
  }

  window.__APP_STATE__ = validateState(window.__APP_STATE__);
  return window.__APP_STATE__;
}

/**
 * @param {object} [page]
 */
export function renderPage(page) {
  const mount = document.getElementById("app");
  if (!mount || !page || typeof page.html !== "string" || !page.html) {
    return;
  }

  if (document.getElementById("heroVideo")) {
    return;
  }

  if (mount.innerHTML !== page.html) {
    mount.innerHTML = page.html;
  }
}

/**
 * @param {object} [shell]
 */
export function renderShell(shell) {
  const config = shell || {};
  const preloader = document.getElementById("preloader");
  const mount = document.getElementById("app");
  const errorRoot = document.getElementById("lifeos-boot-error");

  if (preloader) {
    if (config.preloaderHidden === true) {
      preloader.classList.add("is-hidden");
      preloader.setAttribute("aria-busy", "false");
    } else {
      preloader.classList.remove("is-hidden");
    }
  }

  if (mount) {
    if (config.appReady !== false) {
      mount.classList.add("ready");
      mount.removeAttribute("aria-busy");
      mount.style.visibility = "visible";
    } else {
      mount.classList.remove("ready");
    }
  }

  if (errorRoot) {
    if (config.bootError && config.bootError.html) {
      errorRoot.innerHTML = config.bootError.html;
      errorRoot.classList.add("is-visible");
    } else {
      errorRoot.innerHTML = "";
      errorRoot.classList.remove("is-visible");
    }
  }
}

/**
 * Section visibility only — does NOT touch #heroVideo media state.
 * @param {object} [video]
 */
export function renderVideo(video) {
  const config = video || { visible: true };
  const section =
    document.getElementById("video") || document.querySelector('[data-section="video"]');
  if (!section) {
    return;
  }

  if (config.visible !== false) {
    section.style.display = "block";
    section.style.visibility = "visible";
    section.hidden = false;
    section.removeAttribute("hidden");
  } else {
    section.style.display = "none";
    section.hidden = true;
  }
}

/**
 * Safe static UI restore — does not remove existing HTML.
 * @param {object} [ui]
 */
export function renderUI(ui) {
  const config = ui || {};
  const show = config.sectionsVisible === true;

  const sections = document.querySelectorAll("[data-section]");
  sections.forEach(function (el) {
    if (show) {
      el.style.display = "block";
      el.hidden = false;
    } else {
      el.style.display = "none";
      el.hidden = true;
    }
  });

  if (show) {
    document.querySelectorAll("[data-section] .reveal").forEach(function (el) {
      el.classList.add("is-visible");
      el.style.opacity = "1";
    });
  }
}

function applyStateBody(next) {
  const started = Date.now();

  renderPage(next.page);
  renderShell(next.shell);
  renderVideo(next.video);
  renderUI(next.ui);

  window.__APP_STATE__ = next;
  window.__APP_LAST_RENDER_AT__ = Date.now();
  window.__RENDER_LAG_MS__ = Date.now() - started;

  return { ok: true };
}

/**
 * Apply full application state to DOM (deterministic + idempotent).
 * @param {object} [state]
 * @returns {{ ok: boolean, reason?: string, skipped?: boolean }}
 */
export function applyState(state) {
  const cycleResult = runCycle("renderCycle", function () {
    const next = ensureAppState();
    if (state && typeof state === "object") {
      const merged = validateState(Object.assign({}, next, state));
      if (state.video) merged.video = validateState({ video: state.video }).video;
      if (state.ui) merged.ui = validateState({ ui: state.ui }).ui;
      if (state.shell) merged.shell = Object.assign({}, next.shell, state.shell);
      if (state.page) merged.page = Object.assign({}, next.page, state.page);
      Object.assign(next, merged);
    }

    const fingerprint = stateFingerprint(next);
    if (fingerprint === lastRenderFingerprint) {
      return { ok: true, skipped: true, reason: "unchanged" };
    }

    if (renderTickLock) {
      return { ok: true, skipped: true, reason: "same_tick" };
    }

    renderTickLock = true;
    queueMicrotask(function () {
      renderTickLock = false;
    });

    const result = applyStateBody(next);
    lastRenderFingerprint = fingerprint;
    return result;
  });

  if (cycleResult && cycleResult.skipped) {
    return { ok: true, skipped: true, reason: cycleResult.reason };
  }

  if (cycleResult && cycleResult.success === false) {
    return { ok: false, reason: "render_error" };
  }

  return cycleResult && cycleResult.result ? cycleResult.result : cycleResult || { ok: true };
}

if (typeof window !== "undefined") {
  window.applyState = applyState;
  window.ensureAppState = ensureAppState;
}
