/**
 * ULS Logic Layer — hero video playback + observability.
 */

import { logUlsEvent, bumpUlsMetric } from "../uls/observability.js";

function isTouchDevice() {
  return (
    "ontouchstart" in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
  );
}

const HERO_VIDEO_PATHS_DESKTOP = [
  "/landing/assets/video/hero-wb-fbs.mp4",
  "/assets/video/hero-wb-fbs.mp4",
  "../landing/assets/video/hero-wb-fbs.mp4",
  "../assets/video/hero-wb-fbs.mp4"
];

const HERO_VIDEO_PATHS_MOBILE = [
  "/landing/assets/video/hero-wb-fbs-mobile.mp4",
  "/assets/video/hero-wb-fbs-mobile.mp4",
  "/landing/assets/video/hero-wb-fbs.mp4",
  "/assets/video/hero-wb-fbs.mp4"
];

function resolveVideoHref(path) {
  return new URL(path, window.location.href).href;
}

function pickWorkingVideoPath(paths) {
  let index = 0;

  function tryPath(i) {
    if (i >= paths.length) {
      return Promise.resolve({ href: resolveVideoHref(paths[0]), index: 0 });
    }
    const href = resolveVideoHref(paths[i]);
    return fetch(href, { method: "HEAD", cache: "no-store" })
      .then(function (res) {
        if (res.ok) {
          index = i;
          return { href: href, index: index };
        }
        return tryPath(i + 1);
      })
      .catch(function () {
        return tryPath(i + 1);
      });
  }

  return tryPath(0);
}

function getHeroVideoPaths() {
  if (isTouchDevice() || window.innerWidth <= 768) {
    return HERO_VIDEO_PATHS_MOBILE;
  }
  return HERO_VIDEO_PATHS_DESKTOP;
}

function bindUserGesture(el, handler) {
  if (!el) {
    return;
  }
  el.addEventListener("click", handler);
}

export function initHeroVideoController() {
  const video = document.querySelector("#heroVideo");
  const playBtn = document.querySelector("[data-video-play]");
  const unmuteBtn = document.querySelector("[data-video-unmute]");
  if (!video || video.dataset.heroReady === "true") {
    return;
  }
  video.dataset.heroReady = "true";

  let pathIndex = 0;
  let videoPlayLogged = false;
  const touchDevice = isTouchDevice();
  const HERO_VIDEO_PATHS = getHeroVideoPaths();

  video.controls = true;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "true");

  function logVideoPlay() {
    if (videoPlayLogged) {
      return;
    }
    videoPlayLogged = true;
    logUlsEvent("video_play", {});
    bumpUlsMetric("videoPlays");
  }

  function hidePlayBtn() {
    if (playBtn) {
      playBtn.hidden = true;
    }
  }

  function showPlayBtn() {
    if (playBtn && video.paused) {
      playBtn.hidden = false;
    }
  }

  function showUnmuteHint() {
    if (unmuteBtn && video.muted) {
      unmuteBtn.hidden = false;
    }
  }

  function hideUnmuteHint() {
    if (unmuteBtn) {
      unmuteBtn.hidden = true;
    }
  }

  function setVideoHref(href, shouldLoad) {
    if (video.src !== href) {
      video.src = href;
    }
    if (shouldLoad) {
      video.load();
    }
  }

  function tryNextSource() {
    pathIndex += 1;
    if (pathIndex >= HERO_VIDEO_PATHS.length) {
      console.warn("[ULS] hero video not found");
      showPlayBtn();
      return;
    }
    setVideoHref(resolveVideoHref(HERO_VIDEO_PATHS[pathIndex]), true);
  }

  function startPlayback() {
    hidePlayBtn();
    video.muted = true;
    if (video.readyState < 2) {
      video.load();
    }
    const playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      return playAttempt
        .then(function () {
          logVideoPlay();
          showUnmuteHint();
        })
        .catch(function (error) {
          console.warn("[ULS] video play blocked:", error);
          showPlayBtn();
        });
    }
    logVideoPlay();
    showUnmuteHint();
    return Promise.resolve();
  }

  function enableSound() {
    video.muted = false;
    video.defaultMuted = false;
    video.volume = 1;
    hideUnmuteHint();
    return startPlayback();
  }

  video.addEventListener("error", tryNextSource);
  video.addEventListener("playing", function () {
    video.removeAttribute("poster");
    video.classList.add("is-playing");
    hidePlayBtn();
    logVideoPlay();
    showUnmuteHint();
  });
  video.addEventListener("pause", function () {
    if (video.currentTime < 0.05) {
      showPlayBtn();
    }
  });
  video.addEventListener("volumechange", function () {
    if (!video.muted) {
      hideUnmuteHint();
    } else if (!video.paused) {
      showUnmuteHint();
    }
  });

  bindUserGesture(playBtn, function (event) {
    event.preventDefault();
    event.stopPropagation();
    startPlayback();
  });

  bindUserGesture(unmuteBtn, function (event) {
    event.preventDefault();
    event.stopPropagation();
    enableSound();
  });

  showPlayBtn();

  pickWorkingVideoPath(HERO_VIDEO_PATHS).then(function (result) {
    pathIndex = result.index;
    setVideoHref(result.href, true);
    if (!touchDevice) {
      startPlayback();
    }
  });
}
