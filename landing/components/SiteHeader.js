import { escapeHtml } from "./utils.js";
import { renderIcon } from "./icons.js";

function renderCtaLink(cta, className) {
  const label = escapeHtml(cta.label);
  const variant = cta.variant || "primary";
  let attrs =
    ' class="btn btn-' +
    variant +
    (className ? " " + className : "") +
    '" href="' +
    escapeHtml(cta.href) +
    '" data-uls-cta';
  if (cta.ymGoal) {
    attrs += ' data-ym-cta="' + escapeHtml(cta.ymGoal) + '"';
  }
  if (cta.trackId) {
    attrs += ' data-track="' + escapeHtml(cta.trackId) + '"';
  }
  return "<a" + attrs + ">" + label + "</a>";
}

function renderNavLinks(nav) {
  return nav
    .map(function (item) {
      const scope = item.scope || "all";
      return (
        '<a class="site-header__nav-link" data-nav-scope="' +
        escapeHtml(scope) +
        '" href="' +
        escapeHtml(item.href) +
        '">' +
        escapeHtml(item.label) +
        "</a>"
      );
    })
    .join("");
}

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT['meta']} meta
 * @param {import('../assets/data/content.js').PAGE_CONTENT['nav']} nav
 * @param {import('../assets/data/content.js').PAGE_CONTENT['headerCta']} headerCta
 */
export function renderSiteHeader(meta, nav, headerCta) {
  const navHtml = renderNavLinks(nav);

  const barCta = {
    label: headerCta.mobileLabel || "Заявка",
    href: headerCta.href,
    ymGoal: headerCta.ymGoal,
    trackId: headerCta.trackId,
    variant: "primary"
  };

  const shellCta = {
    label: headerCta.label,
    href: headerCta.href,
    ymGoal: headerCta.ymGoal,
    trackId: headerCta.trackId,
    variant: headerCta.variant || "primary"
  };

  return (
    '<header class="site-header surface-glass" role="banner" data-uls-header data-uls-version="2026.06.19.02">' +
    '<div class="site-header__backdrop" data-uls-backdrop hidden></div>' +
    '<div class="site-header__bar">' +
    '<div class="site-header__inner container">' +
    '<a href="#top" class="site-header__logo">' +
    escapeHtml(meta.brand) +
    "</a>" +
    '<div class="site-header__mobile-tools">' +
    renderCtaLink(barCta, "site-header__cta-bar") +
    '<button type="button" class="site-header__burger" data-uls-burger aria-expanded="false" aria-controls="site-header-menu-shell" aria-label="Открыть меню">' +
    renderIcon("menu") +
    "</button>" +
    "</div>" +
    '<div id="site-header-menu-shell" class="site-header__menu-shell" data-uls-menu-shell aria-hidden="true">' +
    '<div class="site-header__menu-row">' +
    '<nav class="site-header__nav" data-uls-nav aria-label="Навигация">' +
    navHtml +
    "</nav>" +
    '<div class="site-header__shell-actions">' +
    renderCtaLink(shellCta, "site-header__shell-cta") +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div>" +
    "</header>"
  );
}
