import { assertBootPass } from "../build/productionLock.js";
import { enqueueIntent } from "../../lifeos/core/intentLayer.js";
import { runPipeline } from "../../lifeos/core/pipeline.js";

function scrollToCta() {
  const target = document.getElementById("cta");
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function dismissKey(id) {
  return "wb-fbs-cta-dismiss-" + id;
}

function wasDismissed(id) {
  try {
    return sessionStorage.getItem(dismissKey(id)) === "1";
  } catch (e) {
    return false;
  }
}

function markDismissed(id) {
  try {
    sessionStorage.setItem(dismissKey(id), "1");
  } catch (e) {
    /* ignore */
  }
}

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT['cta']} cta
 */
export function initConversionOptimizations(cta) {
  assertBootPass();
  window.__LIFEOS_CTA_CONFIG__ = cta;
  enqueueIntent({
    type: "ACTION",
    source: "conversion",
    payload: { overlays: { stickyCta: true, softCta: false, exitCta: false } }
  });
  runPipeline();
  bindConversionListeners(cta);
}

function bindConversionListeners(cta) {
  if (wasDismissed("soft")) {
    return;
  }

  let softTriggered = false;
  function onScroll() {
    if (softTriggered) {
      return;
    }
    const doc = document.documentElement;
    const maxScroll = doc.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) {
      return;
    }
    const ratio = (window.scrollY || doc.scrollTop) / maxScroll;
    if (ratio >= 0.6) {
      softTriggered = true;
      enqueueIntent({
        type: "ACTION",
        source: "conversion",
        payload: { overlays: { softCta: true } }
      });
      runPipeline();
      window.removeEventListener("scroll", onScroll, { passive: true });
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  const isDesktop = window.matchMedia("(min-width: 1024px) and (hover: hover)").matches;
  if (!isDesktop || wasDismissed("exit")) {
    return;
  }

  let exitShown = false;
  document.addEventListener("mouseout", function (e) {
    if (exitShown) {
      return;
    }
    if (!e.relatedTarget && e.clientY <= 12) {
      exitShown = true;
      enqueueIntent({
        type: "ACTION",
        source: "conversion",
        payload: { overlays: { exitCta: true } }
      });
      runPipeline();
    }
  });

  document.addEventListener("click", function (e) {
    const target = e.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest(".soft-cta__close, .exit-cta__close")) {
      const soft = target.closest(".soft-cta");
      const exit = target.closest(".exit-cta");
      if (soft) {
        markDismissed("soft");
        enqueueIntent({ type: "ACTION", source: "conversion", payload: { overlays: { softCta: false } } });
      }
      if (exit) {
        markDismissed("exit");
        enqueueIntent({ type: "ACTION", source: "conversion", payload: { overlays: { exitCta: false } } });
      }
      runPipeline();
    }
    if (target.closest(".soft-cta__action, .exit-cta__action")) {
      scrollToCta();
    }
  });
}
