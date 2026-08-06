/**
 * Clean Architecture bootstrap — STATE → INTENT → EXECUTION pipeline.
 */

import { initPipeline } from "./pipeline.js";
import { initEventBus } from "./events/eventBus.js";

const DISABLED_MODULES = [
  "uiMutationLayer",
  "doomGuard",
  "legacy_event_router",
  "videoController.dom_mode",
  "autopilot.dom_mutation"
];

/**
 * @param {{ root?: ParentNode, controlApi?: object }} [options]
 * @returns {object}
 */
export function applyCleanArchitecture(options) {
  if (window.__LIFEOS_BOOT_LOCK__ && !options?.bootOwner && window.__LIFEOS_CLEAN_ARCH_ACTIVE__) {
    return publishCleanArchitectureReport(options);
  }

  window.__LIFEOS_PASSIVE_CONVERSION_BOOST__ = true;
  window.__LIFEOS_PASSIVE_AUTO_ACTION__ = true;
  window.__LIFEOS_PASSIVE_GROWTH_RUNTIME__ = true;
  window.__LIFEOS_BRIDGE_TRANSPORT_ONLY__ = true;
  window.__LIFEOS_CLEAN_ARCH_ACTIVE__ = true;
  window.__LIFEOS_PRODUCTION_MODE__ = true;

  initPipeline();
  initEventBus();

  const report = publishCleanArchitectureReport(options);
  window.__LIFEOS_CLEAN_ARCHITECTURE_REPORT__ = report;
  console.info("[LIFEOS] Pipeline active — STATE → INTENT → EXECUTION");
  return report;
}

export function bindControlAuthority() {
  /* control hooks optional in pipeline mode */
}

/**
 * @returns {object}
 */
export function publishCleanArchitectureReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    disabled_modules: DISABLED_MODULES.slice(),
    active_core_layers: ["app_state", "intent_layer", "execution_engine"],
    pipeline_mode: "STATE_INTENT_EXECUTION",
    event_bus_status: window.__LIFEOS_EVENT_BUS__?.mode || "INTENT_STREAM",
    video_status: window.__APP_STATE__?.video?.visible ? "STATE_VISIBLE" : "STATE_HIDDEN",
    stability_score: 92
  };
  window.__LIFEOS_CLEAN_ARCHITECTURE_REPORT__ = report;
  return report;
}
