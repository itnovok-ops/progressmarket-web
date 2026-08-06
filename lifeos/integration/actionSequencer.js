/**
 * Action Sequencer — Nika → validate → queue → execute → log (ISP v1).
 */

import { guardAutopilotAction } from "../control/executionGuard.js";
import { assessRisk, logAction } from "../autopilot/actionLog.js";

const MAX_QUEUE = 40;
const STAGES = ["nika_received", "validated", "queued", "executing", "logged", "skipped", "failed"];

/** @type {object[]} */
const queue = [];

/** @type {object[]} */
const pipelineLog = [];

/**
 * @param {object} action
 * @param {object} [decision]
 * @param {ParentNode} [root]
 * @param {function} executor
 * @returns {object}
 */
export function sequenceAction(action, decision, root, executor) {
  const entry = createPipelineEntry(action, decision);
  recordStage(entry, "nika_received");
  return runPipeline(entry, root, executor);
}

/**
 * @param {object} action
 * @param {object} [decision]
 * @returns {object}
 */
function createPipelineEntry(action, decision) {
  return {
    id: "pipe-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    action: action,
    decision: decision || null,
    created_at: Date.now(),
    stages: []
  };
}

/**
 * @param {object} entry
 * @param {string} stage
 * @param {object} [meta]
 */
function recordStage(entry, stage, meta) {
  entry.stages.push({ stage: stage, at: Date.now(), meta: meta || {} });
  pipelineLog.push({
    id: entry.id,
    code: entry.action?.code,
    stage: stage,
    at: Date.now(),
    meta: meta || {}
  });
  if (pipelineLog.length > 120) {
    pipelineLog.splice(0, pipelineLog.length - 120);
  }
}

/**
 * @param {object} entry
 * @param {ParentNode} [root]
 * @param {function} executor
 * @returns {Promise<object>}
 */
function runPipeline(entry, root, executor) {
  const control = guardAutopilotAction(entry.action, entry.decision);
  if (!control.allowed) {
    recordStage(entry, "skipped", { reason: control.reason, phase: "validate" });
    logAction("skip", "Sequencer blocked at validate", { reason: control.reason, pipeline_id: entry.id });
    return { ok: false, skipped: true, reason: control.reason, pipeline_id: entry.id };
  }

  const risk = assessRisk(entry.action);
  if (!risk.ok) {
    recordStage(entry, "skipped", { reason: risk.reason, phase: "validate" });
    logAction("skip", "Sequencer blocked at risk check", { reason: risk.reason, pipeline_id: entry.id });
    return { ok: false, skipped: true, reason: risk.reason, pipeline_id: entry.id };
  }

  recordStage(entry, "validated");
  enqueue(entry);
  recordStage(entry, "queued", { position: queue.length });

  recordStage(entry, "executing");
  let result;
  try {
    result = executor(entry.action, root);
  } catch (error) {
    recordStage(entry, "failed", { error: String(error) });
    logAction("error", "Sequencer execution failed", { pipeline_id: entry.id, error: String(error) });
    return { ok: false, reason: "sequencer_exception", pipeline_id: entry.id };
  }

  finalize(entry, result);
  return Object.assign({ pipeline_id: entry.id }, result || {});
}

/**
 * @param {object} entry
 */
function enqueue(entry) {
  queue.push(entry);
  if (queue.length > MAX_QUEUE) {
    queue.shift();
  }
}

/**
 * @param {object} entry
 * @param {object} result
 */
function finalize(entry, result) {
  dequeue(entry.id);
  if (result && result.ok) {
    recordStage(entry, "logged", { ok: true });
    logAction("exec", "Sequencer completed", { pipeline_id: entry.id, code: entry.action?.code });
  } else {
    recordStage(entry, "skipped", { ok: false, reason: result?.reason });
  }
}

/**
 * @param {string} id
 */
function dequeue(id) {
  const idx = queue.findIndex(function (e) { return e.id === id; });
  if (idx !== -1) {
    queue.splice(idx, 1);
  }
}

/**
 * @returns {object}
 */
export function getActionPipelineSnapshot() {
  return {
    stages: STAGES,
    queue_depth: queue.length,
    recent: pipelineLog.slice(-12),
    total_processed: pipelineLog.length,
    direct_execution_blocked: true
  };
}

/**
 * @param {object} action
 * @param {ParentNode} root
 * @param {function} executor
 * @returns {object|Promise<object>}
 */
export function runSequencedExecution(action, root, executor) {
  return sequenceAction(action, null, root, function (a, r) {
    return executor(a, r);
  });
}
