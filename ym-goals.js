(function () {
  const YM_COUNTER_ID = 109588612;

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

  function reachYmGoal(goalName, params) {
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

  window.reachYmGoal = reachYmGoal;
  window.PM_YM_COUNTER_ID = YM_COUNTER_ID;

  function normalizeLinkText(link) {
    return String(link.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function resolveCtaGoal(link) {
    const dataCta = link.getAttribute("data-ym-cta");
    if (dataCta === "consultation") {
      return "click_consultation";
    }
    if (dataCta === "price") {
      return "click_price";
    }
    if (dataCta === "order") {
      return "click_order";
    }

    const href = link.getAttribute("href") || "";
    const text = normalizeLinkText(link);

    if (href === "#form" || href === "index.html#form") {
      if (text.indexOf("каталог") !== -1) {
        return "click_consultation";
      }
      if (
        text.indexOf("расчёт") !== -1 ||
        link.classList.contains("pricing-cta") ||
        link.classList.contains("nav-btn-cta")
      ) {
        return "click_order";
      }
    }

    if (href === "#pricing" && (text.indexOf("Рассчитать") !== -1 || text.indexOf("Стоимость") !== -1)) {
      return "click_price";
    }

    return null;
  }

  function handleYmClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const link = target.closest("a");
    if (!link) {
      return;
    }

    const goal = resolveCtaGoal(link);
    if (goal) {
      reachYmGoal(goal);
    }
  }

  function initYmClickGoals() {
    document.addEventListener("click", handleYmClick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initYmClickGoals);
  } else {
    initYmClickGoals();
  }
})();
