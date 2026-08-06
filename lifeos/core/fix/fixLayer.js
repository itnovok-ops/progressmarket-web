/**
 * Fix Layer — connects diagnostics to proposals, approval, and controlled execution.
 *
 * Nika proposes fixes automatically.
 * User approves via __APPROVE_FIX__.
 * Execution runs ONLY via __APPLY_APPROVED_FIXES__.
 */

import { generateFixProposals } from "./fixProposalEngine.js";
import { installApprovalGate } from "./approvalGate.js";
import { installFixExecutionEngine } from "./fixExecutionEngine.js";

let fixLayerInstalled = false;

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

/**
 * Generate and store fix proposals from latest diagnostics.
 * @param {object} diagnostics
 * @returns {object[]}
 */
export function updateFixProposals(diagnostics) {
  const nika = ensureNikaState();
  const proposals = generateFixProposals(diagnostics);

  const preserved = nika.fixProposals.filter(function (item) {
    return item.status === "approved" || item.status === "applied";
  });

  const preservedIds = new Set(preserved.map(function (item) {
    return item.linkedIssue;
  }));

  const merged = preserved.slice();
  proposals.forEach(function (proposal) {
    if (!preservedIds.has(proposal.linkedIssue)) {
      merged.push(proposal);
    }
  });

  nika.fixProposals = merged;
  window.__NIKA_STATE__ = nika;
  window.__NIKA_FIX_PROPOSALS_LAST__ = merged;

  return merged;
}

/**
 * Install fix layer hooks and global APIs.
 */
export function installFixLayer() {
  if (fixLayerInstalled) {
    return;
  }
  fixLayerInstalled = true;

  installApprovalGate();
  installFixExecutionEngine();

  if (!Array.isArray(window.__APPROVED_FIXES__)) {
    window.__APPROVED_FIXES__ = [];
  }

  window.addEventListener("lifeos:diagnostics-complete", function (event) {
    const diagnostics = event.detail?.diagnostics;
    if (diagnostics) {
      updateFixProposals(diagnostics);
    }
  });

  window.__REFRESH_FIX_PROPOSALS__ = function () {
    const diagnostics = window.__NIKA_STATE__?.diagnostics || window.__NIKA_DIAGNOSTICS_LAST__;
    return updateFixProposals(diagnostics);
  };
}

if (typeof window !== "undefined") {
  window.installFixLayer = installFixLayer;
  window.updateFixProposals = updateFixProposals;
}
