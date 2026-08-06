/**
 * Event batching — analytics events flushed every 500ms or on critical threshold.
 */

const FLUSH_MS = 500;
const CRITICAL_THRESHOLD = 20;

let flushTimer = null;
const processors = [];

function ensureBatch() {
  if (!Array.isArray(window.__EVENT_BATCH__)) {
    window.__EVENT_BATCH__ = [];
  }
  return window.__EVENT_BATCH__;
}

function updateQueueHealth() {
  if (window.__CYCLE_MANAGER__ && typeof window.__SYSTEM_HEALTH__ === "object") {
    window.__SYSTEM_HEALTH__.eventQueueSize = ensureBatch().length;
  }
}

/**
 * Register processor called on batch flush.
 * @param {Function} processor
 */
export function registerBatchProcessor(processor) {
  if (typeof processor === "function") {
    processors.push(processor);
  }
}

/**
 * Queue event for batched processing.
 * @param {object} event
 */
export function queueEvent(event) {
  const batch = ensureBatch();
  batch.push(event);
  updateQueueHealth();

  if (batch.length >= CRITICAL_THRESHOLD) {
    flushEventBatch();
    return;
  }

  if (!flushTimer) {
    flushTimer = setTimeout(function () {
      flushTimer = null;
      flushEventBatch();
    }, FLUSH_MS);
  }
}

/**
 * Flush queued events through registered processors.
 * @returns {number}
 */
export function flushEventBatch() {
  const batch = ensureBatch();
  if (!batch.length) {
    return 0;
  }

  const events = batch.splice(0, batch.length);
  processors.forEach(function (processor) {
    try {
      processor(events);
    } catch (_error) {
      /* safe — individual processor failure must not break flush */
    }
  });

  updateQueueHealth();
  return events.length;
}

if (typeof window !== "undefined") {
  window.queueEvent = queueEvent;
  window.flushEventBatch = flushEventBatch;
  window.registerBatchProcessor = registerBatchProcessor;
}
