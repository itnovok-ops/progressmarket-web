import { escapeHtml } from "./utils.js";

/**
 * Static SEO fallback for crawlers and no-JS users.
 * Keep in sync with index.html #app initial content.
 * @param {import('../assets/data/content.js').PAGE_CONTENT} content
 */
export function renderStaticSeoFallback(content) {
  const problemItems = content.problem.slides
    .slice(0, 4)
    .map(function (slide) {
      return "<li>" + escapeHtml(slide.title) + ": " + escapeHtml(slide.text) + "</li>";
    })
    .join("");

  const systemSteps = content.system.steps
    .map(function (step) {
      return "<li><strong>" + escapeHtml(step.title) + "</strong> — " + escapeHtml(step.text) + "</li>";
    })
    .join("");

  return (
    '<main id="top" role="main" class="seo-static-fallback">' +
    '<section class="hero" aria-labelledby="hero-title">' +
    "<h1 id=\"hero-title\">" +
    escapeHtml(content.hero.headline) +
    "</h1>" +
    "<p>" +
    escapeHtml(content.hero.subtitle) +
    "</p>" +
    '<p><a href="#cta">' +
    escapeHtml(content.hero.cta.primary.label) +
    "</a></p>" +
    "</section>" +
    '<section id="problem" aria-labelledby="problem-title">' +
    "<h2 id=\"problem-title\">" +
    escapeHtml(content.problem.title) +
    "</h2>" +
    "<p>" +
    escapeHtml(content.problem.lead) +
    "</p>" +
    "<ul>" +
    problemItems +
    "</ul>" +
    "</section>" +
    '<section id="system" aria-labelledby="system-title">' +
    "<h2 id=\"system-title\">" +
    escapeHtml(content.system.title) +
    "</h2>" +
    "<p>" +
    escapeHtml(content.system.lead) +
    "</p>" +
    "<ol>" +
    systemSteps +
    "</ol>" +
    "</section>" +
    '<section id="cta">' +
    "<h2>" +
    escapeHtml(content.cta.title) +
    "</h2>" +
    "<p>" +
    escapeHtml(content.cta.lead) +
    "</p>" +
    "</section>" +
    "</main>"
  );
}
