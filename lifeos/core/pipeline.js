/**
 * Pipeline — STATE → INTENT → EXECUTION
 */

import { getAppState, initAppState, patchAppState, mergeAppState } from "./appState.js";
import { drainIntents, enqueueIntent, reduceIntentToState } from "./intentLayer.js";
import { applyState, ensureAppState } from "./renderEngine.js";

let initialized = false;

/**
 * @returns {object}
 */
export function initPipeline() {
  ensureAppState();

  if (!initialized) {
    initAppState();
    initialized = true;
  }

  window.__RUN_PIPELINE__ = runPipeline;
  window.__COMMIT_APP_STATE__ = commitState;
  window.__ENQUEUE_APP_INTENT__ = enqueueIntent;
  window.applyState = applyState;

  applyState(window.__APP_STATE__);

  return {
    ok: true,
    mode: "STATE_INTENT_EXECUTION",
    state: getAppState()
  };
}

/**
 * @param {object} state
 * @returns {object}
 */
export function commitState(state) {
  const next = mergeAppState(getAppState(), state);
  window.__APP_STATE__ = next;
  return applyState(next);
}

/**
 * Process queued intents into state, then execute render.
 * @returns {object}
 */
export function runPipeline() {
  const intents = drainIntents();
  let state = getAppState();

  intents.forEach(function (intent) {
    state = reduceIntentToState(state, intent);
  });

  window.__APP_STATE__ = state;
  const result = applyState(state);

  return {
    ok: result.ok !== false,
    intents_processed: intents.length,
    state: state,
    render: result
  };
}

export { enqueueIntent, getAppState, patchAppState, applyState };
