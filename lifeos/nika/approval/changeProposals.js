/**
 * Change Proposals — stores Nika-suggested changes pending approval.
 */

const MAX_PROPOSALS = 50;

/**
 * @returns {object[]}
 */
export function getProposals() {
  try {
    return Array.isArray(window.__NIKA_PROPOSALS__) ? window.__NIKA_PROPOSALS__ : [];
  } catch (_error) {
    return [];
  }
}

/**
 * @param {object[]} proposals
 */
export function publishProposals(proposals) {
  try {
    window.__NIKA_PROPOSALS__ = proposals.slice(0, MAX_PROPOSALS);
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {object} decision
 * @param {{ classification: string, actionCode: string, risk: object }} meta
 * @returns {object}
 */
export function buildProposal(decision, meta) {
  return {
    id: "prop-" + (decision.id || Date.now()),
    decision_id: decision.id,
    type: decision.type,
    action: decision.action,
    target: decision.target || "",
    params: decision.params || {},
    priority: decision.priority || "LOW",
    source: decision.source || "",
    action_code: meta.actionCode,
    classification: meta.classification,
    risk: meta.risk,
    status: "pending",
    created_at: Date.now(),
    updated_at: Date.now()
  };
}

/**
 * @param {object[]} decisions
 * @param {function} enrichFn
 * @returns {object[]}
 */
export function createProposalsFromDecisions(decisions, enrichFn) {
  const existing = getProposals();
  const byDecisionId = new Map();

  existing.forEach(function (p) {
    if (p.decision_id) {
      byDecisionId.set(p.decision_id, p);
    }
  });

  const next = [];

  (decisions || []).forEach(function (decision) {
    if (!decision || !decision.action) {
      return;
    }

    const enriched = enrichFn(decision);
    if (!enriched) {
      return;
    }

    const prior = byDecisionId.get(decision.id);
    if (prior && (prior.status === "approved" || prior.status === "rejected")) {
      next.push(prior);
      return;
    }

    const proposal = buildProposal(decision, enriched);
    if (prior) {
      proposal.status = prior.status;
      proposal.user_note = prior.user_note;
      proposal.approved_at = prior.approved_at;
      proposal.rejected_at = prior.rejected_at;
    }

    next.push(proposal);
  });

  publishProposals(next);
  return next;
}

/**
 * @param {string} proposalId
 * @param {object} patch
 * @returns {object|null}
 */
export function updateProposal(proposalId, patch) {
  const list = getProposals();
  let updated = null;

  const next = list.map(function (p) {
    if (p.id !== proposalId) {
      return p;
    }
    updated = Object.assign({}, p, patch, { updated_at: Date.now() });
    return updated;
  });

  publishProposals(next);
  return updated;
}

/**
 * @param {string} [status]
 * @returns {object[]}
 */
export function filterProposals(status) {
  const list = getProposals();
  if (!status) {
    return list;
  }
  return list.filter(function (p) { return p.status === status; });
}

/**
 * @returns {object[]}
 */
export function getApprovedDecisions() {
  const production = window.__LIFEOS_PRODUCTION_MODE__ === true;
  const statuses = production ? ["approved"] : ["approved", "auto_approved"];

  let list = [];
  statuses.forEach(function (status) {
    list = list.concat(filterProposals(status));
  });

  return list.map(function (p) {
    return Object.assign({}, p.decision_id ? { id: p.decision_id } : {}, {
      type: p.type,
      action: p.action,
      target: p.target,
      params: p.params,
      priority: p.priority,
      source: p.source,
      code: p.action_code,
      executable: true,
      classification: p.classification,
      proposal_id: p.id,
      approved: true,
      auto: p.auto === true,
      user_approved: p.status === "approved",
      explicit_approval: p.status === "approved" && p.auto !== true
    });
  });
}
