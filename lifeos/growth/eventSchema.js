/**
 * Unified Growth event schema.
 */

const ANALYTICS_SESSION_KEY = "lifeos_analytics_session_id";

/**
 * @returns {string}
 */
function createAnalyticsSessionId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (error) {
    /* fallback */
  }
  return "sess-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

/**
 * Guest-safe analytics session id (separate from JWT auth).
 * @returns {string}
 */
export function getAnalyticsSessionId() {
  try {
    const lifeos = window.__LIFEOS_SESSION__;
    if (lifeos && lifeos.user && lifeos.user.id) {
      return String(lifeos.user.id);
    }

    let stored = "";
    try {
      stored = sessionStorage.getItem(ANALYTICS_SESSION_KEY) || "";
    } catch (error) {
      /* private mode */
    }

    if (stored) {
      return stored;
    }

    const created = createAnalyticsSessionId();
    try {
      sessionStorage.setItem(ANALYTICS_SESSION_KEY, created);
    } catch (error) {
      /* silent */
    }
    return created;
  } catch (error) {
    return "guest-" + Date.now();
  }
}

/**
 * @returns {{ path: string, href: string, landing_id: string }}
 */
export function getPageContext() {
  try {
    return {
      path: window.location.pathname || "/",
      href: window.location.href || "",
      landing_id:
        (window.__LIFEOS_SESSION__ && window.__LIFEOS_SESSION__.landing_id) || "wb-fbs-v1"
    };
  } catch (error) {
    return { path: "/", href: "", landing_id: "wb-fbs-v1" };
  }
}

/**
 * @returns {object}
 */
export function getSessionSnapshot() {
  try {
    const session = window.__LIFEOS_SESSION__;
    const id = getAnalyticsSessionId();

    if (session) {
      return {
        id: id,
        mode: session.status || "guest",
        startedAt: session.startedAt || Date.now(),
        landing_id: "wb-fbs-v1",
        context: session.context || {},
        flags: session.flags || {}
      };
    }
  } catch (error) {
    /* guest fallback */
  }

  return {
    id: getAnalyticsSessionId(),
    mode: "guest",
    startedAt: Date.now(),
    landing_id: "wb-fbs-v1",
    context: {},
    flags: { isConversionTracking: true }
  };
}

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [metadata]
 * @returns {{ event: string, timestamp: number, session: object, page: object, metadata: object }}
 */
export function createGrowthEvent(eventName, metadata) {
  return {
    event: String(eventName || "unknown"),
    timestamp: Date.now(),
    session: getSessionSnapshot(),
    page: getPageContext(),
    metadata: metadata && typeof metadata === "object" ? metadata : {}
  };
}

/**
 * Map client event name to backend event_type.
 * @param {string} eventName
 * @returns {string}
 */
export function toBackendEventType(eventName) {
  const map = {
    visit: "visit",
    scroll: "scroll",
    cta_click: "cta_click",
    form_focus: "form_start",
    form_start: "form_start",
    form_submit: "form_submit",
    video_play: "video_play",
    video_click: "video_click",
    video_view: "video_view",
    exit_intent: "intent"
  };

  return map[eventName] || eventName;
}

/**
 * @param {{ event: string, timestamp: number, session: object, page: object, metadata: object }} payload
 * @returns {object}
 */
export function toBackendPayload(payload) {
  const lifeosSession = payload.lifeos_session || {};
  return {
    landing_id: payload.page?.landing_id || payload.session?.landing_id || "wb-fbs-v1",
    session_id: payload.session?.id || "guest",
    event_type: toBackendEventType(payload.event),
    timestamp: Math.floor((payload.timestamp || Date.now()) / 1000),
    data: Object.assign({}, payload.metadata || {}, {
      page: payload.page,
      session_mode: payload.session?.mode || lifeosSession.status || "guest",
      lifeos_session: lifeosSession
    })
  };
}
