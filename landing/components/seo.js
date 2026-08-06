import { escapeHtml } from "./utils.js";
import { assertBootPass } from "../runtime/productionLock.js";

function upsertMeta(attr, key, value) {
  let el = document.querySelector('meta[' + attr + '="' + key + '"]');
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function upsertLink(rel, href) {
  let el = document.querySelector('link[rel="' + rel + '"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT} content
 * @param {object} jsonLdOrg
 * @param {object} jsonLdProduct
 * @param {object} jsonLdFaq
 */
export function applySeoMeta(content, jsonLdOrg, jsonLdProduct, jsonLdFaq) {
  assertBootPass();
  const seo = content.seo;

  document.documentElement.lang = seo.lang || "ru";
  document.title = seo.title;

  upsertMeta("name", "description", seo.description);
  upsertMeta("name", "keywords", seo.keywords.join(", "));
  upsertMeta("name", "robots", seo.robots);

  upsertLink("canonical", seo.canonical);

  upsertMeta("property", "og:type", seo.og.type);
  upsertMeta("property", "og:url", seo.canonical);
  upsertMeta("property", "og:title", seo.og.title);
  upsertMeta("property", "og:description", seo.og.description);
  upsertMeta("property", "og:image", seo.og.image);
  upsertMeta("property", "og:image:alt", seo.og.imageAlt);
  upsertMeta("property", "og:image:width", String(seo.og.imageWidth || 1024));
  upsertMeta("property", "og:image:height", String(seo.og.imageHeight || 592));
  upsertMeta("property", "og:locale", "ru_RU");

  upsertMeta("name", "twitter:card", seo.twitter.card);
  upsertMeta("name", "twitter:title", seo.twitter.title);
  upsertMeta("name", "twitter:description", seo.twitter.description);
  upsertMeta("name", "twitter:image", seo.twitter.image || seo.og.image);

  upsertJsonLd("jsonld-org", jsonLdOrg);
  upsertJsonLd("jsonld-product", jsonLdProduct);
  upsertJsonLd("jsonld-faq", jsonLdFaq);
}
