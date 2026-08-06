/**
 * LifeOS Landing Standard v1.0 — app-root path resolver.
 * All URLs derived from this module location (/landing/), not document URL.
 */

const APP_ROOT = new URL("./", import.meta.url);
const REPO_ROOT = new URL("../", APP_ROOT);

/** Public deploy subdirectory (empty string if served from domain root). */
export const APP_PUBLIC_PATH = "landing";

/** Production site origin (no trailing path). */
export const SITE_ORIGIN = "https://market.teravox.ru";

/** Primary public entry path on deploy. */
export const SITE_ENTRY_PATH = "lifeos";

/** Hero MP4 — landing/ first (Beget deploy path). */
export const HERO_VIDEO_CANDIDATES = [
  "/landing/assets/video/hero-wb-fbs.mp4",
  "/assets/video/hero-wb-fbs.mp4",
  "../landing/assets/video/hero-wb-fbs.mp4",
  "../assets/video/hero-wb-fbs.mp4"
];

export const HERO_VIDEO_MOBILE_CANDIDATES = [
  "/landing/assets/video/hero-wb-fbs-mobile.mp4",
  "/assets/video/hero-wb-fbs-mobile.mp4",
  "/landing/assets/video/hero-wb-fbs.mp4",
  "/assets/video/hero-wb-fbs.mp4"
];

export const HERO_POSTER_CANDIDATES = [
  "/landing/assets/video/video-poster.jpg",
  "/assets/video/video-poster.jpg",
  "../landing/assets/video/video-poster.jpg",
  "../assets/video/video-poster.jpg"
];

function normalizeAssetKey(path) {
  return String(path ?? "")
    .replace(/^\.?\//, "")
    .replace(/^assets\//, "");
}

/** @param {string} logicalPath e.g. "assets/video/hero-wb-fbs.mp4" */
export function repoAssetUrl(logicalPath) {
  return new URL(String(logicalPath).replace(/^\/+/, ""), REPO_ROOT).href;
}

/** @param {string} logicalPath e.g. "images/03_system/foo.png" */
export function assetUrl(logicalPath) {
  const key = normalizeAssetKey(logicalPath);
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    return window.location.origin + "/landing/assets/" + key;
  }
  return new URL(`assets/${key}`, APP_ROOT).href;
}

/** @param {string} siteUrl @param {string} logicalPath */
export function publicAssetUrl(siteUrl, logicalPath) {
  const base = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  const prefix = APP_PUBLIC_PATH ? `${APP_PUBLIC_PATH}/` : "";
  return `${base}${prefix}assets/${normalizeAssetKey(logicalPath)}`;
}

/** @param {string} href */
export function resolveHref(href) {
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return href;
  }
  return new URL(href, APP_ROOT).href;
}

export { APP_ROOT };
