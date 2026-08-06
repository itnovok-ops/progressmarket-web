import { isJwtExpired, safeDecodeJwtPayload } from "./jwtDecode.js";

const STORAGE_KEY = "lifeos_token";
const SESSION_EVENT = "lifeos:session:update";

/**
 * @param {{ source?: string, campaignId?: string | null, isDebug?: boolean, isConversionTracking?: boolean }} [ctx]
 */
function createGuestSession(ctx) {
  return {
    status: "guest",
    token: null,
    user: {},
    context: {
      source: ctx?.source || "landing",
      campaignId: ctx?.campaignId || null
    },
    flags: {
      isDebug: Boolean(ctx?.isDebug),
      isConversionTracking: ctx?.isConversionTracking !== false
    }
  };
}

/**
 * @param {string} token
 * @param {Record<string, unknown>} payload
 * @param {{ source?: string, campaignId?: string | null, isDebug?: boolean, isConversionTracking?: boolean }} ctx
 */
function createActiveSession(token, payload, ctx) {
  return {
    status: "active",
    token: token,
    user: {
      id: payload.sub != null ? String(payload.sub) : undefined,
      role: payload.role != null ? String(payload.role) : undefined
    },
    context: {
      source: ctx?.source || "landing",
      campaignId: ctx?.campaignId || null
    },
    flags: {
      isDebug: Boolean(ctx?.isDebug),
      isConversionTracking: ctx?.isConversionTracking !== false
    }
  };
}

function readStoredToken() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (_error) {
    return null;
  }
}

function writeStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (_error) {
    /* storage unavailable */
  }
}

function emitSessionUpdate(session) {
  try {
    document.dispatchEvent(
      new CustomEvent(SESSION_EVENT, {
        detail: { session: session }
      })
    );
  } catch (_error) {
    /* non-DOM environment */
  }
}

/**
 * @param {{ source?: string, campaignId?: string | null, isDebug?: boolean, isConversionTracking?: boolean }} [options]
 */
export function initSession(options) {
  const sessionContext = {
    source: options?.source || detectSource(),
    campaignId: options?.campaignId || readCampaignId(),
    isDebug: options?.isDebug,
    isConversionTracking: options?.isConversionTracking
  };

  const token = readStoredToken();
  if (!token) {
    return publishSession(createGuestSession(sessionContext));
  }

  const payload = safeDecodeJwtPayload(token);
  if (!payload) {
    writeStoredToken(null);
    return publishSession(createGuestSession(sessionContext));
  }

  if (isJwtExpired(payload)) {
    writeStoredToken(null);
    const expired = createGuestSession(sessionContext);
    expired.status = "expired";
    return publishSession(expired);
  }

  return publishSession(createActiveSession(token, payload, sessionContext));
}

export function publishSession(session) {
  window.__LIFEOS_SESSION__ = session;
  window.__LIFEOS_GET_SESSION__ = function getLifeOSSession() {
    return window.__LIFEOS_SESSION__;
  };
  emitSessionUpdate(session);
  return session;
}

export function getSession() {
  if (window.__LIFEOS_SESSION__) {
    return window.__LIFEOS_SESSION__;
  }
  return initSession();
}

export function setSessionToken(token, contextPatch) {
  const current = getSession();
  const sessionContext = {
    source: contextPatch?.source || current.context.source,
    campaignId:
      contextPatch?.campaignId !== undefined
        ? contextPatch.campaignId
        : current.context.campaignId,
    isDebug: contextPatch?.isDebug !== undefined ? contextPatch.isDebug : current.flags.isDebug,
    isConversionTracking:
      contextPatch?.isConversionTracking !== undefined
        ? contextPatch.isConversionTracking
        : current.flags.isConversionTracking
  };

  if (!token) {
    writeStoredToken(null);
    return publishSession(createGuestSession(sessionContext));
  }

  writeStoredToken(token);
  const payload = safeDecodeJwtPayload(token);
  if (!payload || isJwtExpired(payload)) {
    writeStoredToken(null);
    const guest = createGuestSession(sessionContext);
    guest.status = payload ? "expired" : "guest";
    return publishSession(guest);
  }

  return publishSession(createActiveSession(token, payload, sessionContext));
}

export function invalidateSession() {
  writeStoredToken(null);
  const current = getSession();
  const guest = createGuestSession({
    source: current.context.source,
    campaignId: current.context.campaignId,
    isDebug: current.flags.isDebug,
    isConversionTracking: current.flags.isConversionTracking
  });
  guest.status = current.status === "active" ? "expired" : "guest";
  return publishSession(guest);
}

export function isActiveSession() {
  const session = getSession();
  return session.status === "active" && Boolean(session.token);
}

function detectSource() {
  const path = (window.location.pathname || "").toLowerCase();
  if (path.indexOf("/dashboard-pro") !== -1 || path.indexOf("/growth/dashboard") !== -1) {
    return "dashboard";
  }
  if (path.indexOf("/growth/") !== -1) {
    return "growth";
  }
  return "landing";
}

function readCampaignId() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("utm_campaign") || params.get("campaign_id") || params.get("campaignId") || null;
  } catch (_error) {
    return null;
  }
}

export { STORAGE_KEY, SESSION_EVENT };
