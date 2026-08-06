/**
 * Nika Anomaly Detector — pattern-based anomaly flags.
 */

const STALE_MS = 30000;

/**
 * @param {object} sources
 * @returns {object[]}
 */
export function detectAnomalies(sources) {
  /** @type {object[]} */
  const anomalies = [];
  const now = Date.now();

  try {
    const landing = sources.landing_stats || {};
    const funnel = sources.funnel || {};
    const growth = sources.growth_report || {};
    const agents = sources.agent_report?.agents || sources.agents?.agents || {};

    if (typeof landing.ctr === "number" && landing.ctr < 0.02 && (landing.sessions || 0) >= 1) {
      anomalies.push({
        code: "ctr_drop",
        severity: "high",
        message: "CTR critically low (" + (landing.ctr * 100).toFixed(1) + "%)",
        metric: "ctr",
        value: landing.ctr
      });
    }

    if ((sources.events_count || 0) === 0 && sources.boot_state === "PASS") {
      anomalies.push({
        code: "missing_events",
        severity: "medium",
        message: "No growth events in buffer after boot",
        metric: "events_count",
        value: 0
      });
    }

    Object.keys(agents).forEach(function (id) {
      const agent = agents[id];
      const age = now - (agent.lastHeartbeat || 0);
      if (agent.lastHeartbeat > 0 && age > STALE_MS && agent.status !== "inactive") {
        anomalies.push({
          code: "agent_inactivity",
          severity: "medium",
          message: agent.name + " inactive for " + Math.round(age / 1000) + "s",
          agent_id: id,
          metric: "heartbeat_age_ms",
          value: age
        });
      }
      if (agent.status === "failed") {
        anomalies.push({
          code: "agent_failure",
          severity: "high",
          message: agent.name + " in failed state",
          agent_id: id
        });
      }
    });

    const dropOffs = funnel.drop_offs || {};
    Object.keys(dropOffs).forEach(function (stage) {
      const drop = dropOffs[stage];
      if (typeof drop === "number" && drop > 0.7 && stage !== "visit") {
        anomalies.push({
          code: "funnel_breakdown",
          severity: "high",
          message: "Severe drop-off at " + stage + " (" + Math.round(drop * 100) + "%)",
          metric: "drop_off",
          stage: stage,
          value: drop
        });
      }
    });

    if (funnel.chaotic === true || funnel.flow_status === "CHAOTIC UI FLOW") {
      anomalies.push({
        code: "funnel_flow_chaos",
        severity: "medium",
        message: "Funnel/UI flow instability detected",
        metric: "flow"
      });
    }

    const intentDist = growth.intentDistribution || sources.intent?.distribution;
    if (intentDist && (intentDist.LOW || intentDist.low) > 0.7) {
      anomalies.push({
        code: "traffic_quality_low",
        severity: "medium",
        message: "High proportion of LOW intent sessions",
        metric: "intent_low_ratio",
        value: intentDist.LOW ?? intentDist.low
      });
    }

    if (sources.session?.status === "expired") {
      anomalies.push({
        code: "session_expired",
        severity: "low",
        message: "LifeOS session token expired — guest mode active",
        metric: "session_status"
      });
    }
  } catch (_error) {
    anomalies.push({
      code: "detector_fallback",
      severity: "low",
      message: "Anomaly detector ran in safe mode"
    });
  }

  return anomalies;
}
