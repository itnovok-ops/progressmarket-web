/**
 * ULS Content Layer — normalize product config for render + logic.
 */

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT} raw
 * @returns {import('../assets/data/content.js').PAGE_CONTENT}
 */
export function normalizeUlsConfig(raw) {
  if (!raw) {
    return raw;
  }

  const nav = (raw.nav || []).map(function (item) {
    return Object.assign({ scope: "all" }, item);
  });

  return Object.assign({}, raw, { nav: nav });
}

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT} config
 */
export function getNavForScope(config, scope) {
  return (config.nav || []).filter(function (item) {
    const itemScope = item.scope || "all";
    if (scope === "mobile") {
      return itemScope === "all" || itemScope === "mobile";
    }
    if (scope === "desktop") {
      return itemScope === "all" || itemScope === "desktop";
    }
    return true;
  });
}
