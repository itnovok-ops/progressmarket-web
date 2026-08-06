/**
 * Risk Engine — business risk scoring for Nika proposals.
 */

import { CLASS_CRITICAL, CLASS_REVIEW, CLASS_SAFE } from "./decisionClassifier.js";

/**
 * @param {object} decision
 * @param {string} classification
 * @param {object} [context]
 * @returns {{ ui: number, conversion: number, backend: number, total: number, level: string }}
 */
export function calculateRisk(decision, classification, context) {
  const actionText = String(decision?.action || "").toLowerCase();
  const priority = decision?.priority || "LOW";
  const type = decision?.type || "";

  let ui = 10;
  let conversion = 10;
  let backend = 5;

  if (type === "UI" || type === "TRAFFIC") {
    ui += 25;
  }
  if (type === "FUNNEL") {
    conversion += 30;
    ui += 15;
  }
  if (type === "AGENT") {
    backend += 40;
  }

  if (actionText.indexOf("headline") !== -1 || actionText.indexOf("layout") !== -1) {
    ui += 20;
  }
  if (actionText.indexOf("funnel") !== -1 || actionText.indexOf("cta") !== -1) {
    conversion += 20;
  }
  if (actionText.indexOf("form") !== -1 || actionText.indexOf("api") !== -1) {
    backend += 35;
    conversion += 15;
  }
  if (actionText.indexOf("pipeline") !== -1 || actionText.indexOf("events") !== -1) {
    backend += 30;
  }

  if (priority === "HIGH") {
    ui += 10;
    conversion += 10;
    backend += 10;
  } else if (priority === "MEDIUM") {
    ui += 5;
    conversion += 5;
  }

  if (classification === CLASS_REVIEW) {
    ui += 15;
    conversion += 10;
  } else if (classification === CLASS_CRITICAL) {
    backend += 25;
    conversion += 15;
    ui += 10;
  }

  const landing = context?.landing_stats || {};
  if (typeof landing.ctr === "number" && landing.ctr < 0.02) {
    conversion += 10;
  }

  const funnel = context?.funnel || {};
  if (funnel.weakest_stage === "form_start" || funnel.weakest_stage === "cta") {
    conversion += 8;
  }

  ui = clamp(ui);
  conversion = clamp(conversion);
  backend = clamp(backend);

  const total = clamp(Math.round(ui * 0.35 + conversion * 0.4 + backend * 0.25));
  const level = total >= 70 ? "high" : total >= 40 ? "medium" : "low";

  return {
    ui: ui,
    conversion: conversion,
    backend: backend,
    total: total,
    level: level
  };
}

/**
 * @param {number} value
 * @returns {number}
 */
function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * @param {string} classification
 * @returns {boolean}
 */
export function requiresApproval(classification) {
  return classification === CLASS_REVIEW || classification === CLASS_CRITICAL;
}

/**
 * @param {string} classification
 * @returns {boolean}
 */
export function canAutoExecute(classification) {
  if (window.__LIFEOS_PRODUCTION_MODE__ === true) {
    return false;
  }
  return classification === CLASS_SAFE;
}
