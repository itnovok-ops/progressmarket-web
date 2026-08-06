/**
 * Fix Proposal Engine — generates advisory fix proposals from diagnostics.
 * Proposals are suggestions only; execution requires explicit approval.
 */

const FIX_TEMPLATES = {
  hero_video_missing: {
    title: "Restore hero video mount",
    description: "Video section may not have mounted #heroVideo. Ensure boot render completes and video node persists.",
    target: "video",
    riskLevel: "medium",
    patch:
      "Suggestion: verify VideoSection output and call initHeroVideoPlayer() after applyState(). Do not recreate #heroVideo via innerHTML.",
    linkedIssue: "hero_video_missing"
  },
  app_not_ready: {
    title: "Mark application shell ready",
    description: "Preboot CSS may still hide #app because shell.appReady is false.",
    target: "ui",
    riskLevel: "low",
    patch:
      "Suggestion: applyState({ shell: { appReady: true, preloaderHidden: true } }) via renderEngine only.",
    linkedIssue: "app_not_ready"
  },
  video_paused: {
    title: "Restore video section visibility",
    description: "Video section is visible but playback is stalled. Visibility can be restored via state.",
    target: "video",
    riskLevel: "low",
    patch:
      "Suggestion: applyState({ video: { visible: true } }) then initHeroVideoPlayer() if not yet bound.",
    linkedIssue: "video_paused"
  },
  nika_state_missing: {
    title: "Initialize Nika analytics state",
    description: "Analytics bridge has not created __NIKA_STATE__ with events collection.",
    target: "nika",
    riskLevel: "low",
    patch: "Suggestion: call initAnalyticsBridge() once on boot. No DOM changes required.",
    linkedIssue: "nika_state_missing"
  },
  nika_health_low: {
    title: "Refresh Nika engagement baseline",
    description: "Nika health score is degraded. Re-run diagnostics after user interaction events.",
    target: "nika",
    riskLevel: "low",
    patch: "Suggestion: scheduleDiagnostics('nika_health') and verify analyticsBridge event flow.",
    linkedIssue: "nika_health_low"
  },
  render_engine_missing: {
    title: "Restore render engine availability",
    description: "window.applyState is unavailable — UI cannot be updated safely.",
    target: "render",
    riskLevel: "high",
    patch:
      "Suggestion: reload page and verify renderEngine.js module load. No automatic code patch available.",
    linkedIssue: "render_engine_missing"
  },
  report_missing: {
    title: "Generate initial system report",
    description: "Diagnostics cannot read reports/system-report.json yet.",
    target: "system",
    riskLevel: "medium",
    patch: "Suggestion: call window.__GENERATE_SYSTEM_REPORT__('manual') after boot completes.",
    linkedIssue: "report_missing"
  }
};

const VIDEO_HIDDEN_FIX = {
  title: "Show video section",
  description: "System report indicates video section is hidden.",
  target: "video",
  riskLevel: "low",
  patch: "Suggestion: applyState({ video: { visible: true } }) via renderEngine.",
  linkedIssue: "video_section_hidden"
};

const UI_SECTIONS_FIX = {
  title: "Show all page sections",
  description: "UI sections may be hidden by state.ui.sectionsVisible.",
  target: "ui",
  riskLevel: "low",
  patch: "Suggestion: applyState({ ui: { sectionsVisible: true } }) via renderEngine.",
  linkedIssue: "ui_sections_hidden"
};

let proposalSequence = 0;

function nextFixId() {
  proposalSequence += 1;
  return "fix_" + String(proposalSequence).padStart(3, "0");
}

function buildProposal(template, diagnostics) {
  return {
    id: nextFixId(),
    title: template.title,
    description: template.description,
    target: template.target,
    riskLevel: template.riskLevel,
    patch: template.patch,
    linkedIssue: template.linkedIssue,
    diagnosticsRef: diagnostics?.lastRun || null,
    status: "proposed",
    createdAt: new Date().toISOString()
  };
}

/**
 * Generate fix proposals from diagnostics output (advisory only).
 * @param {object} diagnostics
 * @returns {object[]}
 */
export function generateFixProposals(diagnostics) {
  proposalSequence = 0;
  const proposals = [];
  const seen = new Set();

  if (!diagnostics || typeof diagnostics !== "object") {
    return proposals;
  }

  (diagnostics.issues || []).forEach(function (issue) {
    const template = FIX_TEMPLATES[issue.code];
    if (!template || seen.has(issue.code)) {
      return;
    }
    seen.add(issue.code);
    proposals.push(buildProposal(template, diagnostics));
  });

  if (diagnostics.riskLevel === "high" && !seen.has("render_engine_missing")) {
    const renderIssue = (diagnostics.issues || []).find(function (i) {
      return i.code === "render_engine_missing";
    });
    if (renderIssue && FIX_TEMPLATES.render_engine_missing) {
      proposals.push(buildProposal(FIX_TEMPLATES.render_engine_missing, diagnostics));
      seen.add("render_engine_missing");
    }
  }

  if (diagnostics.stabilityScore < 80 && !seen.has("ui_sections_hidden")) {
    proposals.push(buildProposal(UI_SECTIONS_FIX, diagnostics));
    seen.add("ui_sections_hidden");
  }

  if ((diagnostics.issues || []).some(function (i) {
    return i.code === "video_paused" || i.code === "hero_video_missing";
  }) && !seen.has("video_section_hidden")) {
    proposals.push(buildProposal(VIDEO_HIDDEN_FIX, diagnostics));
    seen.add("video_section_hidden");
  }

  if (!proposals.length && diagnostics.stabilityScore >= 90) {
    proposals.push({
      id: nextFixId(),
      title: "No fixes required",
      description: "System diagnostics report healthy state. Continue monitoring.",
      target: "system",
      riskLevel: "low",
      patch: "Suggestion: no action required. Run __RUN_DIAGNOSTICS__() periodically.",
      linkedIssue: "system_healthy",
      diagnosticsRef: diagnostics.lastRun || null,
      status: "proposed",
      createdAt: new Date().toISOString()
    });
  }

  return proposals;
}

if (typeof window !== "undefined") {
  window.generateFixProposals = generateFixProposals;
}
