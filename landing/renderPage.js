import { renderSiteHeader } from "./components/SiteHeader.js";
import { renderHeroSection } from "./components/HeroSection.js";
import { renderVideoSection } from "./components/VideoSection.js";
import { renderProblemCarousel } from "./components/ProblemCarousel.js";
import { renderInsightSection } from "./components/InsightSection.js";
import { renderSystemFlowSection } from "./components/SystemFlowSection.js";
import { renderCasesGrid } from "./components/CasesGrid.js";
import { renderFAQSection } from "./components/FAQSection.js";
import { renderCTASection } from "./components/CTASection.js";
import { renderFooterSection } from "./components/FooterSection.js";
import { renderConversionOverlays } from "./components/ConversionOverlays.js";

/**
 * LifeOS Landing Standard v1.1 — section order:
 * Header → Hero → Video → Problem → Insight → How it works → Results → FAQ → CTA → Footer
 * (+ mobile sticky CTA / mid-page soft CTA overlays, rendered once at the end of body)
 * @param {import('./assets/data/content.js').PAGE_CONTENT} content
 * @returns {string}
 */
export function renderPage(content) {
  return (
    renderSiteHeader(content.meta, content.nav, content.headerCta) +
    '<main id="top" role="main">' +
    renderHeroSection(content.hero) +
    renderVideoSection(content.hero) +
    renderProblemCarousel(content.problem) +
    renderInsightSection(content.insight) +
    renderSystemFlowSection(content.system) +
    renderCasesGrid(content.cases) +
    renderFAQSection(content.faq) +
    renderCTASection(content.cta) +
    "</main>" +
    renderFooterSection(content.meta, content.footer) +
    renderConversionOverlays(content.cta)
  );
}
