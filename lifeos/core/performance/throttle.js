/**
 * Throttle / debounce utilities.
 */

/**
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function throttle(fn, ms) {
  let lastRun = 0;
  let timer = null;

  return function throttled() {
    const self = this;
    const args = arguments;
    const now = Date.now();
    const remaining = ms - (now - lastRun);

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastRun = now;
      return fn.apply(self, args);
    }

    if (!timer) {
      timer = setTimeout(function () {
        lastRun = Date.now();
        timer = null;
        fn.apply(self, args);
      }, remaining);
    }
  };
}

/**
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function debounce(fn, ms) {
  let timer = null;

  return function debounced() {
    const self = this;
    const args = arguments;

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(function () {
      timer = null;
      fn.apply(self, args);
    }, ms);
  };
}

if (typeof window !== "undefined") {
  window.__LIFEOS_THROTTLE__ = throttle;
  window.__LIFEOS_DEBOUNCE__ = debounce;
}
