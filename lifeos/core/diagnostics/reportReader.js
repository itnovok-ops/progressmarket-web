/**
 * Report Reader — fetches latest persisted system reports (read-only).
 */

function resolveReportUrls() {
  const base = window.location.pathname || "/";
  const inLanding = base.includes("/landing");
  const prefix = inLanding ? ".." : "";

  return {
    main: [
      prefix + "/reports/system-report.json",
      "/reports/system-report.json"
    ],
    historyLatest: [
      prefix + "/reports/history/latest.json",
      "/reports/history/latest.json"
    ]
  };
}

/**
 * @param {string[]} urls
 * @returns {Promise<object|null>}
 */
async function fetchFirstJson(urls) {
  for (let i = 0; i < urls.length; i++) {
    try {
      const response = await fetch(urls[i] + "?t=" + Date.now(), {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) {
        continue;
      }
      const data = await response.json();
      if (data && typeof data === "object") {
        return data;
      }
    } catch (_error) {
      /* try next URL */
    }
  }
  return null;
}

function pickNewestReport(main, history) {
  const candidates = [main, history, window.__SYSTEM_REPORT_LAST__].filter(Boolean);
  if (!candidates.length) {
    return null;
  }

  candidates.sort(function (a, b) {
    const ta = Date.parse(a.timestamp || 0) || 0;
    const tb = Date.parse(b.timestamp || 0) || 0;
    return tb - ta;
  });

  return candidates[0];
}

/**
 * Read latest system report from disk (main + history/latest) with in-memory fallback.
 * @returns {Promise<object|null>}
 */
export async function readLatestSystemReport() {
  const urls = resolveReportUrls();
  const [main, historyLatest] = await Promise.all([
    fetchFirstJson(urls.main),
    fetchFirstJson(urls.historyLatest)
  ]);

  return pickNewestReport(main, historyLatest);
}

if (typeof window !== "undefined") {
  window.readLatestSystemReport = readLatestSystemReport;
}
