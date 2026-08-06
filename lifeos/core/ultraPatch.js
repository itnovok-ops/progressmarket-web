/**
 * Ultra Patch — pipeline mode (no DOM guards).
 */

import { startEventRouter } from "./events/eventRouter.js";
import { enqueueIntent } from "./intentLayer.js";

let nikaUltraLock = false;

/**
 * @returns {object}
 */
export function startUltraPatch() {
  startEventRouter();
  return { ok: true, active: false, mode: "pipeline" };
}

/**
 * @param {ParentNode} [_root]
 * @returns {object}
 */
function lockVideoSystem(_root) {
  enqueueIntent({
    type: "ACTION",
    source: "ultraPatch",
    payload: { video: { visible: true, playing: true } }
  });
  return { ok: true, mode: "intent_only" };
}

export { lockVideoSystem };
