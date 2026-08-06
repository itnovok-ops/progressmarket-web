/**
 * UI Decision Panel — "Nika Insights & Recommendations" overlay.
 */

import { CLASS_CRITICAL, CLASS_REVIEW, CLASS_SAFE } from "./decisionClassifier.js";
import { getProposals } from "./changeProposals.js";

const PANEL_ID = "lifeos-nika-insight-panel";
const STYLE_ID = "lifeos-nika-insight-styles";

/**
 * @param {ParentNode} [_root]
 */
export function mountDecisionPanel(_root) {
  try {
    if (window.__NIKA_DEBUG_OVERLAY__ === false || window.__LIFEOS_SEAL_NIKA_PANEL__ === true) {
      return;
    }

    if (document.getElementById(PANEL_ID)) {
      return;
    }

    injectStyles();

    const panel = document.createElement("aside");
    panel.id = PANEL_ID;
    panel.className = "lifeos-nika-panel";
    panel.setAttribute("aria-label", "Nika Insights and Recommendations");
    panel.innerHTML =
      '<div class="lifeos-nika-panel__header">' +
      '<button type="button" class="lifeos-nika-panel__toggle" data-nika-toggle aria-expanded="true">Nika Insights &amp; Recommendations</button>' +
      '<span class="lifeos-nika-panel__badge" data-nika-badge hidden>0</span>' +
      "</div>" +
      '<div class="lifeos-nika-panel__body" data-nika-body>' +
      '<div class="lifeos-nika-panel__stats" data-nika-stats></div>' +
      '<div class="lifeos-nika-panel__list" data-nika-list></div>' +
      "</div>";

    document.body.appendChild(panel);

    panel.querySelector("[data-nika-toggle]").addEventListener("click", function () {
      const collapsed = panel.classList.toggle("is-collapsed");
      this.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });

    refreshDecisionPanel();
  } catch (_error) {
    /* panel must never break landing */
  }
}

/**
 * Refresh panel content from globals.
 */
export function refreshDecisionPanel() {
  try {
    if (window.__NIKA_DEBUG_OVERLAY__ === false || window.__LIFEOS_SEAL_NIKA_PANEL__ === true) {
      return;
    }

    const panel = document.getElementById(PANEL_ID);
    if (!panel) {
      return;
    }

    renderStats(panel.querySelector("[data-nika-stats]"));
    renderProposals(panel.querySelector("[data-nika-list]"));

    const pending = getProposals().filter(function (p) {
      return p.status === "pending" || p.status === "blocked";
    }).length;

    const badge = panel.querySelector("[data-nika-badge]");
    if (badge) {
      if (pending > 0) {
        badge.hidden = false;
        badge.textContent = String(pending);
      } else {
        badge.hidden = true;
      }
    }
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {HTMLElement} container
 */
function renderStats(container) {
  if (!container) {
    return;
  }

  const landing = window.__LIFEOS_LANDING_STATS__ || {};
  const funnel = window.__LIFEOS_FUNNEL_METRICS__ || {};
  const report = window.__NIKA_REPORT__ || {};

  const ctr = formatPct(landing.ctr);
  const conv = formatPct(funnel.rates?.cta || landing.cta_rate);
  const health = report.systemHealth || "—";
  const anomalies = Array.isArray(report.anomalies) ? report.anomalies.length : 0;

  container.innerHTML =
    '<div class="lifeos-nika-panel__stat"><span>CTR</span><strong>' + esc(ctr) + "</strong></div>" +
    '<div class="lifeos-nika-panel__stat"><span>Conversion</span><strong>' + esc(conv) + "</strong></div>" +
    '<div class="lifeos-nika-panel__stat"><span>Health</span><strong>' + esc(health) + "</strong></div>" +
    '<div class="lifeos-nika-panel__stat"><span>Alerts</span><strong>' + esc(String(anomalies)) + "</strong></div>";
}

/**
 * @param {HTMLElement} container
 */
function renderProposals(container) {
  if (!container) {
    return;
  }

  const proposals = getProposals().slice(0, 8);

  if (!proposals.length) {
    container.innerHTML =
      '<p class="lifeos-nika-panel__empty">Nika is analyzing — recommendations will appear here.</p>';
    return;
  }

  container.innerHTML = proposals
    .map(function (p) {
      return renderProposalCard(p);
    })
    .join("");

  container.querySelectorAll("[data-nika-approve]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const id = btn.getAttribute("data-nika-approve");
      if (typeof window.__NIKA_APPROVE__ === "function") {
        window.__NIKA_APPROVE__(id);
      }
    });
  });

  container.querySelectorAll("[data-nika-reject]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const id = btn.getAttribute("data-nika-reject");
      if (typeof window.__NIKA_REJECT__ === "function") {
        window.__NIKA_REJECT__(id);
      }
    });
  });
}

