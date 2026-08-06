/**
 * UI Scanner — read-only DOM diagnostics for WAFS landing.
 */

const REQUIRED_SELECTORS = [
  { key: "hero", selector: '[data-track-section="hero"], section.hero', label: "Hero" },
  { key: "video", selector: '#video, [data-track-section="video"]', label: "Video" },
  { key: "problem", selector: '#problem, [data-track-section="problem"]', label: "Problem" },
  { key: "insight", selector: '#insight, [data-track-section="insight"]', label: "Insight" },
  { key: "cta", selector: '#cta, #lead-form, [data-track-section="cta"]', label: "CTA" },
  { key: "footer", selector: "footer.site-footer, footer[role='contentinfo']", label: "Footer" }
];

const CRITICAL_IDS = [
  "hero-title",
  "heroVideo",
  "videoPlayBtn",
  "lead-form",
  "lead-name",
  "lead-phone",
  "app"
];

/**
 * @param {ParentNode} [root]
 * @returns {object}
 */
export function scanUI(root) {
  const scope = (root && root.querySelector) ? root : document.getElementById("app") || document;
  const issues = [];
  const sections = [];

  try {
    REQUIRED_SELECTORS.forEach(function (def) {
      const el = scope.querySelector(def.selector);
      sections.push({
        key: def.key,
        label: def.label,
        present: Boolean(el),
        selector: def.selector
      });

      if (!el) {
        issues.push({
          type: "missing_section",
          severity: "high",
          section: def.key,
          message: def.label + " section not found in DOM"
        });
        return;
      }

      const rect = el.getBoundingClientRect();
      if (rect.height < 8) {
        issues.push({
          type: "collapsed_section",
          severity: "medium",
          section: def.key,
          message: def.label + " section has near-zero height"
        });
      }

      const text = (el.textContent || "").trim();
      if (text.length < 12 && def.key !== "video") {
        issues.push({
          type: "empty_section",
          severity: "medium",
          section: def.key,
          message: def.label + " section appears empty"
        });
      }
    });

    CRITICAL_IDS.forEach(function (id) {
      const node = document.getElementById(id);
      if (!node && id !== "app") {
        issues.push({
          type: "missing_element",
          severity: id === "lead-form" ? "high" : "medium",
          element_id: id,
          message: "Missing critical element #" + id
        });
      }
    });

    const images = scope.querySelectorAll("img");
    let brokenImages = 0;
    images.forEach(function (img) {
      if (img.complete && img.naturalWidth === 0 && img.src) {
        brokenImages += 1;
      }
    });
    if (brokenImages > 0) {
      issues.push({
        type: "broken_images",
        severity: "medium",
        count: brokenImages,
        message: brokenImages + " image(s) failed to load"
      });
    }

    const layoutIssues = detectLayoutChaos(scope);
    issues.push.apply(issues, layoutIssues);

    const main = scope.querySelector("main") || scope;
    const sectionNodes = main.querySelectorAll("section, footer.site-footer");
    const structure = [];
    sectionNodes.forEach(function (node, index) {
      structure.push({
        index: index,
        tag: node.tagName.toLowerCase(),
        id: node.id || null,
        track: node.getAttribute("data-track-section") || null,
        classes: node.className || "",
        height: Math.round(node.getBoundingClientRect().height)
      });
    });

    return {
      ok: issues.filter(function (i) { return i.severity === "high"; }).length === 0,
      sections: sections,
      structure: structure,
      issues: issues,
      metrics: {
        section_count: sectionNodes.length,
        image_count: images.length,
        broken_images: brokenImages,
        interactive_count: scope.querySelectorAll("a, button, input, textarea").length
      },
      scanned_at: Date.now()
    };
  } catch (error) {
    return {
      ok: false,
      sections: sections,
      structure: [],
      issues: [{ type: "scanner_error", severity: "low", message: String(error) }],
      metrics: {},
      scanned_at: Date.now()
    };
  }
}

/**
 * @param {ParentNode} scope
 * @returns {object[]}
 */
function detectLayoutChaos(scope) {
  const issues = [];
  const main = scope.querySelector("main") || scope;
  const blocks = main.querySelectorAll("section");

  for (let i = 0; i < blocks.length - 1; i++) {
    const current = blocks[i].getBoundingClientRect();
    const next = blocks[i + 1].getBoundingClientRect();
    const gap = next.top - current.bottom;

    if (gap > 240) {
      issues.push({
        type: "spacing_gap",
        severity: "low",
        section_index: i,
        gap_px: Math.round(gap),
        message: "Large vertical gap (" + Math.round(gap) + "px) between sections " + i + " and " + (i + 1)
      });
    }

    if (next.top < current.bottom - 4) {
      issues.push({
        type: "overlap",
        severity: "medium",
        section_index: i,
        message: "Sections " + i + " and " + (i + 1) + " may overlap"
      });
    }
  }

  const offscreen = [];
  blocks.forEach(function (block, index) {
    const rect = block.getBoundingClientRect();
    if (rect.width > 0 && rect.right < 0) {
      offscreen.push(index);
    }
  });

  if (offscreen.length > 0) {
    issues.push({
      type: "offscreen_sections",
      severity: "low",
      indexes: offscreen,
      message: "Some sections render off-screen horizontally"
    });
  }

  return issues;
}
