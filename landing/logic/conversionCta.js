/**
 * V1.1 conversion CTAs — mobile sticky bar + one mid-page soft CTA.
 * Exit-intent is intentionally NOT wired here (out of scope for V1.1).
 */

import { logUlsEvent } from "../uls/observability.js";

const MOBILE_MQ = "(max-width: 768px)";
const SOFT_CTA_SESSION_KEY = "pm_soft_cta_shown";
const SOFT_CTA_SCROLL_RATIO = 0.35;

function isMobile() {
  return window.matchMedia(MOBILE_MQ).matches;
}

function initStickyCta() {
  const bar = document.getElementById("sticky-cta");
  const ctaSection = document.getElementById("cta");
  if (!bar) {
    return;
  }

  let ctaInView = false;
  if (ctaSection && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          ctaInView = entry.isIntersecting;
          sync();
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(ctaSection);
  }

  function sync() {
    if (!isMobile()) {
      bar.classList.remove("is-visible");
      bar.setAttribute("aria-hidden", "true");
      document.body.classList.remove("has-sticky-cta-visible");
      return;
    }
    const pastHero = window.scrollY > window.innerHeight * 0.6;
    const show = pastHero && !ctaInView;
    bar.classList.toggle("is-visible", show);
    bar.setAttribute("aria-hidden", show ? "false" : "true");
    document.body.classList.toggle("has-sticky-cta-visible", show);
  }

  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync, { passive: true });
  sync();
}

function initSoftCta() {
  const modal = document.getElementById("soft-cta");
  if (!modal) {
    return;
  }

  let shown = false;
  try {
    shown = window.sessionStorage.getItem(SOFT_CTA_SESSION_KEY) === "1";
  } catch (e) {
    shown = false;
  }
  if (shown) {
    return;
  }

  function markShown() {
    shown = true;
    try {
      window.sessionStorage.setItem(SOFT_CTA_SESSION_KEY, "1");
    } catch (e) {
      /* sessionStorage unavailable — non-fatal, modal just may reappear once more */
    }
  }

  function openModal() {
    if (shown) {
      return;
    }
    markShown();
    modal.hidden = false;
    logUlsEvent("soft_cta_shown", {});
    window.removeEventListener("scroll", onScroll, { passive: true });
  }

  function closeModal() {
    modal.hidden = true;
  }

  function onScroll() {
    const doc = document.documentElement;
    const maxScroll = doc.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) {
      return;
    }
    if (window.scrollY / maxScroll >= SOFT_CTA_SCROLL_RATIO) {
      openModal();
    }
  }

  modal.querySelectorAll("[data-conversion-soft-close]").forEach(function (el) {
    el.addEventListener("click", function (event) {
      if (el.tagName === "A") {
        closeModal();
        return;
      }
      event.preventDefault();
      closeModal();
    });
  });

  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });

  window.addEventListener("scroll", onScroll, { passive: true });
}

export function initConversionCta() {
  initStickyCta();
  initSoftCta();
}
