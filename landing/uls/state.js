/**
 * ULS Logic State — single source of truth for header, menu, form.
 */

import { setUlsState, logUlsEvent } from "./observability.js";

let mobileMenuOpen = false;
const menuListeners = new Set();

export function isMobileMenuOpen() {
  return mobileMenuOpen;
}

export function setMobileMenuOpen(open) {
  mobileMenuOpen = Boolean(open);
  const value = mobileMenuOpen ? "OPEN" : "CLOSED";
  setUlsState("mobileMenu", value);
  setUlsState("header", value);
  logUlsEvent(mobileMenuOpen ? "open_mobile_menu" : "close_mobile_menu", {});
  menuListeners.forEach(function (listener) {
    listener(mobileMenuOpen);
  });
}

export function toggleMobileMenu() {
  setMobileMenuOpen(!mobileMenuOpen);
}

export function subscribeMobileMenu(listener) {
  menuListeners.add(listener);
  return function unsubscribe() {
    menuListeners.delete(listener);
  };
}

export function setFormState(state) {
  setUlsState("form", state);
}

export function setBootState(state) {
  setUlsState("boot", state);
  window.__BOOT_STATE__ = state;
}
