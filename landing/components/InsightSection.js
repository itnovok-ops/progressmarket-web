import { escapeHtml, renderImage, renderSectionHeader } from "./utils.js";

function renderPairBlock(block) {
  const reverseClass = block.reverse ? " insight-block--reverse" : "";
  return (
    '<article class="insight-block card' +
    reverseClass +
    ' reveal">' +
    '<div class="insight-block__text">' +
    '<h3 class="u-h3">' +
    escapeHtml(block.title) +
    "</h3>" +
    '<p class="u-body">' +
    escapeHtml(block.text) +
    "</p>" +
    "</div>" +
    renderImage({
      src: block.image,
      alt: block.alt,
      frameClass: "img-frame insight-block__media",
      autoAspect: true
    }) +
    "</article>"
  );
}

function renderGridBlock(block) {
  const panels = block.items
    .map(function (item) {
      return (
        '<article class="insight-panel card">' +
        renderImage({ src: item.image, alt: item.alt, autoAspect: true }) +
        '<h3 class="u-h3">' +
        escapeHtml(item.title) +
        "</h3>" +
        '<p class="u-body-sm">' +
        escapeHtml(item.text) +
        "</p>" +
        "</article>"
      );
    })
    .join("");

  return '<div class="insight-grid reveal">' + panels + "</div>";
}

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT['insight']} data
 */
export function renderInsightSection(data) {
  const blocksHtml = data.blocks
    .map(function (block) {
      if (block.type === "grid") {
        return renderGridBlock(block);
      }
      return renderPairBlock(block);
    })
    .join("");

  return (
    '<section id="' +
    escapeHtml(data.id) +
    '" class="' +
    escapeHtml(data.sectionClass) +
    '" data-section="' +
    escapeHtml(data.id) +
    '" aria-labelledby="insight-title">' +
    '<div class="section-inner section-inner--content reveal container">' +
    renderSectionHeader({
      eyebrow: data.eyebrow,
      title: data.title,
      lead: data.lead,
      centered: true,
      id: "insight-title"
    }) +
    '<div class="insight-story">' +
    blocksHtml +
    "</div>" +
    "</div>" +
    "</section>"
  );
}
