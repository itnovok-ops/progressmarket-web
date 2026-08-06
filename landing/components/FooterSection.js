import { escapeHtml, resolveHref } from "./utils.js";

const REQUIRED_REQUISITE_KEYS = [
  "legalName",
  "ogrnLabel",
  "ogrn",
  "innLabel",
  "inn",
  "emailLabel",
  "email"
];

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT['footer']['requisites']} requisites
 */
function assertRequisitesSchema(requisites) {
  if (!requisites || typeof requisites !== "object") {
    throw new Error("[landing] FooterSection: footer.requisites is required");
  }

  REQUIRED_REQUISITE_KEYS.forEach(function (key) {
    const value = requisites[key];
    if (value === undefined || value === null || String(value).trim() === "") {
      throw new Error("[landing] FooterSection: footer.requisites." + key + " is required");
    }
  });
}

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT['footer']['requisites']} requisites
 */
function renderRequisites(requisites) {
  assertRequisitesSchema(requisites);

  const emailHtml =
    '<a href="mailto:' +
    escapeHtml(requisites.email) +
    '">' +
    escapeHtml(requisites.email) +
    "</a>";

  return (
    '<div class="site-footer__requisites">' +
    '<p class="site-footer__note">' +
    escapeHtml(requisites.legalName) +
    "</p>" +
    '<p class="site-footer__note">' +
    escapeHtml(requisites.ogrnLabel) +
    ": " +
    escapeHtml(requisites.ogrn) +
    " · " +
    escapeHtml(requisites.innLabel) +
    ": " +
    escapeHtml(requisites.inn) +
    "</p>" +
    '<p class="site-footer__note">' +
    escapeHtml(requisites.emailLabel) +
    ": " +
    emailHtml +
    "</p>" +
    "</div>"
  );
}

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT['meta']} meta
 * @param {import('../assets/data/content.js').PAGE_CONTENT['footer']} footer
 */
export function renderFooterSection(meta, footer) {
  if (!footer || !Array.isArray(footer.legalLinks) || footer.legalLinks.length === 0) {
    throw new Error("[landing] FooterSection: footer.legalLinks is required");
  }

  const linksHtml = footer.legalLinks
    .map(function (link) {
      return (
        '<a href="' +
        escapeHtml(resolveHref(link.href)) +
        '" target="_blank" rel="noopener">' +
        escapeHtml(link.label) +
        "</a>"
      );
    })
    .join("");

  return (
    '<footer class="site-footer" role="contentinfo">' +
    '<div class="site-footer__inner card card--flat container">' +
    renderRequisites(footer.requisites) +
    '<nav class="site-footer__legal" aria-label="Юридические документы">' +
    linksHtml +
    "</nav>" +
    (footer.note
      ? '<p class="site-footer__note u-body-sm">' + escapeHtml(footer.note) + "</p>"
      : "") +
    "<p class=\"site-footer__copy u-body-sm\">" +
    escapeHtml(meta.brand) +
    ' © <span id="year">2026</span></p>' +
    "</div>" +
    "</footer>"
  );
}
