/**
 * Video Authority — delegates to safeInitVideo (heroVideoPlayer).
 */

import { safeInitVideo as initHeroVideoSafe } from "../../../landing/components/heroVideoPlayer.js";

export const videoController = {
  init: function () {
    return initHeroVideoSafe();
  },
  play: function () {
    const video = document.querySelector("#heroVideo");
    if (video) {
      return video.play();
    }
    return Promise.resolve();
  },
  pause: function () {
    const video = document.querySelector("#heroVideo");
    if (video) {
      video.pause();
    }
  }
};

export function initVideoController() {
  return initHeroVideoSafe();
}

export function resetVideoControllerForBoot() {
  window.__HERO_VIDEO_PLAYER_BOUND__ = false;
  const video = document.querySelector("#heroVideo");
  if (video) {
    video.dataset.heroPlayerBound = "false";
  }
}

export function safeInitVideo() {
  return initHeroVideoSafe();
}

export function initVideoAuthority() {
  return initHeroVideoSafe();
}

export function finalizeVideoAuthority() {
  return initHeroVideoSafe();
}

export function prepareVideoAuthority() {
  return { ok: true, mode: "safeInitVideo" };
}

export function resumeVideoPlayback() {
  return videoController.play();
}

export function installVideoMutationObserver() {}
export function installVideoDomRecoveryWatchdog() {}
export function installVideoLifecycleHooks() {}
export function installVideoRefreshRecovery() {}
export function ensureHeroVideo() {
  return initHeroVideoSafe();
}
export function forceHeroVideoVisible() {}
export function syncVideoDomCheck() {
  return initHeroVideoSafe();
}
export function runVideoRefreshRecovery() {
  resetVideoControllerForBoot();
  return initHeroVideoSafe();
}

export function isVideoAuthorityLocked() {
  return false;
}

export { initHeroVideoSafe as safeInitVideoFromPlayer };
