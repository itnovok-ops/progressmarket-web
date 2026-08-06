import { escapeHtml } from "./utils.js";
import { renderIcon } from "./icons.js";
import { HERO_VIDEO_CANDIDATES, HERO_VIDEO_MOBILE_CANDIDATES, HERO_POSTER_CANDIDATES, repoAssetUrl } from "../paths.js";

function resolveFromPage(path) {
  if (typeof window !== "undefined" && window.location) {
    return new URL(path, window.location.href).href;
  }
  return repoAssetUrl(path.replace(/^\.\.\//, "").replace(/^\//, ""));
}

function firstResolvedUrl(candidates) {
  const list = candidates || [];
  if (list.length === 0) {
    return "";
  }
  return resolveFromPage(list[0]);
}

function pickVideoCandidates() {
  if (typeof window !== "undefined") {
    const touch =
      "ontouchstart" in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    if (touch || window.innerWidth <= 768) {
      return HERO_VIDEO_MOBILE_CANDIDATES;
    }
  }
  return HERO_VIDEO_CANDIDATES;
}

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT['hero']} data
 */
export function renderVideoSection(data) {
  const videoSrc = firstResolvedUrl(pickVideoCandidates());
  const posterSrc = firstResolvedUrl(HERO_POSTER_CANDIDATES);

  return (
    '<section id="video" class="section section--video" aria-label="Демонстрация системы" data-track-section="video" data-section="video">' +
    '<div class="section-inner section-inner--wide reveal container">' +
    '<div class="hero-video-wrapper card card--media">' +
    '<div class="video-kicker">' +
    renderIcon("play", "icon--sm") +
    "<span>" +
    escapeHtml(data.videoKicker || "Посмотри, как система автоматически создаёт и продаёт товары на Wildberries") +
    "</span></div>" +
    '<div class="video-container">' +
    '<video id="heroVideo" class="hero-video" controls muted loop playsinline preload="metadata"' +
    ' poster="' +
    escapeHtml(posterSrc) +
    '" src="' +
    escapeHtml(videoSrc) +
    '" aria-label="Демонстрация системы WB FBS"></video>' +
    '<button type="button" class="hero-video__play" data-video-play aria-label="Запустить видео">' +
    renderIcon("play", "icon--lg") +
    "</button>" +
    '<button type="button" class="hero-video__sound-hint" data-video-unmute hidden aria-label="Включить звук">' +
    renderIcon("volume", "icon--sm") +
    "<span>Включить звук</span>" +
    "</button>" +
    "</div>" +
    "</div>" +
    "</div>" +
    "</section>"
  );
}
