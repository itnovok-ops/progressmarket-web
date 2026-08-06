import { escapeHtml, renderSectionHeader, resolveHref } from "./utils.js";
import { renderIcon } from "./icons.js";

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT['cta']} data
 */
export function renderCTASection(data) {
  const fields = data.formFields || {};
  const reassurance = (data.reassurance || [])
    .map(function (item) {
      return (
        '<li class="cta-reassurance__item card card--chip">' +
        renderIcon("check", "icon--sm") +
        "<span>" +
        escapeHtml(item) +
        "</span></li>"
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
    '" aria-labelledby="cta-title">' +
    '<div class="section-inner section-inner--narrow reveal container">' +
    '<p class="section-tag">Заявка</p>' +
    renderSectionHeader({
      title: data.title,
      lead: data.lead,
      centered: true,
      id: "cta-title"
    }) +
    '<ul class="cta-reassurance">' +
    reassurance +
    "</ul>" +
    '<div id="lead-form-wrap" class="lead-form-wrap">' +
    '<form id="lead-form" class="cta-form card" novalidate data-lead-form>' +
    '<label class="sr-only" for="lead-name">' +
    escapeHtml(fields.name?.label || "Имя") +
    "</label>" +
    '<input id="lead-name" type="text" name="name" placeholder="' +
    escapeHtml(fields.name?.placeholder || "Имя") +
    '" required autocomplete="name">' +
    '<label class="sr-only" for="lead-phone">' +
    escapeHtml(fields.phone?.label || "Телефон") +
    "</label>" +
    '<input id="lead-phone" type="tel" name="phone" placeholder="' +
    escapeHtml(fields.phone?.placeholder || "Телефон +7 …") +
    '" required autocomplete="tel" inputmode="tel" maxlength="18">' +
    '<label class="sr-only" for="lead-email">' +
    escapeHtml(fields.email?.label || "Электронная почта") +
    "</label>" +
    '<input id="lead-email" type="email" name="email" placeholder="' +
    escapeHtml(fields.email?.placeholder || "Электронная почта") +
    '" autocomplete="email">' +
    '<label class="sr-only" for="lead-comment">' +
    escapeHtml(fields.comment?.label || "Комментарий") +
    "</label>" +
    '<textarea id="lead-comment" name="comment" rows="4" placeholder="' +
    escapeHtml(fields.comment?.placeholder || "Комментарий") +
    '"></textarea>' +
    '<label class="checkbox">' +
    '<input type="checkbox" name="consent" required>' +
    "<span>" +
    escapeHtml(data.consentText.prefix) +
    ' <a href="' +
    escapeHtml(resolveHref(data.legalLinks[0].href)) +
    '" target="_blank" rel="noopener">' +
    escapeHtml(data.legalLinks[0].label) +
    "</a> " +
    escapeHtml(data.consentText.conjunction) +
    ' <a href="' +
    escapeHtml(resolveHref(data.legalLinks[1].href)) +
    '" target="_blank" rel="noopener">' +
    escapeHtml(data.legalLinks[1].label) +
    "</a></span></label>" +
    '<label class="checkbox">' +
    '<input type="checkbox" name="marketingConsent" value="yes">' +
    "<span>" +
    escapeHtml(data.consentText.suffix) +
    ' <a href="' +
    escapeHtml(resolveHref(data.legalLinks[2].href)) +
    '" target="_blank" rel="noopener">' +
    escapeHtml(data.legalLinks[2].label) +
    "</a></span></label>" +
    '<div class="lead-hp-wrap" aria-hidden="true">' +
    '<input type="text" name="hp_trap" tabindex="-1" autocomplete="off" value="">' +
    "</div>" +
    '<button type="submit" class="btn btn-primary" id="lead-submit">' +
    escapeHtml(data.submitLabel) +
    "</button>" +
    '<p id="form-status" class="form-status" aria-live="polite" role="status"></p>' +
    "</form>" +
    '<div id="lead-form-success" class="lead-form-success card" hidden>' +
    '<p class="lead-form-success__title u-h3">' +
    escapeHtml(data.successMessage) +
    "</p>" +
    "</div>" +
    "</div>" +
    "</div>" +
    "</section>"
  );
}
