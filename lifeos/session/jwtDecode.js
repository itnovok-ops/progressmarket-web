/**
 * Safe JWT payload decode — no signature verification (client-side hint only).
 * @param {string | null | undefined} token
 * @returns {Record<string, unknown> | null}
 */
export function safeDecodeJwtPayload(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    return payload && typeof payload === "object" ? payload : null;
  } catch (_error) {
    return null;
  }
}

/**
 * @param {Record<string, unknown> | null} payload
 * @returns {boolean}
 */
export function isJwtExpired(payload) {
  if (!payload || payload.exp == null) {
    return false;
  }

  const exp = Number(payload.exp);
  if (!Number.isFinite(exp)) {
    return true;
  }

  return exp * 1000 <= Date.now();
}
