import { linkEvent } from "./sessionLinker.js";
import { trackAndSend } from "./growthAPI.js";
import * as pipeline from "./conversionPipeline.js";
import { ingestFunnelEvent } from "./funnelEngine.js";
import { ingestIntentEvent } from "./intentEngineClient.js";
import { ingestLandingEvent } from "./landingStatsEngine.js";
import {
  publishGrowthReport,
  recordEventStored,
  recordFunnelCalculated,
  recordSessionTracked,
  recordConversion
} from "./growthReport.js";

const CTA_KEYWORDS = ["расчёт", "получить", "заявка", "узнать", "система"];

/**
 * @param {string} name
 * @param {Record<string, unknown>} [metadata]
 */
function emit(name, metadata) {
  try {
    const event = linkEvent(name, metadata);

    ingestFunnelEvent(name);
    ingestIntentEvent(name, metadata);
    ingestLandingEvent(name);
    pipeline.ingest(name, metadata);

    recordSessionTracked();
    recordEventStored();
    recordFunnelCalculated();

    if (name === "form_submit") {
      recordConversion();
    }

    trackAndSend(event);
    publishGrowthReport();
  } catch (_error) {
    /* silent — never break landing */
  }
}

/**
 * @param {ParentNode} [root]
 */
export function startEventCollector(root) {
  const scope = root || document.getElementById("app") || document;

  emit("visit", { referrer: document.referrer || "" });

  let lastScrollY = window.scrollY || 0;
  let lastScrollTs = Date.now();
  let scrollPauseTimer = 0;
  const scrollMarks = new Set();

  window.addEventListener(
    "scroll",
    function () {
      try {
        const doc = document.documentElement;
        const scrollTop = window.scrollY || doc.scrollTop || 0;
        const scrollHeight = Math.max(doc.scrollHeight - window.innerHeight, 1);
        const ratio = scrollTop / scrollHeight;
        const now = Date.now();
        const velocity = Math.abs(scrollTop - lastScrollY) / Math.max(now - lastScrollTs, 1);
        const fastScroll = velocity > 1.2;

        [0.25, 0.5, 0.75, 1].forEach(function (mark) {
          if (ratio >= mark && !scrollMarks.has(mark)) {
            scrollMarks.add(mark);
            emit("scroll", {
              depth: ratio,
              ratio: mark,
              fast_scroll: fastScroll
            });
          }
        });

        if (scrollPauseTimer) {
          window.clearTimeout(scrollPauseTimer);
        }
        scrollPauseTimer = window.setTimeout(function () {
          emit("scroll", {
            depth: ratio,
            pause_ms: Date.now() - lastScrollTs,
            fast_scroll: false
          });
        }, 2500);

        lastScrollY = scrollTop;
        lastScrollTs = now;
      } catch (_error) {
        /* silent */
      }
    },
    { passive: true }
  );

  scope.querySelectorAll("a, button, input[type='submit']").forEach(function (node) {
    const label = (node.textContent || node.value || "").trim().toLowerCase();
    const isCta = CTA_KEYWORDS.some(function (kw) {
      return label.includes(kw);
    });
    if (!isCta && !node.classList.contains("btn-primary")) {
      return;
    }

    node.addEventListener(
      "click",
      function () {
        emit("cta_click", {
          label: label,
          href: node.getAttribute("href") || "",
          tag: node.tagName.toLowerCase()
        });
      },
      { passive: true }
    );
  });

  const form = scope.querySelector("#lead-form, form[data-lead-form]");
  if (form) {
    let formStarted = false;

    form.addEventListener(
      "focusin",
      function (event) {
        const target = event.target;
        if (!formStarted && target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
          formStarted = true;
          emit("form_start", { field: target.name || target.id || "unknown" });
        }
      },
      true
    );

    form.addEventListener(
      "submit",
      function () {
        emit("form_submit", { form: "lead-form" });
      },
      true
    );
  }

  const video = scope.querySelector("#heroVideo");
  const videoSection = scope.querySelector("section#video, section.section--video");
  const playOverlay = scope.querySelector("#videoPlayBtn, .video-play-overlay");

  if (videoSection) {
    let videoViewed = false;
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !videoViewed) {
            videoViewed = true;
            emit("video_view", { visible: true });
          }
        });
      },
      { threshold: 0.35 }
    );
    observer.observe(videoSection);
  }

  if (video && !window.__LIFEOS_VIDEO_LOCKED__) {
    video.addEventListener(
      "play",
      function () {
        emit("video_play", { source: "heroVideo" });
      },
      { passive: true }
    );
  }

  if (playOverlay && !window.__LIFEOS_VIDEO_LOCKED__) {
    playOverlay.addEventListener(
      "click",
      function () {
        emit("video_click", { source: "play_overlay" });
      },
      { passive: true }
    );
  }

  document.addEventListener(
    "mouseout",
    function (event) {
      try {
        if (!event.relatedTarget && event.clientY <= 0) {
          emit("exit_intent", { type: "mouseout_top" });
        }
      } catch (_error) {
        /* silent */
      }
    },
    { passive: true }
  );
}
