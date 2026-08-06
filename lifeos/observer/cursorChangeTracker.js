/**
 * Cursor / codebase change tracker (browser-safe heuristics).
 * Cannot read filesystem — tracks build fingerprints, resource loads, DOM drift.
 */

const STORAGE_KEY = "lifeos_observer_change_baseline";

/**
 * @returns {string}
 */
function simpleHash(input) {
  let hash = 0;
  const str = String(input || "");
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return "h" + Math.abs(hash).toString(36);
}

/**
 * @param {ParentNode} [root]
 * @returns {string}
 */
function domFingerprint(root) {
  try {
    const scope = root || document.getElementById("app") || document.body;
    const parts = [];
    scope.querySelectorAll("section, footer, script[src]").forEach(function (node) {
      parts.push(
        node.tagName +
          ":" +
          (node.id || "") +
          ":" +
          (node.className || "").slice(0, 40) +
          ":" +
          (node.getAttribute("src") || "").slice(-40)
      );
    });
    return simpleHash(parts.join("|"));
  } catch (_error) {
    return "unknown";
  }
}

/**
 * @returns {object}
 */
function collectBuildSignals() {
  return {
    build_hash: window.__BUILD_HASH__ || null,
    build_version: window.__LIFEOS_BUILD_VERSION__ || null,
    build_lock: window.__LIFEOS_BUILD_LOCK__ === true,
    boot_state: window.__BOOT_STATE__ || "unknown"
  };
}

/**
 * @returns {object[]}
 */
function collectScriptResources() {
  const items = [];
  try {
    const entries = performance.getEntriesByType("resource");
    entries.forEach(function (entry) {
      if (!entry.name) {
        return;
      }
      if (
        entry.name.indexOf("/landing/") !== -1 ||
        entry.name.indexOf("/lifeos/") !== -1
      ) {
        items.push({
          url: entry.name,
          kind: entry.initiatorType || "resource"
        });
      }
    });
  } catch (_error) {
    /* silent */
  }

  return items.slice(-40);
}

/**
 * @returns {object|null}
 */
function readBaseline() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

/**
 * @param {object} snapshot
 */
function writeBaseline(snapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (_error) {
    /* silent */
  }
}

/**
 * @param {ParentNode} [root]
 * @param {{ forceBaseline?: boolean }} [options]
 * @returns {object}
 */
export function trackChanges(root, options) {
  const build = collectBuildSignals();
  const fingerprint = domFingerprint(root);
  const scripts = collectScriptResources();
  const modified = [];

  const snapshot = {
    build_hash: build.build_hash,
    build_version: build.build_version,
    dom_fingerprint: fingerprint,
    script_count: scripts.length,
    captured_at: Date.now()
  };

  const baseline = readBaseline();

  if (!baseline || options?.forceBaseline) {
    writeBaseline(snapshot);
    return {
      ok: true,
      changed: false,
      baseline_set: true,
      build: build,
      fingerprint: fingerprint,
      scripts: scripts,
      modified_components: [],
      tracked_at: Date.now()
    };
  }

  if (baseline.build_hash && build.build_hash && baseline.build_hash !== build.build_hash) {
    modified.push({
      area: "landing/build",
      type: "build_hash_changed",
      before: baseline.build_hash,
      after: build.build_hash,
      message: "Build hash changed — possible Cursor/deploy update in /landing/"
    });
  }

  if (
    baseline.build_version &&
    build.build_version &&
    baseline.build_version !== build.build_version
  ) {
    modified.push({
      area: "landing/build",
      type: "build_version_changed",
      before: baseline.build_version,
      after: build.build_version,
      message: "Build version changed"
    });
  }

  if (baseline.dom_fingerprint && baseline.dom_fingerprint !== fingerprint) {
    modified.push({
      area: "landing/dom",
      type: "dom_structure_changed",
      before: baseline.dom_fingerprint,
      after: fingerprint,
      message: "DOM structure drift detected — possible component change in /landing/ or /lifeos/"
    });
  }

  if (Math.abs((baseline.script_count || 0) - scripts.length) > 2) {
    modified.push({
      area: "lifeos/scripts",
      type: "script_load_delta",
      before: baseline.script_count,
      after: scripts.length,
      message: "LifeOS/landing script load profile changed"
    });
  }

  writeBaseline(snapshot);

  return {
    ok: true,
    changed: modified.length > 0,
    build: build,
    fingerprint: fingerprint,
    scripts: scripts,
    modified_components: modified,
    tracked_at: Date.now()
  };
}

/**
 * Reset baseline after known-good deploy.
 */
export function resetChangeBaseline(root) {
  trackChanges(root, { forceBaseline: true });
}
