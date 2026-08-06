/**
 * ULS Boot — Universal Landing System entry.
 * Layers: Content → UI (render) → Logic → Observability
 */

import { initUlsObservability, logUlsEvent, logUlsError, setUlsState } from "./uls/observability.js";
import { setBootState } from "./uls/state.js";
import { normalizeUlsConfig } from "./uls/config.js";
import { initLogicLayer } from "./logic/initLogic.js";

const BOOT_TIMEOUT_MS = 15000;

const SAFE_FALLBACK_HTML =
  '<div style="color:white;padding:40px;background:#0b0f14;min-height:100vh;font-family:system-ui,sans-serif">' +
  "Landing is running in SAFE SIMPLE MODE" +
  "</div>";

function logLanding(message) {
  console.log(message);
}

function isRenderBlocked() {
  return window.__RENDER_FROZEN__ === true || window.__RENDER_LOCK__ === true;
}

function ensureAppMount() {
  let mount = document.getElementById("app");
  if (!mount) {
    mount = document.createElement("div");
    mount.id = "app";
    if (document.body) {
      document.body.appendChild(mount);
    }
  }
  return mount;
}

function revealOnce() {
  if (window.__REVEAL_APPLIED__) {
    return;
  }
  document.querySelectorAll(".reveal").forEach(function (el) {
    el.classList.add("is-visible");
  });
  window.__REVEAL_APPLIED__ = true;
}

function hidePreloaderHard() {
  const preloader = document.getElementById("preloader");
  if (preloader) {
    preloader.classList.add("is-hidden");
    preloader.setAttribute("aria-busy", "false");
    preloader.style.display = "none";
  }
  const staticFallback = document.getElementById("static-fallback");
  if (staticFallback) {
    staticFallback.classList.add("is-hidden");
    staticFallback.style.display = "none";
  }
}

function finalizeBoot(mount) {
  revealOnce();
  if (mount) {
    mount.classList.add("ready");
    mount.removeAttribute("aria-busy");
    mount.style.visibility = "visible";
  }
  hidePreloaderHard();

  window.__RENDER_LOCK__ = true;
  window.__RENDER_FROZEN__ = true;
  window.__LIFEOS_UI_READY__ = true;
  window.__LIFEOS_BOOT_STABLE__ = true;

  setBootState("PASS");
  logUlsEvent("boot_pass", { owner: window.__LIFEOS_BOOT_OWNER__ || "uls" });
}

function atomicWrite(mount, html) {
  if (isRenderBlocked()) {
    return false;
  }
  mount.innerHTML = html;
  return true;
}

function prepareShellEarly() {
  hidePreloaderHard();
  const mount = ensureAppMount();
  if (mount) {
    mount.style.visibility = "visible";
  }
}

function failsafeRender() {
  if (isRenderBlocked()) {
    return;
  }
  try {
    const mount = ensureAppMount();
    if (!atomicWrite(mount, SAFE_FALLBACK_HTML)) {
      return;
    }
    finalizeBoot(mount);
    logLanding("[ULS] SAFE MODE ACTIVE");
  } catch (error) {
    setBootState("FAIL");
    logUlsError({ type: "failsafe", message: String(error) });
  }
}

async function renderLanding(modulePaths) {
  if (isRenderBlocked()) {
    return;
  }

  prepareShellEarly();

  const mount = ensureAppMount();
  let html = SAFE_FALLBACK_HTML;
  let pageContent;

  try {
    const contentMod = await import(modulePaths.content).catch(function (error) {
      console.warn("[ULS] content import skipped:", error);
      logUlsError({ type: "import", module: "content", message: String(error) });
      return null;
    });

    const renderMod = await import(modulePaths.renderPage).catch(function (error) {
      console.warn("[ULS] renderPage import skipped:", error);
      logUlsError({ type: "import", module: "renderPage", message: String(error) });
      return null;
    });

    if (isRenderBlocked()) {
      return;
    }

    pageContent = contentMod ? normalizeUlsConfig(contentMod.PAGE_CONTENT) : undefined;
    window.__ULS_CONFIG__ = pageContent;

    if (pageContent && renderMod && typeof renderMod.renderPage === "function") {
      try {
        const rendered = renderMod.renderPage(pageContent);
        if (typeof rendered === "string" && rendered.trim()) {
          html = rendered;
        }
      } catch (error) {
        console.warn("[ULS] renderPage failed:", error);
        logUlsError({ type: "render", message: String(error) });
      }
    }

    if (!atomicWrite(mount, html)) {
      return;
    }

    finalizeBoot(mount);

    logLanding("[ULS] RENDER OK");
    logLanding("[ULS] DUMP → window.__ULS_DUMP__");

    initLogicLayer(mount, pageContent);
  } catch (error) {
    console.warn("[ULS] render failed — failsafe:", error);
    setBootState("FAIL");
    logUlsError({ type: "boot", message: String(error) });
    failsafeRender();
  }
}

/**
 * @param {{ content: string, renderPage: string, bootOwner?: string }} config
 */
export function bootSimpleLanding(config) {
  initUlsObservability();
  setUlsState("boot", "INIT");

  if (window.__BOOT_STARTED__) {
    return;
  }
  window.__BOOT_STARTED__ = true;
  window.__LIFEOS_BOOT_OWNER__ = config.bootOwner || "uls/simpleBoot.js";

  const modulePaths = {
    content: config.content,
    renderPage: config.renderPage
  };

  const bootTimeoutId = window.setTimeout(function () {
    if (!window.__RENDER_FROZEN__) {
      console.warn("[ULS] boot timeout — failsafe render");
      setBootState("FAIL");
      failsafeRender();
    }
  }, BOOT_TIMEOUT_MS);

  function clearBootTimeout() {
    window.clearTimeout(bootTimeoutId);
  }

  function start() {
    if (isRenderBlocked()) {
      clearBootTimeout();
      return;
    }
    prepareShellEarly();
    renderLanding(modulePaths)
      .then(function () {
        clearBootTimeout();
      })
      .catch(function (error) {
        clearBootTimeout();
        setBootState("FAIL");
        logUlsError({ type: "boot_async", message: String(error) });
        failsafeRender();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
