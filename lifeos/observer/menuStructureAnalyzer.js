/**
 * Menu / section flow analyzer — validates WAFS landing narrative order.
 */

/** Core narrative flow (LifeOS standard). */
const CANONICAL_FLOW = [
  { key: "hero", matchers: ['[data-track-section="hero"]', "section.hero", ".hero.section"] },
  { key: "video", matchers: ["#video", '[data-track-section="video"]', ".section--video"] },
  { key: "problem", matchers: ["#problem", '[data-track-section="problem"]', ".section--problem"] },
  { key: "insight", matchers: ["#insight", '[data-track-section="insight"]', ".section--insight"] },
  { key: "cta", matchers: ["#cta", "#lead-form", '[data-track-section="cta"]', ".section--cta"] },
  { key: "footer", matchers: ["footer.site-footer", "footer[role='contentinfo']"] }
];

/**
 * @param {ParentNode} [root]
 * @returns {Element|null}
 */
function findFirst(root, matchers) {
  for (let i = 0; i < matchers.length; i++) {
    try {
      const el = root.querySelector(matchers[i]);
      if (el) {
        return el;
      }
    } catch (_error) {
      /* invalid selector — skip */
    }
  }
  return null;
}

/**
 * @param {ParentNode} [root]
 * @returns {object}
 */
export function analyzeMenuStructure(root) {
  const scope = (root && root.querySelector) ? root : document.getElementById("app") || document;
  const detected = [];
  const deviations = [];
  const missing = [];

  try {
    CANONICAL_FLOW.forEach(function (step) {
      const el = findFirst(scope, step.matchers);
      detected.push({
        key: step.key,
        present: Boolean(el),
        element: el ? { id: el.id || null, tag: el.tagName.toLowerCase() } : null
      });

      if (!el) {
        missing.push(step.key);
      }
    });

    const presentNodes = detected
      .filter(function (d) { return d.present; })
      .map(function (d) {
        return findFirst(scope, CANONICAL_FLOW.find(function (s) { return s.key === d.key; }).matchers);
      });

    let orderValid = true;
    for (let i = 0; i < presentNodes.length - 1; i++) {
      const a = presentNodes[i];
      const b = presentNodes[i + 1];
      if (!a || !b) {
        continue;
      }

      const position = a.compareDocumentPosition(b);
      const follows = Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING);
      if (!follows) {
        orderValid = false;
        deviations.push({
          type: "order_violation",
          before: detected[i].key,
          after: detected[i + 1].key,
          message:
            "Expected " +
            detected[i].key +
            " before " +
            detected[i + 1].key +
            ", but DOM order differs"
        });
      }
    }

    const chaotic = !orderValid || missing.length >= 2;
    const flowLabel = chaotic ? "CHAOTIC UI FLOW" : "STABLE UI FLOW";

    const navLinks = scope.querySelectorAll("header nav a, .site-header nav a");
    const navItems = [];
    navLinks.forEach(function (link) {
      navItems.push({
        text: (link.textContent || "").trim().slice(0, 80),
        href: link.getAttribute("href") || ""
      });
    });

    return {
      ok: !chaotic,
      flow: CANONICAL_FLOW.map(function (s) { return s.key; }),
      detected: detected,
      missing: missing,
      deviations: deviations,
      chaotic: chaotic,
      flow_status: flowLabel,
      nav_items: navItems,
      analyzed_at: Date.now()
    };
  } catch (error) {
    return {
      ok: false,
      flow: CANONICAL_FLOW.map(function (s) { return s.key; }),
      detected: detected,
      missing: missing,
      deviations: [{ type: "analyzer_error", message: String(error) }],
      chaotic: true,
      flow_status: "CHAOTIC UI FLOW",
      nav_items: [],
      analyzed_at: Date.now()
    };
  }
}
