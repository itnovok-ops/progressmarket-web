import { escapeHtml, renderImage, renderSectionHeader } from "./utils.js";
import { renderIcon } from "./icons.js";

function renderMetrics(metrics, large) {
  const listClass = large ? "case-metrics case-metrics--large" : "case-metrics";
  const items = metrics
    .map(function (metric) {
      return (
        "<li><strong>" +
        escapeHtml(metric.value) +
        "</strong><span>" +
        escapeHtml(metric.label) +
        "</span></li>"
      );
    })
    .join("");
  return '<ul class="' + listClass + '">' + items + "</ul>";
}

function renderCaseCard(item) {
  if (item.type === "featured") {
    return (
      '<article class="case-card case-card--featured card reveal">' +
      renderImage({
        src: item.image,
        alt: item.alt,
        frameClass: "img-frame case-card__media",
        autoAspect: true
      }) +
      '<div class="case-card__body">' +
      '<h3 class="u-h3">' +
      escapeHtml(item.title) +
      "</h3>" +
      renderMetrics(item.metrics, false) +
      "</div>" +
      "</article>"
    );
  }

  return (
    '<article class="case-card case-card--stat card reveal">' +
    '<div class="case-card__body case-card__body--solo">' +
    '<h3 class="u-h3">' +
    escapeHtml(item.title) +
    "</h3>" +
    renderMetrics(item.metrics, true) +
    "</div>" +
    "</article>"
  );
}

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT['cases']} data
 */
export function renderCasesGrid(data) {
  const cardsHtml = data.items.map(renderCaseCard).join("");

  return (
    '<section id="' +
    escapeHtml(data.id) +
    '" class="' +
    escapeHtml(data.sectionClass) +
    '" data-section="' +
    escapeHtml(data.id) +
    '" aria-labelledby="cases-title">' +
    '<div class="section-inner section-inner--content reveal container">' +
    renderSectionHeader({
      eyebrow: data.eyebrow,
      title: data.title,
      lead: data.lead,
      centered: true,
      id: "cases-title"
    }) +
    '<div class="cases-grid">' +
    cardsHtml +
    "</div>" +
    "</div>" +
    "</section>"
  );
}
