/**
 * Client Mapping — Progress Market clients → LifeOS identity system.
 * SAFE MODE: identity resolution only, no writes.
 */

const ANALYTICS_SESSION_KEY = "lifeos_analytics_session_id";

/**
 * @param {object} pmClient Progress Market / CRM client record
 * @param {object} [context]
 * @returns {object}
 */
export function mapPmClientToLifeOS(pmClient, context) {
  const client = pmClient && typeof pmClient === "object" ? pmClient : {};
  const ctx = context || {};

  const pmId = client.id ?? client.client_id ?? client.pm_client_id ?? null;
  const phone = normalizePhone(client.phone);
  const email = normalizeEmail(client.email);

  const lifeosId = buildLifeOSId(pmId, phone, email);
  const sessionId = ctx.session_id || resolveAnalyticsSessionId();

  return {
    lifeos_id: lifeosId,
    pm_client_id: pmId ? String(pmId) : null,
    session_id: sessionId,
    user_id: ctx.user_id || client.user_id || null,
    identity_key: lifeosId,
    identity_tier: resolveIdentityTier(ctx.session, client),
    contact: {
      name: client.name || client.full_name || null,
      phone: phone,
      email: email
    },
    source: client.source || client.traffic_source || ctx.source || "direct",
    project_type: client.project_type || client.product || null,
    nika_score: client.nika_score ?? null,
    mapped_at: Date.now(),
    mapping_version: "traffic-foundation.v1"
  };
}

/**
 * @param {object[]} pmClients
 * @param {object} [context]
 * @returns {object[]}
 */
export function mapClientsBatch(pmClients, context) {
  return (Array.isArray(pmClients) ? pmClients : []).map(function (client) {
    return mapPmClientToLifeOS(client, context);
  });
}

/**
 * @param {object|null} session
 * @param {object|null} leadState
 * @returns {object}
 */
export function mapSessionVisitor(session, leadState) {
  const sess = session || {};
  const user = sess.user || {};
  const context = sess.context || {};

  return mapPmClientToLifeOS(
    {
      id: user.id || null,
      name: user.name || null,
      email: user.email || null,
      phone: user.phone || null,
      source: context.source || context.utm_source || "direct",
      engagement_score: leadState?.score ?? 0,
      activity_score: leadState?.events_count ?? 0
    },
    {
      session_id: resolveAnalyticsSessionId(),
      user_id: user.id || null,
      source: context.source || "direct",
      session: sess
    }
  );
}

/**
 * @param {string|number|null} pmId
 * @param {string|null} phone
 * @param {string|null} email
 * @returns {string}
 */
function buildLifeOSId(pmId, phone, email) {
  if (pmId) {
    return "pm-" + String(pmId);
  }
  if (phone) {
    return "ph-" + phone.slice(-8);
  }
  if (email) {
    return "em-" + email.split("@")[0].slice(0, 12);
  }
  return "anon-" + (resolveAnalyticsSessionId() || "guest");
}

/**
 * @param {object|null} session
 * @param {object} client
 * @returns {"authenticated"|"identified"|"anonymous"}
 */
function resolveIdentityTier(session, client) {
  if (session?.status === "active" && session?.user?.id) {
    return "authenticated";
  }
  if (client.id || client.phone || client.email) {
    return "identified";
  }
  return "anonymous";
}

/**
 * @returns {string|null}
 */
function resolveAnalyticsSessionId() {
  try {
    return sessionStorage.getItem(ANALYTICS_SESSION_KEY) || null;
  } catch (_error) {
    return null;
  }
}

/**
 * @param {unknown} phone
 * @returns {string|null}
 */
function normalizePhone(phone) {
  if (!phone) {
    return null;
  }
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

/**
 * @param {unknown} email
 * @returns {string|null}
 */
function normalizeEmail(email) {
  if (!email || typeof email !== "string") {
    return null;
  }
  const trimmed = email.trim().toLowerCase();
  return trimmed.indexOf("@") > 0 ? trimmed : null;
}
