/**
 * Diagnostic Engine — analyzes system reports and produces Nika-ready insights.
 * Read-only: does not touch DOM or renderEngine.
 */

const ROOT_CAUSE_MAP = {
  render_engine_missing: {
    rootCause: "render_pipeline_unavailable",
    recommendation: "Verify renderEngine.js is loaded and window.applyState is defined before boot."
  },
  hero_video_missing: {
    rootCause: "hero_video_not_mounted",
    recommendation: "Ensure VideoSection renders #heroVideo once and renderPage does not recreate the node."
  },
  app_not_ready: {
    rootCause: "boot_shell_not_ready",
    recommendation: "Check shell.appReady and preloaderHidden in __APP_STATE__ during boot."
  },
  video_paused: {
    rootCause: "video_playback_stalled",
    recommendation: "Confirm heroVideoPlayer owns playback and renderEngine does not call pause/play."
  },
  nika_health_low: {
    rootCause: "nika_analytics_degraded",
    recommendation: "Review analyticsBridge event collection and engagement metrics in __NIKA_STATE__."
  },
  nika_state_missing: {
    rootCause: "nika_state_uninitialized",
    recommendation: "Initialize analyticsBridge on boot so __NIKA_STATE__ exists with events array."
  }
};

function normalizeIssue(item, severity) {
  if (!item || typeof item !== "object") {
    return null;
  }
  return {
    code: item.code || "unknown",
    message: item.message || "Unspecified issue",
    severity: severity
  };
}

function collectAllIssues(report) {
  const issues = [];
  (report.critical || []).forEach(function (item) {
    const normalized = normalizeIssue(item, "critical");
    if (normalized) issues.push(normalized);
  });
  (report.warnings || []).forEach(function (item) {
    const normalized = normalizeIssue(item, "warning");
    if (normalized) issues.push(normalized);
  });
  (report.issues || []).forEach(function (item) {
    const normalized = normalizeIssue(item, "issue");
    if (normalized) issues.push(normalized);
  });
  return issues;
}

function deriveRootCauses(issues) {
  const seen = new Set();
  const rootCauses = [];

  issues.forEach(function (issue) {
    const mapping = ROOT_CAUSE_MAP[issue.code];
    if (!mapping || seen.has(mapping.rootCause)) {
      return;
    }
    seen.add(mapping.rootCause);
    rootCauses.push({
      code: mapping.rootCause,
      source: issue.code,
      message: issue.message,
      severity: issue.severity
    });
  });

  if (!issues.length && rootCauses.length === 0) {
    rootCauses.push({
      code: "system_stable",
      source: "health_check",
      message: "No active issues detected in latest system report.",
      severity: "info"
    });
  }

  return rootCauses;
}

function deriveRecommendations(issues, report) {
  const seen = new Set();
  const recommendations = [];

  issues.forEach(function (issue) {
    const mapping = ROOT_CAUSE_MAP[issue.code];
    if (!mapping || seen.has(mapping.recommendation)) {
      return;
    }
    seen.add(mapping.recommendation);
    recommendations.push({
      id: "diag-" + issue.code,
      priority: issue.severity === "critical" ? "high" : issue.severity === "warning" ? "medium" : "low",
      category: "diagnostics",
      title: "Resolve: " + issue.code,
      message: mapping.recommendation,
      source: "diagnosticEngine"
    });
  });

  if (report.uiStatus?.renderEngine === "broken") {
    recommendations.push({
      id: "diag-render-engine",
      priority: "high",
      category: "ui",
      title: "Restore render engine",
      message: "renderEngine is not active — UI state cannot be applied reliably.",
      source: "diagnosticEngine"
    });
  }

  if (report.videoStatus?.visible === false) {
    recommendations.push({
      id: "diag-video-hidden",
      priority: "medium",
      category: "video",
      title: "Video section hidden",
      message: "Video section visibility is false — check state.video.visible and #video section CSS.",
      source: "diagnosticEngine"
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: "diag-all-clear",
      priority: "low",
      category: "maintenance",
      title: "System healthy",
      message: "Continue monitoring via automatic system reports and diagnostics loop.",
      source: "diagnosticEngine"
    });
  }

  return recommendations;
}

function resolveRiskLevel(issues) {
  const criticalCount = issues.filter(function (i) {
    return i.severity === "critical";
  }).length;
  const warningCount = issues.filter(function (i) {
    return i.severity === "warning";
  }).length;

  if (criticalCount > 0) {
    return "high";
  }
  if (warningCount > 1) {
    return "medium";
  }
  if (warningCount === 1) {
    return "medium";
  }
  return "low";
}

/**
 * Analyze a system report and return structured diagnostics for Nika.
 * @param {object} report
 * @returns {object}
 */
export function analyzeSystemReport(report) {
  if (!report || typeof report !== "object") {
    return {
      stabilityScore: 0,
      issues: [{ code: "report_missing", message: "No system report available", severity: "critical" }],
      rootCauses: [{ code: "report_unavailable", source: "reportReader", message: "System report could not be loaded", severity: "critical" }],
      recommendations: [{
        id: "diag-no-report",
        priority: "high",
        category: "diagnostics",
        title: "Generate system report",
        message: "Run window.__GENERATE_SYSTEM_REPORT__() or complete boot to produce reports/system-report.json.",
        source: "diagnosticEngine"
      }],
      riskLevel: "high"
    };
  }

  const issues = collectAllIssues(report);
  const stabilityScore =
    typeof report.systemHealth === "number"
      ? Math.max(0, Math.min(100, report.systemHealth))
      : Math.max(0, 100 - issues.length * 10);

  return {
    stabilityScore: stabilityScore,
    issues: issues,
    rootCauses: deriveRootCauses(issues),
    recommendations: deriveRecommendations(issues, report),
    riskLevel: resolveRiskLevel(issues)
  };
}

if (typeof window !== "undefined") {
  window.analyzeSystemReport = analyzeSystemReport;
}
