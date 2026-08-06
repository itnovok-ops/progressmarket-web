import { initSession } from "./SessionCore.js";
import { lifeosFetch, lifeosRequestJson } from "./apiWrapper.js";

/**
 * @param {import("./SessionCore.js").LifeOSSession["context"] & { source?: string }} [options]
 */
export function initLifeOSSession(options) {
  const session = initSession(options || {});
  window.__LIFEOS_SESSION_API__ = {
    fetch: lifeosFetch,
    requestJson: lifeosRequestJson
  };

  try {
    if (typeof window.__LIFEOS_BRIDGE__?.flush === "function") {
      window.__LIFEOS_BRIDGE__.flush().catch(function () {
        /* silent */
      });
    }
  } catch (error) {
    /* silent */
  }

  return session;
}

if (typeof window !== "undefined" && !window.__LIFEOS_SESSION__) {
  initLifeOSSession();
}
