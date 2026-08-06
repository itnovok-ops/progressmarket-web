/**
 * LifeOS Conversion Boost Layer — behavioral engagement without business-logic changes.
 */

const STYLE_ID = "lifeos-conversion-boost-styles";
const MODAL_ID = "lifeos-video-modal";
const INIT_MARKER = "__LIFEOS_CONVERSION_BOOST_ACTIVE__";

/** @type {Element | null} */
let conversionVideoSection = null;

/** @type {((event: Event) => void) | null} */
let conversionVideoTrigger = null;

/**
 * Disable conversion-boost video modal triggers (ultra patch / video authority).
 */
function disableConversionVideo() {
  if (conversionVideoSection && conversionVideoTrigger) {
    conversionVideoSection.removeEventListener("click", conversionVideoTrigger);
    conversionVideoSection = null;
    conversionVideoTrigger = null;
  }
  const modal = document.getElementById(MODAL_ID);
  if (modal) {
    modal.hidden = true;
    modal.setAttribute("data-lifeos-video-disabled", "true");
  }
}

window.__LIFEOS_DISABLE_CONVERSION_VIDEO__ = disableConversionVideo;

/**
 * @param {string} css
 */
function injectStyles(css) {
  let node = document.getElementById(STYLE_ID);
  if (!node) {
    node = document.createElement("style");
    node.id = STYLE_ID;
    document.head.appendChild(node);
  }
  node.textContent = css;
}

function initGlobals() {
  window.__LIFEOS_CONVERSION__ = window.__LIFEOS_CONVERSION__ || {
    video: { seen: false, clicked: false, watchTime: 0 }
  };
  window.__LIFEOS_CONVERSION__.video = window.__LIFEOS_CONVERSION__.video || {
    seen: false,
    clicked: false,
    watchTime: 0
  };

  window.__LIFEOS_INTENT = window.__LIFEOS_INTENT || { level: "LOW", score: 0 };
  window.__LIFEOS_HEATMAP = window.__LIFEOS_HEATMAP || {
    heroAttention: 0,
    videoAttention: 0,
    ctaAttention: 0,
    formAttention: 0
  };
}

function buildStylesheet() {
  return (
    ".lifeos-video-modal{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center}" +
    ".lifeos-video-modal[hidden]{display:none!important}" +
    ".lifeos-video-modal__backdrop{position:absolute;inset:0;background:rgba(5,8,14,.92);backdrop-filter:blur(8px)}" +
    ".lifeos-video-modal__panel{position:relative;z-index:1;width:min(96vw,1100px);aspect-ratio:16/9;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 80px rgba(0,0,0,.55)}" +
    ".lifeos-video-modal__video{width:100%;height:100%;object-fit:contain;background:#0b0f17;display:block}" +
    ".lifeos-video-modal__close{position:absolute;top:12px;right:12px;z-index:2;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;font-size:22px;line-height:1;cursor:pointer}" +
    "@keyframes conversionBoostPulseGentle{0%,100%{transform:scale(1);box-shadow:0 0 24px rgba(255,255,255,.3)}50%{transform:scale(1.05);box-shadow:0 0 36px rgba(255,255,255,.45)}}" +
    "@keyframes conversionBoostPulseRing{0%{box-shadow:0 0 0 0 rgba(255,255,255,.45)}70%{box-shadow:0 0 0 22px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}" +
    ".conversion-boost-pulse-gentle{animation:conversionBoostPulseGentle 1.8s ease-in-out infinite!important}" +
    ".conversion-boost-pulse-ring{animation:conversionBoostPulseRing 2.2s ease-out infinite!important}" +
    ".conversion-boost-cta-high{transform:scale(1.05)!important;box-shadow:0 0 28px rgba(79,140,255,.45)!important;filter:brightness(1.08)!important;transition:all .25s ease!important}" +
    ".conversion-boost-cta-focus{animation:conversionBoostCtaEnter .6s ease forwards!important}" +
    "@keyframes conversionBoostCtaEnter{from{opacity:.7;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1.06)}}" +
    ".conversion-boost-input-highlight{outline:none!important;border-color:rgba(79,140,255,.75)!important;box-shadow:0 0 0 3px rgba(79,140,255,.25)!important}" +
    ".conversion-boost-form-glow{box-shadow:0 0 0 1px rgba(79,140,255,.2),0 0 32px rgba(79,140,255,.18)!important;transition:box-shadow .3s ease!important}"
  );
}

/**
 * @param {Element | null} root
 */
