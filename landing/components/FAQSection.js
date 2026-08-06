import { escapeHtml, renderSectionHeader } from "./utils.js";
import { renderIcon } from "./icons.js";

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT['faq']} data
 */
export function renderFAQSection(data) {
  const itemsHtml = data.items
    .map(function (item, index) {
      return (
        '<details class="faq-item card">' +
        '<summary class="faq-item__question">' +
        renderIcon("chevron-down", "faq-item__chevron") +
        '<h3 class="u-h3 faq-item__title">' +
        escapeHtml(item.question) +
        "</h3></summary>" +
        '<div class="faq-item__answer u-body">' +
        "<p>" +
        escapeHtml(item.answer) +
        "</p></div></details>"
      );
    })
    .join("");

  return (
    '<section id="' +
    escapeHtml(data.id) +
    '" class="' +
    escapeHtml(data.sectionClass) +
    '" data-section="' +
    escapeHtml(data.id) +
    '" aria-labelledby="faq-title">' +
    '<div class="section-inner section-inner--narrow reveal container">' +
    '<p class="section-tag">FAQ</p>' +
    renderSectionHeader({
      title: data.title,
      lead: data.lead,
      centered: true,
      id: "faq-title"
    }) +
    '<div class="faq" role="list">' +
    itemsHtml +
    "</div>" +
    "</div>" +
    "</section>"
  );
}
