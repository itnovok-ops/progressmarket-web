const UI_ROOT_KEYS = ["hero", "problem", "insight", "system", "cases", "faq", "cta", "footer", "meta", "nav", "headerCta"];

const REQUIRED_REQUISITE_KEYS = [
  "legalName",
  "ogrnLabel",
  "ogrn",
  "innLabel",
  "inn",
  "emailLabel",
  "email"
];

/** Common English UI phrases that must not appear in DOM copy. */
const EN_UI_PATTERN =
  /\b(Email|FAQ|Problem cluster|Insight cluster|Result cluster|System cluster|dropshipping system|marketplace logistics|inventory management|seller tools|Wildberries sellers in Russia|launch revenue|Live operations|Catalog scale|Inventory automation|no bulk buy|repricer \+ stock|WB sync|Answers about|not classic|you test|bulk purchase|Capital stays|Built for|Copy-paste|Price wars|Platform rule|One hit|Stop bidding|Spreadsheets don't|Find niche|Supplier model|Seller FAQ|FBS flow)\b/i;

const SKIP_KEYS = new Set([
  "type",
  "ymGoal",
  "trackId",
  "variant",
  "id",
  "sectionClass",
  "href",
  "image",
  "reverse",
  "step",
  "project_type",
  "source",
  "canonical",
  "lang",
  "robots",
  "card",
  "width",
  "height"
]);
const ALLOWED_LATIN =
  /^(Wildberries|FBS|SKU|WB|vs|24\/7|mailto:|https?:|#|[0-9 ₽+./-]+|support@progress-market\.ru)$/i;

/**
 * Hard fail if footer requisites are missing or incomplete.
 * @param {import('../assets/data/content.js').PAGE_CONTENT} content
 */
export function assertFooterRequisites(content) {
  const requisites = content?.footer?.requisites;
  if (!requisites || typeof requisites !== "object") {
    throw new Error("[landing] content.footer.requisites is required");
  }

  REQUIRED_REQUISITE_KEYS.forEach(function (key) {
    const value = requisites[key];
    if (value === undefined || value === null || String(value).trim() === "") {
      throw new Error("[landing] content.footer.requisites." + key + " is required");
    }
  });
}

function collectUiStrings(value, bucket) {
  if (typeof value === "string") {
    bucket.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(function (item) {
      collectUiStrings(item, bucket);
    });
    return;
  }
  if (value && typeof value === "object") {
    Object.keys(value).forEach(function (key) {
      if (SKIP_KEYS.has(key)) {
        return;
      }
      collectUiStrings(value[key], bucket);
    });
  }
}

/**
 * Warn when likely English UI copy is detected in content sections.
 * @param {import('../assets/data/content.js').PAGE_CONTENT} content
 */
export function warnEnUiStrings(content) {
  const strings = [];
  UI_ROOT_KEYS.forEach(function (key) {
    if (content[key]) {
      collectUiStrings(content[key], strings);
    }
  });

  const hits = [];
  strings.forEach(function (text) {
    if (EN_UI_PATTERN.test(text)) {
      hits.push(text.slice(0, 120));
      return;
    }
    const words = text.match(/\b[A-Za-z]{4,}\b/g) || [];
    words.forEach(function (word) {
      if (!ALLOWED_LATIN.test(word) && !hits.includes(text.slice(0, 120))) {
        if (/^(progress|market|support|Wildberries)$/i.test(word)) {
          return;
        }
        hits.push(text.slice(0, 120));
      }
    });
  });

  if (hits.length > 0) {
    console.warn("[landing] Possible EN UI strings detected in content.js:", [...new Set(hits)]);
  }
}

import { BootTelemetry } from "../lifeos/boot/BootTelemetry.js";

/**
 * Redirect legacy /drop-landing/ paths to /landing/.
 */
export function redirectLegacyDropLandingPath() {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path.endsWith("/drop-landing") || path.includes("/drop-landing/")) {
    BootTelemetry.addWarning(
      "LEGACY_ROUTE_DETECTED",
      "Legacy /drop-landing/ route detected; redirecting to /landing/",
      { path: window.location.pathname }
    );
    const target =
      path.replace(/\/drop-landing(\/.*)?$/, "/landing/") +
      window.location.search +
      window.location.hash;
    window.location.replace(target);
  }
}