function setupVideoModal(root) {
  if (window.__LIFEOS_VIDEO_AUTHORITY_LOCKED__ || window.__LIFEOS_VIDEO_LOCKED__) {
    disableConversionVideo();
    return;
  }

  const mount = root || document.getElementById("app");
  const sourceVideo = mount ? mount.querySelector("#heroVideo") : null;
  if (!sourceVideo) {
    return;
  }

  let modal = document.getElementById(MODAL_ID);
  if (!modal) {
    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "lifeos-video-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Видео о системе");
    modal.innerHTML =
      '<div class="lifeos-video-modal__backdrop" data-lifeos-modal-close></div>' +
      '<div class="lifeos-video-modal__panel">' +
      '<button type="button" class="lifeos-video-modal__close" data-lifeos-modal-close aria-label="Закрыть">×</button>' +
      '<video class="lifeos-video-modal__video" controls playsinline></video>' +
      "</div>";
    document.body.appendChild(modal);
  }

  const modalVideo = modal.querySelector("video");
  let scrollLockY = 0;

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, scrollLockY);
    if (modalVideo) {
      modalVideo.pause();
    }
  }

  function openModal() {
    if (window.__LIFEOS_VIDEO_AUTHORITY_LOCKED__ || window.__LIFEOS_VIDEO_LOCKED__) {
      return;
    }
    if (!modalVideo) {
      return;
    }
    const src = sourceVideo.currentSrc || sourceVideo.querySelector("source")?.getAttribute("src") || "";
    if (src && modalVideo.getAttribute("src") !== src) {
      modalVideo.setAttribute("src", src);
    }
    modalVideo.currentTime = sourceVideo.currentTime || 0;
    modalVideo.muted = false;
    scrollLockY = window.scrollY || 0;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = "-" + scrollLockY + "px";
    document.body.style.width = "100%";
    modal.hidden = false;
    modalVideo.focus();
    modalVideo.play().catch(function () {
      /* silent */
    });

    window.__LIFEOS_CONVERSION__.video.clicked = true;
    window.__LIFEOS_CONVERSION__.video.seen = true;
    refreshConversionReport();
    applyCTABoost(root);
  }

  function onVideoTrigger(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (
      target.closest("#videoPlayBtn, .video-play-overlay, .play-button, .video-container, #heroVideo")
    ) {
      openModal();
    }
  }

  const videoSection = mount.querySelector("section#video, section.section--video");
  if (videoSection) {
    videoSection.addEventListener("click", onVideoTrigger);
    conversionVideoSection = videoSection;
    conversionVideoTrigger = onVideoTrigger;
    window.__LIFEOS_DISABLE_CONVERSION_VIDEO__ = disableConversionVideo;
  }

  modal.querySelectorAll("[data-lifeos-modal-close]").forEach(function (node) {
    node.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });

  let watchAccumulator = 0;
  let lastWatchTs = 0;

  function onWatchTick() {
    const now = Date.now();
    if (lastWatchTs > 0 && !sourceVideo.paused) {
      watchAccumulator += (now - lastWatchTs) / 1000;
      window.__LIFEOS_CONVERSION__.video.watchTime = Math.round(watchAccumulator);
    }
    if (modalVideo && !modal.hidden && !modalVideo.paused) {
      watchAccumulator += 0.25;
      window.__LIFEOS_CONVERSION__.video.watchTime = Math.round(watchAccumulator);
    }
    lastWatchTs = now;
    refreshConversionReport();
  }

  sourceVideo.addEventListener("play", function () {
    lastWatchTs = Date.now();
  });
  if (modalVideo) {
    modalVideo.addEventListener("play", function () {
      lastWatchTs = Date.now();
    });
  }
  window.setInterval(onWatchTick, 250);
}

/**
 * @param {Element | null} root
 */
function setupVideoAttention(root) {
  if (window.__LIFEOS_VIDEO_LOCKED__ || window.__LIFEOS_VIDEO_AUTHORITY_LOCKED__) {
    return;
  }

  const mount = root || document.getElementById("app");
  const section = mount ? mount.querySelector("section#video, section.section--video") : null;
  const playButton = mount ? mount.querySelector(".play-button") : null;
  if (!section || !playButton) {
    return;
  }

  let inViewSince = 0;
  let gentleTimer = 0;
  let ringTimer = 0;
  let scrolledPast = false;

  function clearAttentionTimers() {
    window.clearTimeout(gentleTimer);
    window.clearTimeout(ringTimer);
  }

  function onVideoClicked() {
    clearAttentionTimers();
    playButton.classList.remove("conversion-boost-pulse-gentle", "conversion-boost-pulse-ring");
  }

  section.addEventListener(
    "click",
    function () {
      onVideoClicked();
    },
    true
  );

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          window.__LIFEOS_CONVERSION__.video.seen = true;
          if (!inViewSince) {
            inViewSince = Date.now();
          }
          clearAttentionTimers();
          if (!window.__LIFEOS_CONVERSION__.video.clicked) {
            gentleTimer = window.setTimeout(function () {
              if (!window.__LIFEOS_CONVERSION__.video.clicked) {
                playButton.classList.add("conversion-boost-pulse-gentle");
              }
            }, 4500 + Math.floor(Math.random() * 1500));

            ringTimer = window.setTimeout(function () {
              if (!window.__LIFEOS_CONVERSION__.video.clicked) {
                playButton.classList.add("conversion-boost-pulse-ring");
              }
            }, 10000);
          }
        } else {
          if (inViewSince && !window.__LIFEOS_CONVERSION__.video.clicked && !scrolledPast) {
            scrolledPast = true;
            playButton.classList.add("conversion-boost-pulse-gentle");
          }
          inViewSince = 0;
          clearAttentionTimers();
        }
      });
    },
    { threshold: 0.35 }
  );

  observer.observe(section);
}

