import { escapeHtml, renderSectionHeader } from "./utils.js";
import { renderCarousel } from "./Carousel.js";

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT['problem']} data
 */
export function renderProblemCarousel(data) {
  return (
    '<section id="' +
    escapeHtml(data.id) +
    '" class="' +
    escapeHtml(data.sectionClass) +
    '" data-section="' +
    escapeHtml(data.id) +
    '" aria-labelledby="problem-title">' +
    '<div class="section-inner section-inner--content reveal container">' +
    renderSectionHeader({
      eyebrow: data.eyebrow,
      title: data.title,
      lead: data.lead,
      id: "problem-title"
    }) +
    '<div class="card problem-block">' +
    renderCarousel({
      slides: data.slides,
      ariaLabel: data.carouselLabel
    }) +
    "</div>" +
    "</div>" +
    "</section>"
  );
}
