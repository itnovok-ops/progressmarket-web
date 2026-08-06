/**
 * VideoController — state-only shim (no direct DOM).
 */

import { enqueueIntent, runPipeline } from "../pipeline.js";

function videoIntent(patch) {
  return enqueueIntent({
    type: "ACTION",
    source: "videoController",
    payload: { video: patch }
  });
}

function bindVideoControls() {
  const btn = document.getElementById("videoPlayBtn");
  const video = document.getElementById("heroVideo");
  if (btn && !btn.dataset.pipelineBound) {
    btn.dataset.pipelineBound = "true";
    btn.addEventListener(
      "click",
      function (event) {
        event.stopImmediatePropagation();
        videoController.play();
      },
      true
    );
  }
  if (video && !video.dataset.pipelineBound) {
    video.dataset.pipelineBound = "true";
    video.addEventListener(
      "click",
      function (event) {
        event.stopImmediatePropagation();
        videoController.play();
      },
      true
    );
  }
}

export const videoController = {
  authority: "videoController",
  initialized: function () {
    return window.__LIFEOS_VIDEO_INITIALIZED__ === true;
  },
  init: function () {
    window.__LIFEOS_VIDEO_INITIALIZED__ = true;
    window.__LIFEOS_VIDEO_AUTHORITY_FINALIZED__ = true;
    window.__LIFEOS_VIDEO_LOCKED__ = true;
    window.__LIFEOS_VIDEO_AUTHORITY_LOCKED__ = true;

    videoIntent({ visible: true, play: true, playing: true, overlayHidden: false });
    const result = runPipeline();
    bindVideoControls();

    if (window.__LIFEOS_SAFE_STATE__) {
      window.__LIFEOS_SAFE_STATE__.video = { initialized: true };
    }

    return result.render || { ok: true, mode: "state_pipeline" };
  },
  play: function () {
    videoIntent({ visible: true, playing: true, overlayHidden: true });
    return runPipeline().render;
  },
  pause: function () {
    videoIntent({ visible: true, playing: false });
    return runPipeline().render;
  }
};

export function resetVideoControllerForBoot() {
  window.__LIFEOS_VIDEO_INITIALIZED__ = false;
  window.__LIFEOS_VIDEO_AUTHORITY_FINALIZED__ = false;
}

export function initVideoController() {
  return videoController.init();
}

if (typeof window !== "undefined") {
  window.__VIDEO_CONTROLLER__ = videoController;
  window.videoAuthority = videoController;
  window.__LIFEOS_VIDEO_CONTROLLER__ = videoController;
}