function setupScrollIntent() {
  let lastY = window.scrollY || 0;
  let lastTs = Date.now();
  let pauseStart = Date.now();
  let intentScore = 20;

  function evaluateIntent() {
    let level = "LOW";
    if (intentScore >= 70) {
      level = "HIGH";
    } else if (intentScore >= 40) {
      level = "MEDIUM";
    }
    window.__LIFEOS_INTENT = { level: level, score: Math.min(100, Math.round(intentScore)) };
    refreshConversionReport();
    applyCTABoost(document.getElementById("app"));
  }

  window.addEventListener(
    "scroll",
    function () {
      const now = Date.now();
      const y = window.scrollY || 0;
      const delta = Math.abs(y - lastY);
      const elapsed = Math.max(now - lastTs, 1);
      const velocity = delta / elapsed;

      if (velocity > 1.2) {
        intentScore = Math.max(10, intentScore - 6);
        pauseStart = now;
      } else if (velocity > 0.25) {
        intentScore = Math.min(100, intentScore + 2);
        pauseStart = now;
      }

      if (now - pauseStart > 2500) {
        intentScore = Math.min(100, intentScore + 12);
      }

      lastY = y;
      lastTs = now;
      evaluateIntent();
    },
    { passive: true }
  );

  window.setInterval(function () {
    if (Date.now() - pauseStart > 2500) {
      intentScore = Math.min(100, intentScore + 4);
      evaluateIntent();
    }
  }, 1000);

  evaluateIntent();
}

/**
 * @param {Element | null} root
 */
function applyCTABoost(root) {
  const mount = root || document.getElementById("app");
  if (!mount) {
    return;
  }

  const intentHigh = window.__LIFEOS_INTENT?.level === "HIGH";
  const videoClicked = !!window.__LIFEOS_CONVERSION__?.video?.clicked;
  const ctas = mount.querySelectorAll(".hero-actions .btn, .site-header .btn-primary, #cta .btn-primary");

  ctas.forEach(function (cta) {
    cta.classList.toggle("conversion-boost-cta-high", intentHigh || videoClicked);
    if (videoClicked) {
      cta.classList.add("conversion-boost-cta-focus");
    }
  });
}

/**
 * @param {Element | null} root
 */
function setupFormBoost(root) {
  const mount = root || document.getElementById("app");
  const form = mount ? mount.querySelector("#lead-form, form[data-lead-form]") : null;
  if (!form) {
    return;
  }

  const firstInput = form.querySelector("input, textarea");
  let hesitateTimer = 0;
  let engaged = false;

  const sectionObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          window.clearTimeout(hesitateTimer);
          hesitateTimer = window.setTimeout(function () {
            if (!engaged && firstInput) {
              firstInput.classList.add("conversion-boost-input-highlight");
            }
          }, 3500 + Math.floor(Math.random() * 1500));
        } else {
          window.clearTimeout(hesitateTimer);
        }
      });
    },
    { threshold: 0.4 }
  );

  const ctaSection = mount.querySelector("section#cta, section.section--cta");
  if (ctaSection) {
    sectionObserver.observe(ctaSection);
  }

  form.addEventListener("mouseleave", function () {
    form.classList.add("conversion-boost-form-glow");
  });
  form.addEventListener("mouseenter", function () {
    form.classList.remove("conversion-boost-form-glow");
  });

  form.addEventListener(
    "focusin",
    function () {
      engaged = true;
      window.__LIFEOS_CONVERSION__ = window.__LIFEOS_CONVERSION__ || {};
      window.__LIFEOS_CONVERSION__.formHighIntent = true;
      if (firstInput) {
        firstInput.classList.remove("conversion-boost-input-highlight");
      }
      window.__LIFEOS_INTENT = { level: "HIGH", score: Math.max(window.__LIFEOS_INTENT?.score || 0, 85) };
      refreshConversionReport();
      applyCTABoost(root);
    },
    true
  );
}

/**
 * @param {Element | null} root
 */
