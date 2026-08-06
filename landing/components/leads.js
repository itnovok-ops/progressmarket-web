import { LEADS_ENDPOINT } from "../assets/data/content.js";
import { trackFormSubmitSuccess } from "./tracking.js";
import { assertBootPass } from "../build/productionLock.js";
import { logUlsEvent, bumpUlsMetric, logUlsError } from "../uls/observability.js";
import { setFormState } from "../uls/state.js";

const MAX_ATTEMPTS = 2;

/**
 * @param {import('../assets/data/content.js').PAGE_CONTENT['cta']} ctaConfig
 */
export function initLeadForm(ctaConfig) {
  assertBootPass();
  const form = document.getElementById("lead-form");
  const successPanel = document.getElementById("lead-form-success");
  const statusEl = document.getElementById("form-status");
  const submitBtn = document.getElementById("lead-submit");

  if (!form || !submitBtn) {
    console.warn("[ULS] lead-form mount nodes missing — init skipped");
    return;
  }

  if (form.dataset.leadBound === "true") {
    return;
  }
  form.dataset.leadBound = "true";

  let isSubmitting = false;
  let isSubmitted = false;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (isSubmitting || isSubmitted) {
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const consent = formData.get("consent") === "on";
    const hpTrap = String(formData.get("hp_trap") || "").trim();

    if (!consent) {
      setFormState("ERROR");
      setStatus(statusEl, ctaConfig.errorMessage, "error");
      logUlsEvent("form_submit", { ok: false, reason: "consent" });
      return;
    }

    const payload = {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      comment: String(formData.get("comment") || "").trim(),
      project_type: "dropshipping",
      source: "landing",
      hp_trap: hpTrap,
      marketingConsent: formData.get("marketingConsent") === "on"
    };

    const enhanced =
      typeof window.__LIFEOS_ENHANCE_LEAD__ === "function"
        ? window.__LIFEOS_ENHANCE_LEAD__(payload)
        : payload;

    isSubmitting = true;
    setFormState("IDLE");
    setLoading(submitBtn, ctaConfig, true);
    setStatus(statusEl, "", "");
    logUlsEvent("form_submit", { stage: "start" });

    submitWithRetry(enhanced, MAX_ATTEMPTS)
      .then(function (result) {
        if (result.ok) {
          isSubmitted = true;
          setFormState("SENT");
          bumpUlsMetric("formSubmits");
          logUlsEvent("form_submit", { ok: true });
          trackFormSubmitSuccess();
          form.hidden = true;
          if (successPanel) {
            successPanel.hidden = false;
          }
          setStatus(statusEl, ctaConfig.successMessage, "success");
          return;
        }
        throw new Error(result.message || "submit_failed");
      })
      .catch(function (err) {
        setFormState("ERROR");
        const message =
          err && err.message && err.message !== "submit_failed"
            ? err.message
            : ctaConfig.errorMessage;
        setStatus(statusEl, message, "error");
        logUlsEvent("form_submit", { ok: false, message: message });
        logUlsError({ type: "form", message: message });
      })
      .finally(function () {
        isSubmitting = false;
        if (!isSubmitted) {
          setLoading(submitBtn, ctaConfig, false);
        }
      });
  });
}

/**
 * @param {object} payload
 * @param {number} attemptsLeft
 * @returns {Promise<{ok: boolean, message?: string}>}
 */
function submitWithRetry(payload, attemptsLeft) {
  return fetch(LEADS_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(function (response) {
      return response
        .json()
        .catch(function () {
          return { ok: false };
        })
        .then(function (data) {
          if ((response.ok || response.status === 201) && data && data.ok) {
            return { ok: true };
          }
          return {
            ok: false,
            message: (data && data.message) || "submit_failed",
            retryable: response.status >= 500 || response.status === 0
          };
        });
    })
    .catch(function () {
      return { ok: false, message: "network_error", retryable: true };
    })
    .then(function (result) {
      if (result.ok) {
        return result;
      }
      if (result.retryable && attemptsLeft > 1) {
        return submitWithRetry(payload, attemptsLeft - 1);
      }
      return result;
    });
}

function setLoading(button, ctaConfig, loading) {
  button.disabled = loading;
  button.setAttribute("aria-busy", loading ? "true" : "false");
  button.textContent = loading ? ctaConfig.submitLoadingLabel || "Отправка…" : ctaConfig.submitLabel;
}

function setStatus(el, message, type) {
  if (!el) {
    return;
  }
  el.textContent = message;
  el.classList.remove("form-status--error", "form-status--success");
  if (type === "error") {
    el.classList.add("form-status--error");
  }
  if (type === "success") {
    el.classList.add("form-status--success");
  }
}
