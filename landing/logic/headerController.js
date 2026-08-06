/**
 * ULS Logic Layer — header / mobile menu (single state, single nav DOM).
 */

import {
  isMobileMenuOpen,
  setMobileMenuOpen,
  subscribeMobileMenu
} from "../uls/state.js";
import { logUlsEvent } from "../uls/observability.js";
import { renderIcon } from "../components/icons.js";

const DESKTOP_MQ = "(min-width: 769px)";

function isDesktopHeader() {
  return window.matchMedia(DESKTOP_MQ).matches;
}

function syncSiteHeaderOffset() {
  const bar = document.querySelector(".site-header__bar");
  if (!bar) {
    return;
  }
  document.documentElement.style.setProperty("--site-header-height", bar.offsetHeight + "px");
}

function getNodes() {
  return {
    header: document.querySelector("[data-uls-header]"),
    burger: document.querySelector("[data-uls-burger]"),
    shell: document.querySelector("[data-uls-menu-shell]"),
    backdrop: document.querySelector("[data-uls-backdrop]")
  };
}

function applyMobileMenuState(open) {
  const nodes = getNodes();
  if (!nodes.shell || !nodes.burger) {
    return;
  }

  if (isDesktopHeader()) {
    open = false;
    nodes.shell.classList.add("site-header__menu-shell--desktop");
    nodes.shell.classList.remove("is-open");
    nodes.shell.setAttribute("aria-hidden", "false");
    if (nodes.backdrop) {
      nodes.backdrop.hidden = true;
    }
    document.body.classList.remove("site-menu-open");
  } else {
    nodes.shell.classList.remove("site-header__menu-shell--desktop");
    nodes.shell.classList.toggle("is-open", open);
    nodes.shell.setAttribute("aria-hidden", open ? "false" : "true");
    if (nodes.backdrop) {
      nodes.backdrop.hidden = !open;
    }
    document.body.classList.toggle("site-menu-open", open);
  }

  nodes.burger.setAttribute("aria-expanded", open ? "true" : "false");
  nodes.burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  nodes.burger.innerHTML = renderIcon(open ? "close" : "menu");

  syncSiteHeaderOffset();
}

export function initHeaderController() {
  const nodes = getNodes();
  if (!nodes.burger || !nodes.shell || nodes.burger.dataset.ulsBound === "true") {
    return;
  }
  nodes.burger.dataset.ulsBound = "true";

  subscribeMobileMenu(applyMobileMenuState);

  nodes.burger.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    logUlsEvent("click_burger", { open: !isMobileMenuOpen() });
    setMobileMenuOpen(!isMobileMenuOpen());
  });

  if (nodes.backdrop) {
    nodes.backdrop.addEventListener("click", function () {
      setMobileMenuOpen(false);
    });
  }

  nodes.shell.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      setMobileMenuOpen(false);
    });
  });

  const barCta = document.querySelector(".site-header__cta-bar");
  if (barCta) {
    barCta.addEventListener("click", function () {
      setMobileMenuOpen(false);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      setMobileMenuOpen(false);
    }
  });

  window.addEventListener(
    "resize",
    function () {
      if (isDesktopHeader()) {
        setMobileMenuOpen(false);
      }
      applyMobileMenuState(isMobileMenuOpen());
    },
    { passive: true }
  );

  setMobileMenuOpen(false);
  applyMobileMenuState(false);
  syncSiteHeaderOffset();
  window.addEventListener("resize", syncSiteHeaderOffset, { passive: true });
}