function setupAttentionHeatmap(root) {
  const mount = root || document.getElementById("app");
  if (!mount) {
    return;
  }

  const zones = [
    { key: "heroAttention", selector: "section.hero" },
    { key: "videoAttention", selector: "section#video, section.section--video" },
    { key: "ctaAttention", selector: "section#cta, section.section--cta" },
    { key: "formAttention", selector: "#lead-form, form[data-lead-form]" }
  ];

  const visible = new Set();

  zones.forEach(function (zone) {
    const node = mount.querySelector(zone.selector);
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            visible.add(zone.key);
          } else {
            visible.delete(zone.key);
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
  });

  window.setInterval(function () {
    zones.forEach(function (zone) {
      if (visible.has(zone.key)) {
        const current = window.__LIFEOS_HEATMAP[zone.key] || 0;
        window.__LIFEOS_HEATMAP[zone.key] = Math.min(100, current + 2);
      }
    });
    refreshConversionReport();
  }, 500);
}

function refreshConversionReport() {
  const intent = window.__LIFEOS_INTENT || { level: "LOW", score: 0 };
  const video = window.__LIFEOS_CONVERSION__?.video || { seen: false, clicked: false, watchTime: 0 };
  const heat = window.__LIFEOS_HEATMAP || {
    heroAttention: 0,
    videoAttention: 0,
    ctaAttention: 0,
    formAttention: 0
  };

  let videoProb = 15;
  if (video.seen) {
    videoProb += 20;
  }
  if (video.clicked) {
    videoProb += 35;
  }
  if (video.watchTime > 5) {
    videoProb += 15;
  }
  if (heat.videoAttention > 40) {
    videoProb += 10;
  }
  videoProb = Math.min(95, videoProb);

  let ctaProb = 10 + Math.round(intent.score * 0.45);
  if (video.clicked) {
    ctaProb += 20;
  }
  if (heat.ctaAttention > 30) {
    ctaProb += 15;
  }
  if (window.__LIFEOS_CONVERSION__?.formHighIntent) {
    ctaProb += 25;
  }
  ctaProb = Math.min(95, ctaProb);

  let dropRisk = "LOW";
  if (intent.level === "LOW" && !video.clicked && heat.formAttention < 20) {
    dropRisk = "HIGH";
  } else if (intent.level !== "HIGH" && !video.clicked) {
    dropRisk = "MEDIUM";
  }

  let mainLeak = "None detected";
  if (!video.clicked && heat.videoAttention < 25) {
    mainLeak = "Low video engagement — users skip demo block";
  } else if (intent.level === "LOW" && heat.ctaAttention < 20) {
    mainLeak = "Fast scroll — CTA not receiving attention";
  } else if (heat.formAttention < 15 && heat.ctaAttention > 40) {
    mainLeak = "CTA seen but form section under-engaged";
  }

  window.__LIFEOS_CONVERSION_REPORT = {
    intentLevel: intent.level,
    videoConversionProbability: videoProb,
    ctaConversionProbability: ctaProb,
    dropRisk: dropRisk,
    mainLeak: mainLeak
  };
}

/**
 * @param {Element | null} [root]
 * @returns {object}
 */
export function runConversionBoost(root) {
  if (window.__BOOT_STATE__ !== "PASS") {
    console.warn("[CONVERSION BOOST] Blocked — boot not PASS");
    return { active: false };
  }

  initGlobals();
  refreshConversionReport();

  if (!window[INIT_MARKER]) {
    window[INIT_MARKER] = true;
    if (window.__LIFEOS_PRODUCTION_MODE__ !== true) {
      window.setInterval(refreshConversionReport, 3000);
    }
  }

  if (typeof window.__LIFEOS_DISABLE_CONVERSION_VIDEO__ === "function") {
    window.__LIFEOS_DISABLE_CONVERSION_VIDEO__();
  }
  window.__LIFEOS_CONVERSION_BOOST_VIDEO_ACTIVE__ = false;

  console.info("CONVERSION BOOST READY — analytics only (UI mutation firewall)");
  return {
    active: true,
    mode: "analytics_only",
    report: window.__LIFEOS_CONVERSION_REPORT
  };
}

export function installConversionBoostHook() {
  window.__RUN_CONVERSION_BOOST__ = function () {
    if (window.__LIFEOS_VIDEO_LOCKED__ || window.__LIFEOS_VIDEO_AUTHORITY_LOCKED__) {
      if (typeof window.__LIFEOS_DISABLE_CONVERSION_VIDEO__ === "function") {
        window.__LIFEOS_DISABLE_CONVERSION_VIDEO__();
      }
      window.__LIFEOS_CONVERSION_BOOST_VIDEO_ACTIVE__ = false;
      return {
        active: false,
        video: "disabled",
        report: window.__LIFEOS_CONVERSION_REPORT__
      };
    }
    return runConversionBoost(document.getElementById("app"));
  };
}
