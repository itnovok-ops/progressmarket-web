/**
 * Hero video — native HTML5 behavior (sound, controls, fullscreen).
 * Does not use renderEngine; renderEngine only controls visibility/play/pause.
 */

const HERO_VIDEO_SRC = "/assets/video/hero-wb-fbs.mp4";

function scheduleVideoReport(reason) {
  if (typeof window.scheduleSystemReport === "function") {
    window.scheduleSystemReport(reason);
    return;
  }
  if (window.__LIFEOS_SAFE_BOOT_MODE__) {
    return;
  }
  import("../../lifeos/core/reports/systemReportGenerator.js")
    .then(function (mod) {
      if (mod && typeof mod.scheduleSystemReport === "function") {
        mod.scheduleSystemReport(reason);
      }
    })
    .catch(function () {});
}

function resolveHeroVideoSrc() {
  if (typeof window !== "undefined" && window.location) {
    return new URL(HERO_VIDEO_SRC, window.location.origin).href;
  }
  return HERO_VIDEO_SRC;
}

function ensureHeroVideoSource(video) {
  const expected = resolveHeroVideoSrc();
  const source = video.querySelector("source");
  if (source && source.getAttribute("src") !== expected) {
    source.setAttribute("src", expected);
    video.load();
  }
}

function requestVideoFullscreen(video) {
  if (!video) {
    return;
  }
  if (typeof video.requestFullscreen === "function") {
    video.requestFullscreen().catch(function () {});
    return;
  }
  if (typeof video.webkitRequestFullscreen === "function") {
    video.webkitRequestFullscreen();
  }
}

/**
 * Bind native video behavior once. Safe to call multiple times — binds only once per node.
 */
export function safeInitVideo() {
  const video = document.querySelector("#heroVideo");
  if (!video) {
    return { ok: false, reason: "missing_heroVideo" };
  }

  if (video.dataset.heroPlayerBound === "true" || window.__HERO_VIDEO_PLAYER_BOUND__ === true) {
    return { ok: true, reused: true };
  }

  ensureHeroVideoSource(video);

  video.controls = true;
  video.autoplay = true;
  video.playsInline = false;
  video.removeAttribute("playsinline");

  document.addEventListener(
    "click",
    function () {
      const v = document.querySelector("#heroVideo");
      if (v) {
        v.muted = false;
      }
    },
    { once: true }
  );

  video.addEventListener("click", function onVideoClick() {
    const v = document.querySelector("#heroVideo");
    if (v) {
      requestVideoFullscreen(v);
    }
  });

  if (video.paused) {
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
  }

  video.dataset.heroPlayerBound = "true";
  window.__HERO_VIDEO_PLAYER_BOUND__ = true;

  scheduleVideoReport("video_init");

  return { ok: true, bound: true };
}

/** @deprecated Use safeInitVideo */
export function initHeroVideoPlayer() {
  return safeInitVideo();
}

if (typeof window !== "undefined") {
  window.safeInitVideo = safeInitVideo;
  window.initHeroVideoPlayer = initHeroVideoPlayer;
  window.heroVideoPlayer = {
    init: safeInitVideo,
    safeInitVideo: safeInitVideo
  };
}
