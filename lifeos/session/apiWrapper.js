import { getSession, invalidateSession, isActiveSession } from "./SessionCore.js";

/**
 * Safe fetch wrapper — never throws for guest sessions.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<{ mode: "guest" } | { mode: "ok", data: unknown, response: Response }>}
 */
export async function lifeosFetch(url, options) {
  const session = getSession();

  if (!isActiveSession()) {
    return { mode: "guest" };
  }

  const headers = new Headers(options?.headers || {});
  if (!headers.has("Authorization") && session.token) {
    headers.set("Authorization", "Bearer " + session.token);
  }

  try {
    const response = await fetch(url, Object.assign({}, options, { headers: headers }));

    if (response.status === 401) {
      let detail = "";
      try {
        const errBody = await response.clone().json();
        detail = typeof errBody.detail === "string" ? errBody.detail : "";
      } catch (_error) {
        detail = "";
      }

      if (
        detail === "Invalid token" ||
        detail === "Not authenticated" ||
        detail === "User not found" ||
        detail === ""
      ) {
        invalidateSession();
        return { mode: "guest" };
      }
    }

    if (!response.ok) {
      return { mode: "guest" };
    }

    let data = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.indexOf("application/json") !== -1) {
      data = await response.json();
    } else if (response.status !== 204) {
      data = await response.text();
    }

    return { mode: "ok", data: data, response: response };
  } catch (_error) {
    if (!isActiveSession()) {
      return { mode: "guest" };
    }
    return { mode: "guest" };
  }
}

/**
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<unknown | { mode: "guest" }>}
 */
export async function lifeosRequestJson(url, options) {
  const result = await lifeosFetch(url, options);
  if (result.mode === "guest") {
    return { mode: "guest" };
  }
  return result.data;
}
