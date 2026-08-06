/**
 * Competitor Collector — ingest competitor URLs or HTML snapshots (read-only).
 */

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * @returns {object}
 */
export function getCompetitiveConfig() {
  try {
    return window.__LIFEOS_COMPETITIVE_CONFIG__ || {};
  } catch (_error) {
    return {};
  }
}

/**
 * @returns {object[]}
 */
export function getSnapshotInputs() {
  try {
    const snapshots = window.__LIFEOS_COMPETITIVE_SNAPSHOTS__;
    if (!Array.isArray(snapshots)) {
      return [];
    }
    return snapshots.filter(function (s) {
      return s && (s.html || s.snapshot);
    });
  } catch (_error) {
    return [];
  }
}

/**
 * Fetch static competitor registry (optional JSON on LifeOS host).
 * @returns {Promise<object[]>}
 */
export async function loadRegistrySnapshots() {
  try {
    const config = getCompetitiveConfig();
    const registryUrl = config.registryUrl || "/lifeos/competitive/storage/competitors.json";
    const response = await fetch(registryUrl, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store"
    });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return Array.isArray(data.competitors) ? data.competitors : [];
  } catch (_error) {
    return [];
  }
}

/**
 * @param {string} url
 * @param {number} [timeoutMs]
 * @returns {Promise<{ ok: boolean, html?: string, error?: string }>}
 */
export async function fetchCompetitorHtml(url, timeoutMs) {
  const timeout = timeoutMs || DEFAULT_TIMEOUT_MS;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? window.setTimeout(function () { controller.abort(); }, timeout)
    : 0;

  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      signal: controller ? controller.signal : undefined
    });
    if (!response.ok) {
      return { ok: false, error: "http_" + response.status };
    }
    const html = await response.text();
    if (!html || html.length < 100) {
      return { ok: false, error: "empty_response" };
    }
    return { ok: true, html: html };
  } catch (error) {
    return { ok: false, error: String(error) };
  } finally {
    if (timer) {
      window.clearTimeout(timer);
    }
  }
}

/**
 * Normalize a competitor input record.
 * @param {object} item
 * @param {string} [fallbackId]
 * @returns {object|null}
 */
export function normalizeCompetitorRecord(item, fallbackId) {
  if (!item) {
    return null;
  }

  const html = item.html || item.snapshot || item.content || "";
  const url = item.url || item.source_url || "";

  if (!html && !url) {
    return null;
  }

  return {
    id: item.id || item.competitor_id || fallbackId || "comp-unknown",
    name: item.name || item.label || item.id || "Competitor",
    url: url,
    html: html,
    source: html ? "snapshot" : "url",
    collected_at: Date.now()
  };
}

/**
 * Collect all competitor inputs (snapshots first, then config URLs, then registry).
 * @returns {Promise<object[]>}
 */
export async function collectCompetitors() {
  const config = getCompetitiveConfig();
  const merged = [];
  const seen = new Set();

  function push(record) {
    if (!record || seen.has(record.id)) {
      return;
    }
    seen.add(record.id);
    merged.push(record);
  }

  getSnapshotInputs().forEach(function (item, index) {
    push(normalizeCompetitorRecord(item, "snapshot-" + index));
  });

  (config.competitors || []).forEach(function (item, index) {
    push(normalizeCompetitorRecord(item, "config-" + index));
  });

  const registry = await loadRegistrySnapshots();
  registry.forEach(function (item, index) {
    push(normalizeCompetitorRecord(item, "registry-" + index));
  });

  const resolved = [];

  for (let i = 0; i < merged.length; i++) {
    const record = merged[i];
    if (record.html) {
      resolved.push(Object.assign({}, record, { fetch_status: "snapshot" }));
      continue;
    }

    if (record.url) {
      const fetched = await fetchCompetitorHtml(record.url, config.fetchTimeoutMs);
      if (fetched.ok && fetched.html) {
        resolved.push(
          Object.assign({}, record, {
            html: fetched.html,
            source: "fetch",
            fetch_status: "ok"
          })
        );
      } else {
        resolved.push(
          Object.assign({}, record, {
            html: "",
            fetch_status: fetched.error || "fetch_failed",
            skipped: true
          })
        );
      }
    }
  }

  return resolved.filter(function (r) {
    return r.html && r.html.length > 100;
  });
}
