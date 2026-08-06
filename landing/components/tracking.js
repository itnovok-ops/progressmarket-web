import { assertBootPass } from "../runtime/productionLock.js";
import { logUlsEvent, bumpUlsMetric } from "../uls/observability.js";

const YM_COUNTER_ID = 109588612;

const firedGoals = new Set();

export function reachYmGoal(goalName, params) {
  if (firedGoals.has(goalName) && (goalName === "view_hero" || goalName.startsWith("scroll_"))) {
    return;
  }
  if (goalName === "view_hero" || goalName.startsWith("scroll_")) {
    firedGoals.add(goalName);
  }

  if (params === undefined) {
    params = {};
  }
  try {
    if (typeof window.ym === "function") {
      window.ym(YM_COUNTER_ID, "reachGoal", goalName, params);
    }
  } catch (e) {
    console.warn("Yandex goal error:", goalName, e);
  }
}

export function initMetrika() {
  assertBootPass();
  if (!window.__pmYmCounterInited) {
    window.__pmYmCounterInited = true;
    (function (m, e, t, r, i, k, a) {
      m[i] =
        m[i] ||
        function () {
          (m[i].a = m[i].a || []).push(arguments);
        };
      m[i].l = 1 * new Date();
      for (var j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) {
          return;
        }
      }
      k = e.createElement(t);
      a = e.getElementsByTagName(t)[0];
      k.async = 1;
      k.src = r;
      a.parentNode.insertBefore(k, a);
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

    window.ym(YM_COUNTER_ID, "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true
    });
  }

  window.reachYmGoal = reachYmGoal;
}

export function initTracking(mount) {
  assertBootPass();
  const root = mount || document.getElementById("app");
  if (!root) {
    console.warn("[ULS] tracking mount not found");
    return;
  }

  initHeroViewTracking(root);
  initScrollDepthTracking();
  initCtaClickTracking(root);
  initFormTracking(root);
}

function initHeroViewTracking(mount) {
  const hero = mount.querySelector('[data-track-section="hero"]');
  if (!hero) {
    return;
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reachYmGoal("view_hero");
          logUlsEvent("page_view", { section: "hero_visible" });
          observer.disconnect();
        }
      });
    },
    { threshold: 0.35 }
  );

  observer.observe(hero);
}

function initScrollDepthTracking() {
  let scroll50 = false;
  let scroll90 = false;

  function onScroll() {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop;
    const maxScroll = doc.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) {
      return;
    }
    const ratio = scrollTop / maxScroll;

    if (!scroll50 && ratio >= 0.5) {
      scroll50 = true;
      reachYmGoal("scroll_50");
      logUlsEvent("scroll_depth", { ratio: 0.5 });
    }
    if (!scroll90 && ratio >= 0.9) {
      scroll90 = true;
      reachYmGoal("scroll_90");
      logUlsEvent("scroll_depth", { ratio: 0.9 });
    }
    if (scroll50 && scroll90) {
      window.removeEventListener("scroll", onScroll, { passive: true });
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function initCtaClickTracking(mount) {
  mount.addEventListener("click", function (event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const trackEl = target.closest("[data-track], [data-uls-cta]");
    if (!trackEl) {
      return;
    }

    const trackId = trackEl.getAttribute("data-track") || "click_cta";
    bumpUlsMetric("ctaClicks");
    logUlsEvent("click_cta", {
      trackId: trackId,
      href: trackEl.getAttribute("href") || "",
      label: (trackEl.textContent || "").trim()
    });
    reachYmGoal(trackId === "click_cta" ? "click_cta_primary" : trackId);
  });
}

function initFormTracking(mount) {
  const form = mount.querySelector("[data-lead-form]");
  if (!form) {
    return;
  }

  let formStarted = false;
  form.addEventListener(
    "focusin",
    function () {
      if (!formStarted) {
        formStarted = true;
        reachYmGoal("form_start");
        logUlsEvent("form_start", {});
      }
    },
    { once: true }
  );
}

export function trackFormSubmitSuccess() {
  reachYmGoal("form_submit_success");
}
