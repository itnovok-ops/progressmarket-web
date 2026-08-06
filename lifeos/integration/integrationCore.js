/**
 * Integration Core — ISP v1 stabilization orchestrator.
 */

import { installEventStandardHub, getEventSchemaSnapshot } from "./eventStandard.js";
import { getVideoControllerSnapshot } from "./videoOrchestrator.js";
import { getActionPipelineSnapshot } from "./actionSequencer.js";
import { getLoopProtectionSnapshot } from "./loopThrottle.js";
import { syncLegacyStreams, getUnifiedEvents } from "../core/events/eventRouter.js";

const INTEGRATION_EVENT = "lifeos:integration:update";
let started = false;
let tickTimer = 0;

/**
 * @returns {object}
 */
export function computeStability() {
  const eventSchema = getEventSchemaSnapshot();
  const video = getVideoControllerSnapshot();
  const pipeline = getActionPipelineSnapshot();
  const loops = getLoopProtectionSnapshot();

  let score = 100;
  if (eventSchema.rejected_count > 0) {
    score -= 5;
  }
  if (!video.conflict_resolved && video.modal_present && video.inline_present) {
    score -= 20;
  }
  if (loops.counts_in_window > loops.burst_limit - 1) {
    score -= 15;
  }
  if (eventSchema.legacy_buffer_size > 0 && getUnifiedEvents().length === 0) {
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score: score,
    label: score >= 85 ? "stable" : score >= 65 ? "watch" : "unstable",
    event_hub: eventSchema.hub_installed,
    video_resolved: video.conflict_resolved,
    loop_protection: loops.active,
    sequencer_enforced: pipeline.direct_execution_blocked
  };
}

/**
 * @returns {object}
 */
export function publishIntegrationState() {
  const eventSchema = getEventSchemaSnapshot();
  const videoController = getVideoControllerSnapshot();
  const actionPipeline = getActionPipelineSnapshot();
  const loopProtection = getLoopProtectionSnapshot();
  const stability = computeStability();

  const payload = {
    eventSchema: eventSchema,
    videoController: videoController,
    actionPipeline: actionPipeline,
    loopProtection: loopProtection,
    stability: stability,
    active: started,
    updated_at: Date.now()
  };

  try {
    window.__LIFEOS_INTEGRATION_STATE__ = {
      eventSchema: eventSchema,
      videoController: videoController,
      actionPipeline: actionPipeline,
      loopProtection: loopProtection,
      stability: stability
    };

    window.__LIFEOS_INTEGRATION_FULL__ = payload;
    window.__LIFEOS_GET_INTEGRATION__ = function () {
      return window.__LIFEOS_INTEGRATION_STATE__;
    };
    window.__LIFEOS_REINIT_VIDEO_ORCHESTRATOR__ = function () {
      if (window.__LIFEOS_BOOT_LOCK__ || window.__VIDEO_CONTROLLER__) {
        return { ok: true, skipped: true, reason: "video_controller_owned" };
      }
      return null;
    };
    window.__LIFEOS_RUN_INTEGRATION_TICK__ = runIntegrationTick;

    document.dispatchEvent(new CustomEvent(INTEGRATION_EVENT, { detail: payload }));
  } catch (_error) {
    /* silent */
  }

  return payload;
}

/**
 * @param {{ root?: ParentNode }} [options]
 * @returns {object}
 */
export function runIntegrationTick(options) {
  try {
    if (!window.__LIFEOS_BOOT_LOCK__) {
      return null;
    }

    if (window.__LIFEOS_PRODUCTION_MODE__ !== true) {
      installEventStandardHub();
      syncLegacyStreams();
    }
    return publishIntegrationState();
  } catch (_error) {
    return publishIntegrationState();
  }
}

/**
 * @param {{ root?: ParentNode, intervalMs?: number }} [options]
 * @returns {object}
 */
export function startIntegrationLayer(options) {
  if (!started) {
    started = true;
    installEventStandardHub();

    const interval = options?.intervalMs || 30000;
    tickTimer = window.setInterval(function () {
      runIntegrationTick({ root: options?.root });
    }, interval);

    document.addEventListener("lifeos:nika:update", function () {
      installEventStandardHub();
    });
    document.addEventListener("lifeos:autopilot:update", function () {
      publishIntegrationState();
    });
  }

  return runIntegrationTick(options);
}

/**
 * Stop integration tick.
 */
export function stopIntegrationLayer() {
  if (tickTimer) {
    window.clearInterval(tickTimer);
    tickTimer = 0;
  }
  started = false;
}

export { throttleCycle } from "./loopThrottle.js";
export { sequenceAction, runSequencedExecution, getActionPipelineSnapshot } from "./actionSequencer.js";
export { normalizeEvent, emitStandardEvent, validateEvent } from "./eventStandard.js";
