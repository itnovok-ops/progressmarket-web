import { escapeHtml, renderButton } from "./utils.js";

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT['hero']} data
 */
export function renderHeroSection(data) {
  const statsHtml = data.stats
    .map(function (stat) {
      const value = typeof stat === "string" ? stat : stat.value;
      const label = typeof stat === "string" ? "" : stat.label;
      return (
        '<div class="hero-stat card card--chip">' +
        '<strong class="hero-stat__value">' +
        escapeHtml(value) +
        "</strong>" +
        (label ? '<span class="hero-stat__label">' + escapeHtml(label) + "</span>" : "") +
        "</div>"
      );
    })
    .join("");

  const actions =
    '<div class="hero-actions cta-buttons">' +
    renderButton(data.cta.primary, "a") +
    renderButton(data.cta.secondary, "a") +
    "</div>";

  return (
    '<section class="hero section" aria-labelledby="hero-title" data-track-section="hero" data-section="hero">' +
    '<div class="hero__layout section-inner section-inner--wide container">' +
    '<div class="hero__inner reveal">' +
    '<p class="section-tag hero__tag">' +
    escapeHtml(data.label) +
    "</p>" +
    '<h1 id="hero-title" class="hero-title u-h1">' +
    escapeHtml(data.headline) +
    "</h1>" +
    '<p class="hero-subtitle u-body">' +
    escapeHtml(data.subtitle) +
    "</p>" +
    actions +
    '<div class="hero-stats" role="list">' +
    statsHtml +
    "</div>" +
    "</div>" +
    "</div>" +
    "</section>"
  );
}
