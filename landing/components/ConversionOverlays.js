import { escapeHtml } from "./utils.js";

/**
 * V1.1 conversion CTAs: mobile sticky bar + one mid-page soft CTA modal.
 * Exit-intent is intentionally NOT rendered here (out of scope for V1.1).
 * Both point at the single canonical lead form (#cta) — no competing forms.
 * @param {import('../assets/data/content.js').PAGE_CONTENT['cta']} data
 */
export function renderConversionOverlays(data) {
  const stickyLabel = escapeHtml(data.stickyCtaLabel || data.title || "Оставить заявку");
  const softTitle = escapeHtml(data.softCtaTitle || data.title || "");
  const softText = escapeHtml(data.softCtaText || "");
  const softLabel = escapeHtml(data.softCtaLabel || data.submitLabel || "Оставить заявку");

  return (
    '<div id="sticky-cta" class="sticky-cta" data-conversion-sticky aria-hidden="true">' +
    '<a href="#cta" class="btn btn-primary sticky-cta__btn" data-track="click_cta_sticky" data-ym-cta="click_cta_sticky">' +
    stickyLabel +
    "</a>" +
    "</div>" +
    '<div id="soft-cta" class="soft-cta" data-conversion-soft role="dialog" aria-modal="true" aria-labelledby="soft-cta-title" hidden>' +
    '<div class="soft-cta__panel card">' +
    '<button type="button" class="soft-cta__close" data-conversion-soft-close aria-label="Закрыть">×</button>' +
    '<h3 id="soft-cta-title" class="u-h3">' +
    softTitle +
    "</h3>" +
    '<p class="u-body">' +
    softText +
    "</p>" +
    '<a href="#cta" class="btn btn-primary soft-cta__action" data-track="click_cta_soft" data-ym-cta="click_cta_soft" data-conversion-soft-close>' +
    softLabel +
    "</a>" +
    "</div>" +
    "</div>"
  );
}
