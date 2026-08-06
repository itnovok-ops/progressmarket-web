/**
 * DOOM Guard — DISABLED. Replaced by STATE → INTENT → EXECUTION pipeline.
 */

export function isAuthorizedMutationCaller() {
  return false;
}

export function syncMutationLayerActive() {
  /* no-op */
}

/**
 * @returns {object}
 */
export function installDoomGuard() {
  window.__DOOM_GUARD_INSTALLED__ = false;
  window.__DOOM_GUARD__ = {
    authority: "disabled",
    installed: function () {
      return false;
    },
    isAuthorizedMutationCaller: isAuthorizedMutationCaller,
    getLog: function () {
      return [];
    }
  };
  return { ok: true, disabled: true };
}