/**
 * @param {object} proposal
 * @returns {string}
 */
function renderProposalCard(proposal) {
  const classLabel = proposal.classification || CLASS_REVIEW;
  const classMod = classLabel.toLowerCase();
  const risk = proposal.risk || {};
  const problem = detectProblem(proposal);
  const showActions =
    proposal.status === "pending" || proposal.status === "blocked";

  let statusLine = "";
  if (proposal.status === "auto_approved") {
    statusLine = '<span class="lifeos-nika-panel__status is-auto">Auto-applied (SAFE)</span>';
  } else if (proposal.status === "approved") {
    statusLine = '<span class="lifeos-nika-panel__status is-approved">Approved</span>';
  } else if (proposal.status === "rejected") {
    statusLine = '<span class="lifeos-nika-panel__status is-rejected">Declined</span>';
  } else if (proposal.status === "blocked") {
    statusLine = '<span class="lifeos-nika-panel__status is-critical">Blocked — confirmation required</span>';
  }

  let actions = "";
  if (showActions) {
    const yesLabel = classLabel === CLASS_CRITICAL ? "Confirm" : "Yes";
    actions =
      '<div class="lifeos-nika-panel__actions">' +
      '<button type="button" class="lifeos-nika-panel__btn is-yes" data-nika-approve="' +
      escAttr(proposal.id) +
      '">' +
      yesLabel +
      "</button>" +
      '<button type="button" class="lifeos-nika-panel__btn is-no" data-nika-reject="' +
      escAttr(proposal.id) +
      '">No</button>' +
      "</div>";
  }

  return (
    '<article class="lifeos-nika-panel__card is-' +
    classMod +
    '">' +
    '<div class="lifeos-nika-panel__card-head">' +
    '<span class="lifeos-nika-panel__tag">' +
    esc(classLabel) +
    "</span>" +
    '<span class="lifeos-nika-panel__priority">' +
    esc(proposal.priority || "LOW") +
    "</span>" +
    "</div>" +
    '<p class="lifeos-nika-panel__problem"><strong>Problem:</strong> ' +
    esc(problem) +
    "</p>" +
    '<p class="lifeos-nika-panel__rec"><strong>Recommendation:</strong> ' +
    esc(proposal.action || "—") +
    "</p>" +
    '<p class="lifeos-nika-panel__risk">Risk — UI ' +
    esc(String(risk.ui ?? "—")) +
    " · Conv " +
    esc(String(risk.conversion ?? "—")) +
    " · Backend " +
    esc(String(risk.backend ?? "—")) +
    "</p>" +
    statusLine +
    actions +
    "</article>"
  );
}

/**
 * @param {object} proposal
 * @returns {string}
 */
