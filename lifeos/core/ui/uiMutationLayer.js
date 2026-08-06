/**
 * UI Mutation Layer — DISABLED. Use pipeline.js (STATE → INTENT → EXECUTION).
 */

export const uiMutationLayer = {
  authority: "disabled",

  mutate: function (action) {
    return { ok: false, disabled: true, reason: "uiMutationLayer is hard-disabled" };
  },

  enterBootRender: function () {},
  exitBootRender: function () {},
  isActive: function () {
    return false;
  },
  isAuthorized: function () {
    return false;
  },
  getLog: function () {
    return [];
  },
  registerIntent: function (intent) {
    return { ok: false, disabled: true, reason: "uiMutationLayer is hard-disabled" };
  }
};

export function installUiMutationFirewall() {
  /* no-op — no prototype overrides */
}

if (typeof window !== "undefined") {
  window.__UI_MUTATION_LAYER__ = uiMutationLayer;
  window.__UI_MUTATION_LAYER_ACTIVE__ = false;
}
