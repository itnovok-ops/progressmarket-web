/**
 * Video Orchestrator — delegates DOM changes to UI mutation layer.
 */

const MODAL_ID = "lifeos-video-modal";
const INLINE_VIDEO_ID = "heroVideo";

let mode = "uninitialized";
let captureBound = false;

function getLayer() {
  return window.__UI_MUTATION_LAYER__;
}

function uiMutate(action) {
  const layer = getLayer();
  if (layer) {
    return layer.mutate(Object.assign({ source: "videoOrchestrator" }, action));
  }
  return { ok: false };
}

/**
 * @param {ParentNode} [root]
 * @returns {object}
 */
export function initVideoOrchestrator(root) {
  try {
    if (window.__LIFEOS_VIDEO_LOCKED__ || window.__LIFEOS_VIDEO_AUTHORITY_LOCKED__ || window.__VIDEO_CONTROLLER__) {
      mode = "single_authority";
      if (window.__VIDEO_CONTROLLER__) {
        window.__LIFEOS_VIDEO_CONTROLLER__ = window.__VIDEO_CONTROLLER__;
      } else if (window.videoAuthority) {
        window.__LIFEOS_VIDEO_CONTROLLER__ = window.videoAuthority;
      }
      return getVideoControllerSnapshot();
    }

    const scope = root || document.getElementById("app") || document;
    const inlineVideo = document.getElementById(INLINE_VIDEO_ID);
    const modal = document.getElementById(MODAL_ID);
    const playBtn = scope.querySelector ? scope.querySelector("#videoPlayBtn, .video-play-overlay") : null;

    if (!inlineVideo) {
      mode = "absent";
      return getVideoControllerSnapshot();
    }

    if (modal) {
      uiMutate({ type: "HIDE_ELEMENT", target: "#" + MODAL_ID });
      mode = "inline_authority";
    } else {
      mode = "inline_only";
    }

    if (!captureBound) {
      document.addEventListener("click", onDelegatedVideoClick, true);
      captureBound = true;
    }

    window.__LIFEOS_VIDEO_CONTROLLER__ = {
      mode: mode,
      authority: "videoOrchestrator",
      inline_active: true,
      modal_suppressed: Boolean(modal),
      play: function () {
        return engageInlineVideo(inlineVideo, playBtn);
      },
      pause: function () {
        uiMutate({ type: "VIDEO_PAUSE" });
      },
      readOnlyMetrics: function () {
        return {
          seen: window.__LIFEOS_CONVERSION__?.video?.seen || false,
          clicked: window.__LIFEOS_CONVERSION__?.video?.clicked || false,
          watchTime: window.__LIFEOS_CONVERSION__?.video?.watchTime || 0
        };
      }
    };

    return getVideoControllerSnapshot();
  } catch (_error) {
    mode = "error_safe";
    return getVideoControllerSnapshot();
  }
}

/**
 * @param {Event} event
 */
function onDelegatedVideoClick(event) {
  if (mode !== "inline_authority" && mode !== "inline_only") {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const modal = document.getElementById(MODAL_ID);
  if (
    target.closest("#" + MODAL_ID) ||
    target.closest(".lifeos-video-modal")
  ) {
    if (modal && mode === "inline_authority") {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
    return;
  }

  const isVideoTrigger = target.closest(
    "#videoPlayBtn, .video-play-overlay, .play-button, #heroVideo, section#video, section.section--video"
  );

  if (!isVideoTrigger || mode !== "inline_authority") {
    return;
  }

  if (modal && !modal.hidden) {
    event.stopImmediatePropagation();
    event.preventDefault();
    uiMutate({ type: "HIDE_ELEMENT", target: "#" + MODAL_ID });
  }
}

/**
 * @param {HTMLVideoElement} video
 * @param {Element|null} playBtn
 * @returns {boolean}
 */
function engageInlineVideo(video, playBtn) {
  try {
    if (window.__VIDEO_CONTROLLER__ && typeof window.__VIDEO_CONTROLLER__.play === "function") {
      window.__VIDEO_CONTROLLER__.play();
      return true;
    }

    uiMutate({ type: "VIDEO_PLAY" });
    if (playBtn) {
      uiMutate({ type: "HIDE_OVERLAY", target: playBtn });
    }
    emitVideoEvent("video_play", { source: "orchestrator" });
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * @param {string} name
 * @param {object} metadata
 */
function emitVideoEvent(name, metadata) {
  try {
    if (typeof window.__LIFEOS_EMIT_EVENT__ === "function") {
      window.__LIFEOS_EMIT_EVENT__(name, metadata, "video_orchestrator");
    } else if (typeof window.__LIFEOS_SEND_EVENT === "function") {
      window.__LIFEOS_SEND_EVENT({
        event: name,
        timestamp: Date.now(),
        metadata: metadata,
        source: "video_orchestrator"
      });
    }
  } catch (_error) {
    /* silent */
  }
}

/**
 * @returns {object}
 */
export function getVideoControllerSnapshot() {
  const inlineVideo = document.getElementById(INLINE_VIDEO_ID);
  const modal = document.getElementById(MODAL_ID);

  return {
    mode: mode,
    authority: "videoOrchestrator",
    inline_present: Boolean(inlineVideo),
    modal_present: Boolean(modal),
    modal_suppressed: mode === "inline_authority",
    conflict_resolved: mode === "inline_authority" || mode === "inline_only",
    metrics: window.__LIFEOS_VIDEO_CONTROLLER__?.readOnlyMetrics?.() || null
  };
}