function detectProblem(proposal) {
  const source = String(proposal.source || "");
  if (source.indexOf("anomaly:") === 0) {
    return source.replace("anomaly:", "").replace(/_/g, " ");
  }
  if (source.indexOf("insight:") === 0) {
    return "Insight detected (" + proposal.type + ")";
  }
  if (proposal.classification === CLASS_SAFE) {
    return "Optimization opportunity (low risk)";
  }
  if (proposal.classification === CLASS_CRITICAL) {
    return "High-impact system change detected";
  }
  return "Conversion or layout issue detected";
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent =
    "#" +
    PANEL_ID +
    "{position:fixed;bottom:16px;right:16px;z-index:9990;width:min(380px,calc(100vw - 24px));max-height:min(70vh,520px);display:flex;flex-direction:column;border-radius:14px;background:rgba(12,16,26,.97);border:1px solid rgba(99,179,255,.28);box-shadow:0 12px 40px rgba(0,0,0,.45);color:#e8edf5;font-family:system-ui,-apple-system,sans-serif;font-size:13px;overflow:hidden}" +
    ".lifeos-nika-panel.is-collapsed .lifeos-nika-panel__body{display:none}" +
    ".lifeos-nika-panel__header{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08)}" +
    ".lifeos-nika-panel__toggle{flex:1;text-align:left;background:none;border:none;color:#f4f7fc;font-size:13px;font-weight:600;cursor:pointer;padding:0}" +
    ".lifeos-nika-panel__badge{min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:#3b82f6;color:#fff;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}" +
    ".lifeos-nika-panel__body{overflow:auto;padding:10px 12px 12px}" +
    ".lifeos-nika-panel__stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}" +
    ".lifeos-nika-panel__stat{padding:8px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}" +
    ".lifeos-nika-panel__stat span{display:block;font-size:11px;color:#9aa8bc;margin-bottom:2px}" +
    ".lifeos-nika-panel__stat strong{font-size:14px;color:#fff}" +
    ".lifeos-nika-panel__empty{margin:0;color:#9aa8bc;font-size:12px;line-height:1.45}" +
    ".lifeos-nika-panel__card{padding:10px;border-radius:10px;margin-bottom:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07)}" +
    ".lifeos-nika-panel__card.is-safe{border-color:rgba(74,222,128,.35)}" +
    ".lifeos-nika-panel__card.is-review{border-color:rgba(251,191,36,.35)}" +
    ".lifeos-nika-panel__card.is-critical{border-color:rgba(248,113,113,.45)}" +
    ".lifeos-nika-panel__card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}" +
    ".lifeos-nika-panel__tag{font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#93c5fd}" +
    ".lifeos-nika-panel__priority{font-size:10px;color:#9aa8bc}" +
    ".lifeos-nika-panel__problem,.lifeos-nika-panel__rec,.lifeos-nika-panel__risk{margin:0 0 6px;line-height:1.4;font-size:12px}" +
    ".lifeos-nika-panel__risk{color:#9aa8bc;font-size:11px}" +
    ".lifeos-nika-panel__status{display:inline-block;margin-bottom:6px;font-size:11px;font-weight:600}" +
    ".lifeos-nika-panel__status.is-auto{color:#4ade80}" +
    ".lifeos-nika-panel__status.is-approved{color:#60a5fa}" +
    ".lifeos-nika-panel__status.is-rejected{color:#f87171}" +
    ".lifeos-nika-panel__status.is-critical{color:#fb923c}" +
    ".lifeos-nika-panel__actions{display:flex;gap:6px}" +
    ".lifeos-nika-panel__btn{flex:1;padding:6px 10px;border-radius:8px;border:1px solid transparent;font-size:12px;font-weight:600;cursor:pointer}" +
    ".lifeos-nika-panel__btn.is-yes{background:rgba(59,130,246,.25);border-color:rgba(59,130,246,.5);color:#dbeafe}" +
    ".lifeos-nika-panel__btn.is-no{background:rgba(248,113,113,.15);border-color:rgba(248,113,113,.4);color:#fecaca}" +
    "@media(max-width:640px){#" +
    PANEL_ID +
    "{bottom:8px;right:8px;left:8px;width:auto}}";

  document.head.appendChild(style);
}

/**
 * @param {number|undefined} value
 * @returns {string}
 */
function formatPct(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }
  return (value * 100).toFixed(1) + "%";
}

/**
 * @param {string} value
 * @returns {string}
 */
function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string} value
 * @returns {string}
 */
function escAttr(value) {
  return esc(value).replace(/'/g, "&#39;");
}
