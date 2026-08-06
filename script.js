/**
 * Dropshipping landing — frontend only.
 * Lead submission via LifeOS CRM POST /api/v1/leads
 *
 * Payload:
 * {
 *   "name": "",
 *   "phone": "",
 *   "email": "",
 *   "comment": "",
 *   "project_type": "dropshipping",
 *   "source": "landing"
 * }
 */

const LIFEOS_LEADS_ENDPOINT = "/api/v1/leads";

const form = document.getElementById("lead-form");
const statusBox = document.getElementById("form-status");
const yearNode = document.getElementById("year");

if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

function ruPhoneDigits(value) {
  let d = String(value || "").replace(/\D/g, "");
  if (d.startsWith("8")) {
    d = "7" + d.slice(1);
  }
  if (d.length > 0 && !d.startsWith("7")) {
    d = "7" + d.replace(/^7+/g, "");
  }
  return d.slice(0, 11);
}

function isValidRuPhone11(d) {
  return /^7\d{10}$/.test(d);
}

function formatRuPhoneDisplay(digits11) {
  const d = digits11.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 1) {
    return d === "" ? "" : "+7 ";
  }
  const n = d.slice(1);
  let out = "+7";
  if (n.length > 0) {
    out += " (" + n.slice(0, 3);
  }
  if (n.length >= 4) {
    out += ") " + n.slice(3, 6);
  } else if (n.length >= 3) {
    out += ")";
  }
  if (n.length >= 7) {
    out += "-" + n.slice(6, 8);
  }
  if (n.length >= 9) {
    out += "-" + n.slice(8, 10);
  }
  return out;
}

function bindLeadRuPhoneInput(input) {
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  input.addEventListener("input", () => {
    const d = ruPhoneDigits(input.value);
    if (d === "") {
      input.value = "";
      return;
    }
    input.value = formatRuPhoneDisplay(d);
  });
  input.addEventListener("blur", () => {
    const d = ruPhoneDigits(input.value);
    if (d === "" || d === "7") {
      input.value = "";
      return;
    }
    if (d.length > 1) {
      input.value = formatRuPhoneDisplay(d);
    }
  });
}

const leadPhoneInput = document.getElementById("lead-phone");
if (leadPhoneInput) {
  bindLeadRuPhoneInput(leadPhoneInput);
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const href = anchor.getAttribute("href");
      if (!href || href === "#") {
        return;
      }
      const target = document.querySelector(href);
      if (!target) {
        return;
      }
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

initSmoothScroll();

function setLeadFormStatus(message, kind) {
  if (!statusBox) {
    return;
  }
  statusBox.textContent = message;
  statusBox.classList.remove("form-status--error", "form-status--success");
  if (kind === "error") {
    statusBox.classList.add("form-status--error");
  } else if (kind === "success") {
    statusBox.classList.add("form-status--success");
  }
}

/**
 * LifeOS CRM POST /api/v1/leads
 * @param {object} payload
 * @returns {Promise<{ok: boolean}>}
 */
async function submitLead(payload) {
  const response = await fetch(LIFEOS_LEADS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8", Accept: "application/json" },
    body: JSON.stringify({
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      comment: payload.comment,
      project_type: "dropshipping",
      source: "landing"
    })
  });
  let data = null;
  try {
    data = await response.json();
  } catch (_e) {
    data = null;
  }
  if (!response.ok && response.status !== 201) {
    const msg = data && typeof data.message === "string" ? data.message : "Ошибка отправки заявки.";
    throw new Error(msg);
  }
  return data || { ok: true };
}

if (form && statusBox) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const hp = String(formData.get("hp_trap") || "").trim();
    if (hp !== "") {
      setLeadFormStatus("Заявка принята. Мы свяжемся с вами в ближайшее время.", "success");
      form.reset();
      return;
    }

    const phoneDigits = ruPhoneDigits(String(formData.get("phone") || ""));
    if (!isValidRuPhone11(phoneDigits)) {
      setLeadFormStatus(
        "Укажите корректный российский номер: +7 и 10 цифр (например +7 (912) 345-67-89).",
        "error"
      );
      return;
    }

    const consentInput = form.querySelector('input[name="consent"]');
    if (!(consentInput instanceof HTMLInputElement) || !consentInput.checked) {
      setLeadFormStatus("Подтвердите согласие с условиями и обработкой персональных данных.", "error");
      return;
    }

    const marketingInput = form.querySelector('input[name="marketingConsent"]');
    const emailRaw = String(formData.get("email") || "").trim();
    if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      setLeadFormStatus("Укажите корректный email или оставьте поле пустым.", "error");
      return;
    }

    const payload = {
      name: String(formData.get("name") || "").trim(),
      phone: "+" + phoneDigits,
      email: emailRaw,
      comment: String(formData.get("comment") || "").trim(),
      marketingConsent: Boolean(marketingInput && marketingInput.checked)
    };

    if (!payload.name) {
      setLeadFormStatus("Укажите имя.", "error");
      return;
    }

    setLeadFormStatus("Отправляем заявку…", "");

    try {
      await submitLead(payload);
      if (typeof window.reachYmGoal === "function") {
        window.reachYmGoal("lead_form_submit", { project_type: "dropshipping" });
      }
      setLeadFormStatus(
        "Заявка принята. Мы свяжемся с вами и подготовим расчёт запуска.",
        "success"
      );
      form.reset();
    } catch (error) {
      const msg =
        error && typeof error.message === "string" && error.message.length > 0
          ? error.message
          : "Не удалось отправить заявку. Попробуйте позже.";
      setLeadFormStatus(msg, "error");
    }
  });
}
