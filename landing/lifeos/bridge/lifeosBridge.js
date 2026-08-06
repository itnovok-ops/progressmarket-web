/**
 * LifeOS Frontend Bridge — SuperSite → LifeOS Growth transport.
 * Data layer only; never blocks UI or throws.
 */

const ENDPOINT = "/lifeos/growth/api/events.php";
const ANALYTICS_SESSION_KEY = "lifeos_analytics_session_id";
const FLUSH_INTERVAL_MS = 20000;

/** @type {Set<string>} */
const BRIDGE_EVENTS = new Set([
  "scroll_depth",
  "video_play",
  "video_click",
  "cta_click",
  "form_start",
  "form_submit",
  "exit_intent"
]);

/** @type {ReturnType<typeof setInterval> | 0} */
let flushTimer = 0;

/** @type {boolean} */
let started = false;

/**
 * @returns {object}
 */
function guestSession() {
  return {
    status: "guest",
    token: null,
    user: {},
    context: { source: "landing" },
    flags: { isConversionTracking: true }
  };
}

/**
 * @returns {object}
 */
function resolveSession() {
  try {
    if (window.__LIFEOS_SESSION__) {
      return window.__LIFEOS_SESSION__;
    }
  } catch (error) {
    /* silent */
  }
  return guestSession();
}

/**
 * @param {object} session
 * @returns {string}
 */
