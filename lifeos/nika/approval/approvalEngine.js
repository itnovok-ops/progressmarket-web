/**
 * Approval Engine — production requires explicit user confirmation (no SAFE auto-execute).
 */

import {
  classifyDecision,
  inferActionCode,
  CLASS_CRITICAL,
  CLASS_SAFE
} from "./decisionClassifier.js";
import { calculateRisk, canAutoExecute } from "./riskEngine.js";
import {
  createProposalsFromDecisions,
  getApprovedDecisions,
  getProposals,
  publishProposals,
  updateProposal
} from "./changeProposals.js";
import { mountDecisionPanel, refreshDecisionPanel } from "./uiDecisionPanel.js";

const APPROVAL_EVENT = "lifeos:nika:approval:update";
let started = false;

/**
 * @param {object} patch
 */
function publishApprovalState(patch) {
  try {
    const current = window.__NIKA_APPROVAL_STATE__ || {
      active: false,
      pending: 0,
      approved: 0,
      blocked: 0
    };
    window.__NIKA_APPROVAL_STATE__ = Object.assign({}, current, patch, {
      updated_at: Date.now()
    });
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {object} decision
 * @param {object} [context]
 * @returns {object|null}
 */
function enrichDecision(decision, context) {
  const actionCode = inferActionCode(decision);
  if (actionCode === "noop") {
    return null;
  }

  const classification = classifyDecision(decision, actionCode);
  const risk = calculateRisk(decision, classification, context);

  return { actionCode: actionCode, classification: classification, risk: risk };
}

/**
 * Auto-approve SAFE proposals; leave REVIEW/CRITICAL pending.
 * @param {object[]} proposals
 * @returns {object[]}
 */
function applyAutoApproval(proposals) {
  if (window.__LIFEOS_PRODUCTION_MODE__ === true) {
    return proposals.map(function (proposal) {
      if (proposal.status === "approved" || proposal.status === "rejected") {
        return proposal;
      }
      if (proposal.classification === CLASS_CRITICAL) {
        return Object.assign({}, proposal, { status: "blocked" });
      }
      return Object.assign({}, proposal, { status: "pending", auto: false });
    });
  }

  return proposals.map(function (proposal) {
    if (proposal.status === "approved" || proposal.status === "rejected") {
      return proposal;
    }

    if (canAutoExecute(proposal.classification)) {
      return Object.assign({}, proposal, {
        status: "auto_approved",
        approved_at: Date.now(),
        auto: true
      });
    }

    if (proposal.classification === CLASS_CRITICAL) {
      return Object.assign({}, proposal, { status: "blocked" });
    }

    return Object.assign({}, proposal, { status: "pending" });
  });
}

/**
 * @param {object[]} decisions
 * @param {object} [context]
 * @returns {object}
 */
export function processApprovalCycle(decisions, context) {
  const ctx = context || collectContext();

  let proposals = createProposalsFromDecisions(decisions, function (d) {
    return enrichDecision(d, ctx);
  });

  proposals = applyAutoApproval(proposals);
  publishProposals(proposals);

  const approved = getApprovedDecisions();
  window.__NIKA_APPROVED_DECISIONS__ = approved;

  const pending = proposals.filter(function (p) { return p.status === "pending"; }).length;
  const blocked = proposals.filter(function (p) { return p.status === "blocked"; }).length;

  publishApprovalState({
    active: true,
    pending: pending,
    blocked: blocked,
    approved: approved.length,
    proposals: proposals
  });

  const payload = {
    proposals: proposals,
    approved: approved,
    pending: pending,
    blocked: blocked,
    generated_at: Date.now()
  };

  document.dispatchEvent(
    new CustomEvent(APPROVAL_EVENT, { detail: payload })
  );

  return payload;
}

/**
 * @returns {object}
 */
function collectContext() {
  try {
    return {
      landing_stats: window.__LIFEOS_LANDING_STATS__ || {},
      funnel: window.__LIFEOS_FUNNEL_METRICS__ || {},
      report: window.__NIKA_REPORT__ || {}
    };
  } catch (_error) {
    return {};
  }
}

/**
 * @param {string} proposalId
 * @returns {object}
 */
export function approveProposal(proposalId) {
  const proposal = getProposals().find(function (p) { return p.id === proposalId; });
  if (!proposal) {
    return { ok: false, reason: "not_found" };
  }

  if (proposal.status === "rejected") {
    return { ok: false, reason: "already_rejected" };
  }

  updateProposal(proposalId, {
    status: "approved",
    approved_at: Date.now(),
    auto: false,
    user_confirmed: true,
    explicit_approval: true
  });

  syncApprovedFromProposals();
  refreshDecisionPanel();

  document.dispatchEvent(
    new CustomEvent(APPROVAL_EVENT, { detail: { action: "approve", proposal_id: proposalId } })
  );

  document.dispatchEvent(new CustomEvent("lifeos:nika:update"));

  return { ok: true, proposal_id: proposalId };
}

/**
 * @param {string} proposalId
 * @returns {object}
 */
export function rejectProposal(proposalId) {
  const proposal = getProposals().find(function (p) { return p.id === proposalId; });
  if (!proposal) {
    return { ok: false, reason: "not_found" };
  }

  updateProposal(proposalId, {
    status: "rejected",
    rejected_at: Date.now()
  });

  syncApprovedFromProposals();
  refreshDecisionPanel();

  document.dispatchEvent(
    new CustomEvent(APPROVAL_EVENT, { detail: { action: "reject", proposal_id: proposalId } })
  );

  return { ok: true, proposal_id: proposalId };
}

/**
 * Sync __NIKA_APPROVED_DECISIONS__ from current proposal list.
 */
function syncApprovedFromProposals() {
  window.__NIKA_APPROVED_DECISIONS__ = getApprovedDecisions();
  const proposals = getProposals();
  publishApprovalState({
    pending: proposals.filter(function (p) { return p.status === "pending"; }).length,
    blocked: proposals.filter(function (p) { return p.status === "blocked"; }).length,
    approved: window.__NIKA_APPROVED_DECISIONS__.length
  });
}

/**
 * Run gate from current Nika globals.
 * @returns {object}
 */
export function runApprovalGate() {
  const decisions = Array.isArray(window.__NIKA_DECISIONS__) ? window.__NIKA_DECISIONS__ : [];
  return processApprovalCycle(decisions, collectContext());
}

/**
 * @param {{ root?: ParentNode }} [options]
 */
export function startApprovalGate(options) {
  if (started) {
    return runApprovalGate();
  }

  started = true;
  window.__NIKA_DEBUG_OVERLAY__ = false;
  window.__LIFEOS_SEAL_NIKA_PANEL__ = true;
  window.__NIKA_PROPOSALS__ = window.__NIKA_PROPOSALS__ || [];
  window.__NIKA_APPROVED_DECISIONS__ = window.__NIKA_APPROVED_DECISIONS__ || [];
  window.__NIKA_APPROVAL_STATE__ = window.__NIKA_APPROVAL_STATE__ || { active: false };

  window.__NIKA_APPROVE__ = approveProposal;
  window.__NIKA_REJECT__ = rejectProposal;
  window.__NIKA_RUN_APPROVAL_GATE__ = runApprovalGate;

  if (window.__NIKA_DEBUG_OVERLAY__ === true) {
    mountDecisionPanel(options?.root);
  }

  document.addEventListener("lifeos:nika:update", function () {
    runApprovalGate();
    if (window.__NIKA_DEBUG_OVERLAY__ === true) {
      refreshDecisionPanel();
    }
  });

  window.setTimeout(function () {
    runApprovalGate();
    if (window.__NIKA_DEBUG_OVERLAY__ === true) {
      refreshDecisionPanel();
    }
  }, 1800);

  publishApprovalState({ active: true, started_at: Date.now() });

  return window.__NIKA_APPROVAL_STATE__;
}
