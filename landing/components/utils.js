import { IMAGE_META } from "../assets/data/content.js";
import { assetUrl, resolveHref } from "../paths.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getImageMeta(logicalPath) {
  const key = String(logicalPath).replace(/^assets\//, "");
  return IMAGE_META[key] || IMAGE_META[logicalPath] || null;
}

/**
 * @param {object} opts
 * @param {string} opts.src logical asset path e.g. images/foo.png
 * @param {string} opts.alt
 * @param {string} [opts.frameClass]
 * @param {boolean} [opts.autoAspect]
 * @param {boolean} [opts.priority]
 */
export function renderImage({ src, alt, frameClass = "img-frame", autoAspect = false, priority = false }) {
  const frameCls = autoAspect ? frameClass + " img-frame--auto" : frameClass;
  const loading = priority ? "eager" : "lazy";
  const fetchPriority = priority ? ' fetchpriority="high"' : "";
  const resolvedSrc = assetUrl(src);
  const meta = getImageMeta(src);
  const widthAttr = meta ? ' width="' + meta.width + '"' : "";
  const heightAttr = meta ? ' height="' + meta.height + '"' : "";
  const srcset = meta ? ' srcset="' + escapeHtml(resolvedSrc) + " " + meta.width + 'w"' : "";

  return (
    '<figure class="' +
    escapeHtml(frameCls) +
    '">' +
    '<img src="' +
    escapeHtml(resolvedSrc) +
    '"' +
    srcset +
    ' alt="' +
    escapeHtml(alt) +
    '"' +
    widthAttr +
    heightAttr +
    ' loading="' +
    loading +
    '" decoding="async"' +
    fetchPriority +
    ' sizes="(max-width: 768px) 100vw, 960px">' +
    "</figure>"
  );
}

/**
 * @param {object} btn
 * @param {string} btn.label
 * @param {string} btn.href
 * @param {string} [btn.variant]
 * @param {string} [btn.ymGoal]
 * @param {string} [btn.trackId]
 * @param {string} [btn.tag]
 */
export function renderButton(btn, tag) {
  const el = tag || (btn.href ? "a" : "button");
  const variant = btn.variant || "primary";
  const cls = "btn btn-" + variant;

  let attrs = ' class="' + cls + '"';
  if (el === "a") {
    attrs += ' href="' + escapeHtml(resolveHref(btn.href)) + '"';
  } else {
    attrs += ' type="button"';
  }
  if (btn.ymGoal) {
    attrs += ' data-ym-cta="' + escapeHtml(btn.ymGoal) + '"';
  }
  if (btn.trackId) {
    attrs += ' data-track="' + escapeHtml(btn.trackId) + '"';
  }

  return "<" + el + attrs + ">" + escapeHtml(btn.label) + "</" + el + ">";
}

export function renderSectionHeader({ eyebrow, title, lead, centered = false, id }) {
  const centerClass = centered ? " section-header--center" : "";
  const idAttr = id ? ' id="' + escapeHtml(id) + '"' : "";
  let html = '<header class="section-header' + centerClass + '">';

  if (eyebrow) {
    html += '<p class="section-tag">' + escapeHtml(eyebrow) + "</p>";
  }
  html += "<h2" + idAttr + ' class="section-title u-h2">' + escapeHtml(title) + "</h2>";
  if (lead) {
    html += '<p class="section-subtitle u-body">' + escapeHtml(lead) + "</p>";
  }
  html += "</header>";
  return html;
}

export function renderYmAttr(goal) {
  return goal ? ' data-ym-cta="' + escapeHtml(goal) + '"' : "";
}

export { resolveHref };