function resolveSessionId(session) {
  try {
    if (session && session.user && session.user.id) {
      return String(session.user.id);
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

    const created =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "sess-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);

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
 * @returns {string}
 */
function currentPagePath() {
  try {
    return window.location.pathname || "/";
  } catch (error) {
    return "/";
  }
}

/**
 * @param {Record<string, unknown>} [input]
 * @returns {{ event: string, timestamp: number, session: object, page: string, metadata: object }}
 */
function normalizeEvent(input) {
  const source = input && typeof input === "object" ? input : {};
  return {
    event: String(source.event || "unknown"),
    timestamp: Number(source.timestamp) || Date.now(),
    session: source.session || resolveSession(),
    page: typeof source.page === "string" ? source.page : currentPagePath(),
    metadata: source.metadata && typeof source.metadata === "object" ? source.metadata : {}
  };
}

/**
 * @param {{ event: string, timestamp: number, session: object, page: string, metadata: object }} bridgeEvent
 * @returns {object}
 */
function toBackendPayload(bridgeEvent) {
  const map = {
    scroll_depth: "scroll",
    video_play: "video_view",
    video_click: "video_click",
    cta_click: "cta_click",
    form_start: "form_start",
    form_submit: "form_submit",
    exit_intent: "intent"
  };

  let timestamp = bridgeEvent.timestamp;
  if (timestamp > 9999999999) {
    timestamp = Math.floor(timestamp / 1000);
  }

  return {
    landing_id: "wb-fbs-v1",
    session_id: resolveSessionId(bridgeEvent.session),
    event_type: map[bridgeEvent.event] || bridgeEvent.event,
    timestamp: timestamp,
    data: Object.assign({}, bridgeEvent.metadata, {
      bridge_event: bridgeEvent.event,
      page: bridgeEvent.page,
      session_status: bridgeEvent.session?.status || "guest"
    })
  };
}

/**
 * @param {object} payload
 * @param {boolean} [retried]
 * @returns {Promise<boolean>}
 */
function postPayload(payload, retried) {
  return fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    keepalive: true
  })
    .then(function (response) {
      if (response.ok) {
        return true;
      }
      if (!retried) {
        return postPayload(payload, true);
      }
      return false;
    })
    .catch(function () {
      if (!retried) {
        return postPayload(payload, true);
      }
      return false;
    });
}

/**
 * @param {{ event: string, timestamp: number, session: object, page: string, metadata: object }} bridgeEvent
 */
function enqueueEvent(bridgeEvent) {
  try {
    window.__LIFEOS_EVENT_QUEUE__ = window.__LIFEOS_EVENT_QUEUE__ || [];
    window.__LIFEOS_EVENT_QUEUE__.push(bridgeEvent);
    if (window.__LIFEOS_EVENT_QUEUE__.length > 200) {
      window.__LIFEOS_EVENT_QUEUE__ = window.__LIFEOS_EVENT_QUEUE__.slice(-200);
    }
  } catch (error) {
    /* silent */
  }
}

/**
 * Transport-only send — no normalize/route (event bus owns that path).
 * @param {Record<string, unknown>} [input]
 * @returns {object | null}
 */
function transportSend(input) {
  try {
    const bridgeEvent = normalizeEvent(input);

    if (!BRIDGE_EVENTS.has(bridgeEvent.event)) {
      return bridgeEvent;
    }

    const payload = toBackendPayload(bridgeEvent);

    postPayload(payload, false).then(function (ok) {
      if (!ok) {
        enqueueEvent(bridgeEvent);
      }
    });

    return bridgeEvent;
  } catch (error) {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} [input]
 * @returns {object | null}
 * @deprecated Use __LIFEOS_EVENT_BUS__.emit — kept for transport fallback.
 */
function sendEvent(input) {
  if (window.__LIFEOS_BRIDGE_TRANSPORT_ONLY__ === true && window.__LIFEOS_EVENT_BUS__?.emit) {
    return window.__LIFEOS_EVENT_BUS__.emit(input, "bridge_legacy");
  }
  return transportSend(input);
}

/**
 * Flush queued bridge events to LifeOS.
 */
export function flushLifeOSBridgeQueue() {
  try {
    const queue = window.__LIFEOS_EVENT_QUEUE__;
    if (!queue || queue.length === 0) {
      return Promise.resolve();
    }

    const batch = queue.slice();
    const payloads = batch.map(toBackendPayload);

    return postPayload(payloads, false).then(function (ok) {
      if (ok) {
        window.__LIFEOS_EVENT_QUEUE__ = queue.slice(batch.length);
      }
    });
  } catch (error) {
    return Promise.resolve();
  }
}

/**
 * @param {ParentNode} [root]
 */
export function attachLifeOSBridgeListeners(_root) {
  /* transport only — DOM listeners disabled by clean architecture */
  return;
}

/**
 * Initialize bridge transport (non-blocking, safe before render).
 */
export function initLifeOSBridge() {
  try {
    if (started) {
      return window.__LIFEOS_BRIDGE__;
    }

    window.__LIFEOS_EVENT_QUEUE__ = window.__LIFEOS_EVENT_QUEUE__ || [];
    window.__LIFEOS_SEND_EVENT__ORIGINAL = transportSend;
    window.__LIFEOS_BRIDGE_TRANSPORT__ = transportSend;
    window.__LIFEOS_SEND_EVENT = sendEvent;

    window.addEventListener("online", function () {
      flushLifeOSBridgeQueue().catch(function () {
        /* silent */
      });
    });

    document.addEventListener("lifeos:session:update", function () {
      flushLifeOSBridgeQueue().catch(function () {
        /* silent */
      });
    });

    if (!flushTimer) {
      flushTimer = window.setInterval(function () {
        flushLifeOSBridgeQueue().catch(function () {
          /* silent */
        });
      }, FLUSH_INTERVAL_MS);
    }

    window.addEventListener(
      "beforeunload",
      function () {
        try {
          const queue = window.__LIFEOS_EVENT_QUEUE__;
          if (!queue || queue.length === 0) {
            return;
          }
          const payloads = queue.map(toBackendPayload);
          navigator.sendBeacon(ENDPOINT, JSON.stringify(payloads));
        } catch (error) {
          /* silent */
        }
      },
      { passive: true }
    );

    window.__LIFEOS_BRIDGE__ = {
      active: true,
      endpoint: ENDPOINT,
      flush: flushLifeOSBridgeQueue
    };

    started = true;
    return window.__LIFEOS_BRIDGE__;
  } catch (error) {
    return null;
  }
}
