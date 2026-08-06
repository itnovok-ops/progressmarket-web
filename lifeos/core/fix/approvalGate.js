/**
 * Approval Gate — user must explicitly approve fixes before execution.
 * Approval does NOT auto-execute.
 */

function ensureNikaState() {
  if (!window.__NIKA_STATE__ || typeof window.__NIKA_STATE__ !== "object") {
    window.__NIKA_STATE__ = {
      mode: "advisory",
      diagnostics: {},
      fixProposals: [],
      approvedFixes: [],
      appliedFixes: [],
      events: [],
      insights: [],
      recommendations: [],
      alerts: []
    };
  }

  const state = window.__NIKA_STATE__;
  state.fixProposals = Array.isArray(state.fixProposals) ? state.fixProposals : [];
  state.approvedFixes = Array.isArray(state.approvedFixes) ? state.approvedFixes : [];
  state.appliedFixes = Array.isArray(state.appliedFixes) ? state.appliedFixes : [];

  return state;
}

function ensureApprovedStore() {
  if (!Array.isArray(window.__APPROVED_FIXES__)) {
    window.__APPROVED_FIXES__ = [];
  }
  return window.__APPROVED_FIXES__;
}

function findProposal(fixId) {
  const nika = ensureNikaState();
  return nika.fixProposals.find(function (item) {
    return item.id === fixId;
  });
}

/**
 * Approve a fix proposal by id. Does NOT execute.
 * @param {string} fixId
 * @returns {object}
 */
export function approveFix(fixId) {
  const proposal = findProposal(fixId);
  if (!proposal) {
    return { ok: false, reason: "proposal_not_found", fixId: fixId };
  }

  if (proposal.status === "approved" || proposal.status === "applied") {
    return { ok: true, fixId: fixId, status: proposal.status, reused: true };
  }

  const nika = ensureNikaState();
  const approvedStore = ensureApprovedStore();
  const now = new Date().toISOString();

  const approval = {
    id: fixId,
    title: proposal.title,
    target: proposal.target,
    riskLevel: proposal.riskLevel,
    linkedIssue: proposal.linkedIssue,
    patch: proposal.patch,
    approvedAt: now,
    status: "approved",
    executed: false
  };

  proposal.status = "approved";
  proposal.approvedAt = now;

  const exists = approvedStore.some(function (item) {
    return item.id === fixId;
  });
  if (!exists) {
    approvedStore.push(approval);
  }

  const nikaExists = nika.approvedFixes.some(function (item) {
    return item.id === fixId;
  });
  if (!nikaExists) {
    nika.approvedFixes.push(approval);
  }

  window.__NIKA_STATE__ = nika;

  window.dispatchEvent(
    new CustomEvent("lifeos:fix-approved", {
      detail: { approval: approval }
    })
  );

  return { ok: true, fixId: fixId, status: "approved", executed: false, approval: approval };
}

/**
 * List all approved but not yet applied fixes.
 * @returns {object[]}
 */
export function listApprovedFixes() {
  ensureApprovedStore();
  const nika = ensureNikaState();
  return nika.approvedFixes.filter(function (item) {
    return item.status === "approved" && item.executed !== true;
  });
}

/**
 * Install global approval hook.
 */
export function installApprovalGate() {
  window.__APPROVE_FIX__ = approveFix;
  window.__APPROVE_FIX = approveFix;
  window.__LIST_APPROVED_FIXES__ = listApprovedFixes;
}

if (typeof window !== "undefined") {
  window.approveFix = approveFix;
  window.installApprovalGate = installApprovalGate;
}
