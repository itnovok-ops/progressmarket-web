/**
 * Cycle Controller — prevents feedback loops between Nika, audit, growth, agents.
 */

const WINDOW_MS = 12000;
const MAX_PER_CYCLE = 4;
const LOOP_CHAIN_MS = 5000;

/** @type {{ name: string, source: string, at: number }[]} */
const history = [];

/**
 * @param {string} name
 * @param {string} [source]
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function requestCycle(name, source) {
  const now = Date.now();
  prune(now);

  const recentSame = history.filter(function (h) {
    return h.name === name && now - h.at < WINDOW_MS;
  });

  if (recentSame.length >= MAX_PER_CYCLE) {
    return { allowed: false, reason: "cycle_rate_limited:" + name };
  }

  if (detectLoop(name, source, now)) {
    return { allowed: false, reason: "cycle_loop_detected:" + name };
  }

  history.push({ name: name, source: source || "unknown", at: now });
  return { allowed: true };
}

/**
 * @param {number} now
 */
function prune(now) {
  while (history.length > 0 && now - history[0].at > WINDOW_MS * 3) {
    history.shift();
  }
}

/**
 * @param {string} name
 * @param {string} source
 * @param {number} now
 * @returns {boolean}
 */
function detectLoop(name, source, now) {
  const recent = history.filter(function (h) { return now - h.at < LOOP_CHAIN_MS; });
  if (recent.length < 2) {
    return false;
  }

  const pingPongPairs = [
    ["nika", "audit"],
    ["audit", "nika"],
    ["nika", "autopilot"],
    ["autopilot", "nika"],
    ["agents", "nika"],
    ["nika", "agents"],
    ["growth", "nika"],
    ["nika", "growth"]
  ];

  const last = recent[recent.length - 1];
  for (let i = 0; i < pingPongPairs.length; i++) {
    const pair = pingPongPairs[i];
    if (last.name === pair[0] && name === pair[1] && source !== "manual") {
      return true;
    }
  }

  return false;
}

/**
 * @returns {object}
 */
export function getCycleSnapshot() {
  const now = Date.now();
  const counts = {};

  history.forEach(function (h) {
    if (now - h.at > WINDOW_MS) {
      return;
    }
    counts[h.name] = (counts[h.name] || 0) + 1;
  });

  return {
    window_ms: WINDOW_MS,
    recent_cycles: history.slice(-12),
    counts_in_window: counts,
    loop_protection: true
  };
}

/**
 * Reset cycle history (internal/testing).
 */
export function resetCycleHistory() {
  history.length = 0;
}
