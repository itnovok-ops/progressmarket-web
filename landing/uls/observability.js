/**
 * ULS Observability Layer — global dump for debugging, QA, and product analytics.
 */

const MAX_EVENTS = 200;
const MAX_ERRORS = 50;

function now() {
  return Date.now();
}

function ensureDump() {
  if (!window.__ULS_DUMP__) {
    window.__ULS_DUMP__ = {
      state: {
        boot: "INIT",
        header: "CLOSED",
        mobileMenu: "CLOSED",
        form: "IDLE"
      },
      events: [],
      errors: [],
      metrics: {
        clicks: 0,
        ctaClicks: 0,
        formSubmits: 0,
        videoPlays: 0
      }
    };
  }
  return window.__ULS_DUMP__;
}

export function initUlsObservability() {
  const dump = ensureDump();
  if (window.__ULS_OBSERVABILITY_READY__) {
    return dump;
  }
  window.__ULS_OBSERVABILITY_READY__ = true;

  window.addEventListener("error", function (event) {
    logUlsError({
      type: "error",
      message: event.message || "Unknown error",
      source: event.filename,
      line: event.lineno,
      col: event.colno
    });
  });

  window.addEventListener("unhandledrejection", function (event) {
    const reason = event.reason;
    logUlsError({
      type: "unhandledrejection",
      message: reason && reason.message ? reason.message : String(reason)
    });
  });

  document.addEventListener(
    "click",
    function () {
      bumpUlsMetric("clicks");
    },
    true
  );

  return dump;
}

export function getUlsDump() {
  return ensureDump();
}

export function setUlsState(key, value) {
  ensureDump().state[key] = value;
}

export function logUlsEvent(name, payload) {
  const dump = ensureDump();
  dump.events.push({
    name: name,
    payload: payload || {},
    ts: now()
  });
  if (dump.events.length > MAX_EVENTS) {
    dump.events.splice(0, dump.events.length - MAX_EVENTS);
  }
}

export function logUlsError(error) {
  const dump = ensureDump();
  dump.errors.push(
    Object.assign({ ts: now() }, typeof error === "string" ? { message: error } : error)
  );
  if (dump.errors.length > MAX_ERRORS) {
    dump.errors.splice(0, dump.errors.length - MAX_ERRORS);
  }
}

export function bumpUlsMetric(name, delta) {
  const dump = ensureDump();
  if (typeof dump.metrics[name] === "number") {
    dump.metrics[name] += delta === undefined ? 1 : delta;
  }
}
