import { escapeHtml, renderImage, renderSectionHeader } from "./utils.js";

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT['system']} data
 */
export function renderSystemFlowSection(data) {
  const stepsHtml = data.steps
    .map(function (step) {
      return (
        '<li class="process-step reveal">' +
        '<div class="process-step__marker" aria-hidden="true"><span>' +
        escapeHtml(step.step) +
        "</span></div>" +
        '<article class="process-step__content card">' +
        '<h3 class="u-h3">' +
        escapeHtml(step.title) +
        "</h3>" +
        '<p class="u-body">' +
        escapeHtml(step.text) +
        "</p>" +
        (step.image
          ? renderImage({
              src: step.image,
              alt: step.alt,
              frameClass: "img-frame process-step__diagram",
              autoAspect: true
            })
          : "") +
        "</article>" +
        "</li>"
      );
    })
    .join("");

  return (
    '<section id="' +
    escapeHtml(data.id) +
    '" class="' +
    escapeHtml(data.sectionClass) +
    '" aria-labelledby="system-title">' +
    '<div class="section-inner section-inner--wide reveal">' +
    renderSectionHeader({
      eyebrow: data.eyebrow,
      title: data.title,
      lead: data.lead,
      centered: true,
      id: "system-title"
    }) +
    '<ol class="process-timeline" aria-label="Шаги работы системы">' +
    stepsHtml +
    "</ol>" +
    "</div>" +
    "</section>"
  );
}
