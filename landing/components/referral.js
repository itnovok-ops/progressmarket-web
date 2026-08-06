/**
 * First-touch referral (?ref=) + UTM attribution.
 * Client-side capture is used because this is a static, non-templated landing page
 * (no server-side request handling exists for the page itself, only for the API) —
 * see docs/LEAD_REFERRAL_V1.md. The server independently re-validates referral_code
 * format at lead-submit time; it never trusts the client blindly.
 */

const REF_COOKIE = "pm_ref";
const UTM_COOKIE = "pm_utm";
const COOKIE_TTL_DAYS = 30;
const REF_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const UTM_MAX_LEN = 128;

function readCookie(name) {
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : "";
}

function writeCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    name + "=" + encodeURIComponent(value) + "; Expires=" + expires + "; Path=/; SameSite=Lax" + secure;
}

function sanitizeUtmValue(value) {
  return String(value || "")
    .replace(/[\r\n]/g, "")
    .slice(0, UTM_MAX_LEN);
}

/**
 * Captures ?ref= and utm_* on first visit only (first-touch). Never overwrites an
 * existing valid referral/UTM cookie with a later one — by design, per spec.
 * Safe to call on every page load; it's a no-op after the first valid capture.
 */
export function captureAttribution() {
  const params = new URLSearchParams(window.location.search);

  const rawRef = params.get("ref") || "";
  if (rawRef && REF_PATTERN.test(rawRef) && !readCookie(REF_COOKIE)) {
    writeCookie(REF_COOKIE, rawRef, COOKIE_TTL_DAYS);
  }

  const hasAnyUtm = UTM_KEYS.some(function (key) {
    return params.has(key);
  });
  if (hasAnyUtm && !readCookie(UTM_COOKIE)) {
    const utm = {};
    UTM_KEYS.forEach(function (key) {
      const value = sanitizeUtmValue(params.get(key));
      if (value) {
        utm[key] = value;
      }
    });
    if (Object.keys(utm).length > 0) {
      writeCookie(UTM_COOKIE, JSON.stringify(utm), COOKIE_TTL_DAYS);
    }
  }
}

/** @returns {string} the stored first-touch referral code, or "" */
export function getReferralCode() {
  const value = readCookie(REF_COOKIE);
  return REF_PATTERN.test(value) ? value : "";
}

/** @returns {Record<string,string>} the stored first-touch UTM params */
export function getUtmParams() {
  const raw = readCookie(UTM_COOKIE);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    const out = {};
    UTM_KEYS.forEach(function (key) {
      if (typeof parsed[key] === "string" && parsed[key]) {
        out[key] = sanitizeUtmValue(parsed[key]);
      }
    });
    return out;
  } catch (e) {
    return {};
  }
}
