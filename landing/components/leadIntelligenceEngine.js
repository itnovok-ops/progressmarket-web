const SESSION_START = Date.now();

/** @type {boolean} */
let engineActive = false;

/**
 * @param {Array<{ event: string, timestamp: number, meta?: Record<string, unknown> }>} events
 * @returns {number}
 */
export function calculateScore(events) {
  let score = 0;
  let scrollLow = false;
  let scrollMid = false;
  let scrollHigh = false;
  let exitIntent = false;

  (events || []).forEach(function (entry) {
    switch (entry.event) {
      case "scroll_intent_low":
        if (!scrollLow) {
          scrollLow = true;
          score += 5;
        }
        break;
      case "scroll_intent_mid":
        if (!scrollMid) {
          scrollMid = true;
          score += 10;
        }
        break;
      case "scroll_intent_high":
        if (!scrollHigh) {
          scrollHigh = true;
          score += 20;
        }
        break;
      case "cta_click":
        score += 15;
        break;
      case "form_focus":
        score += 5;
        break;
      case "form_submit_attempt":
        score += 10;
        break;
      case "form_submit_success":
        score += 30;
        break;
      case "exit_intent":
        if (!exitIntent) {
          exitIntent = true;
          score += 10;
        }
        break;
      default:
        break;
    }
  });

  const elapsedMs = Date.now() - SESSION_START;
  if (elapsedMs > 90000) {
    score += 10;
  }
  if (elapsedMs > 30000) {
    score += 5;
  }

  if (score > 100) {
    score = 100;
  }
  if (score < 0) {
    score = 0;
  }

  return score;
}

/**
 * @param {number} score
 * @returns {"cold" | "warm" | "hot" | "purchase_ready"}
 */
export function getSegment(score) {
  if (score >= 80) {
    return "purchase_ready";
  }
  if (score >= 60) {
    return "hot";
  }
  if (score >= 30) {
    return "warm";
  }
  return "cold";
}

/**
 * @param {{ event?: string, timestamp?: number, meta?: Record<string, unknown> }} [_event]
 */
export function updateLeadState(_event) {
  if (!engineActive) {
    return;
  }

  try {
    const events = window.__LIFEOS_EVENTS__ || [];
    const score = calculateScore(events);

    window.__LIFEOS_LEAD_STATE__ = {
      score: score,
      segment: getSegment(score),
      timestamp: Date.now(),
      events_count: events.length
    };
  } catch (error) {
    /* silent layer */
  }
}

export function triggerCRMDecision() {
  if (!engineActive) {
    return;
  }

  try {
    const state = window.__LIFEOS_LEAD_STATE__;
    if (!state || typeof state.score !== "number") {
      return;
    }

    if (state.score >= 80) {
      state.crm_priority = "IMMEDIATE_PUSH";
      return;
    }

    if (state.score >= 60) {
      state.crm_priority = "DELAYED_PUSH";
      return;
    }

    state.crm_priority = null;
  } catch (error) {
    /* silent layer */
  }
}

export function initLeadIntelligenceEngine() {
  if (window.__LIFEOS_BUILD_LOCK__ !== true) {
    return;
  }

  try {
    engineActive = true;
    window.__LIFEOS_LEAD_STATE__ = {
      score: 0,
      segment: "cold",
      timestamp: Date.now(),
      events_count: 0,
      crm_priority: null
    };
    updateLeadState();
    triggerCRMDecision();
  } catch (error) {
    engineActive = false;
  }
}
