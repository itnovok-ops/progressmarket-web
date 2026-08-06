(function () {
  const STORAGE_KEY = "pm_helpdesk_v1";
  const root = document.getElementById("pm-helpdesk");
  if (!root) {
    return;
  }

  const fab = document.getElementById("pm-helpdesk-fab");
  const panel = document.getElementById("pm-helpdesk-panel");
  const closeBtn = document.getElementById("pm-helpdesk-close");
  const messagesEl = document.getElementById("pm-helpdesk-messages");
  const introEl = document.getElementById("pm-helpdesk-intro");
  const footEl = document.getElementById("pm-helpdesk-foot");
  const introForm = document.getElementById("pm-helpdesk-intro-form");
  const composeForm = document.getElementById("pm-helpdesk-compose-form");
  const messageInput = document.getElementById("pm-helpdesk-message");
  const statusEl = document.getElementById("pm-helpdesk-status");
  const captchaHost = document.getElementById("pm-helpdesk-captcha-host");
  const introPhoneInput = document.getElementById("pm-helpdesk-phone");
  const introPhoneHint = document.getElementById("pm-helpdesk-phone-hint");

  let state = loadState();
  let introSubmitting = false;

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
    if (!/^79\d{9}$/.test(d)) {
      return false;
    }
    const mobile = d.slice(2);
    if (/^(\d)\1+$/.test(mobile)) {
      return false;
    }
    return true;
  }

  function phoneValidationMessage(digits) {
    if (!digits || digits === "7") {
      return "";
    }
    if (digits.length >= 2 && digits[1] !== "9") {
      return "После +7 мобильный номер начинается с 9 (не 8 и не 1).";
    }
    if (digits.length === 11 && !isValidRuPhone11(digits)) {
      return "Похоже на некорректный номер (не все цифры одинаковые, формат +7 9XX…).";
    }
    if (digits.length >= 4 && digits.length < 11) {
      return "";
    }
    return "";
  }

  function updatePhoneFieldUi() {
    if (!(introPhoneInput instanceof HTMLInputElement)) {
      return;
    }
    const digits = ruPhoneDigits(introPhoneInput.value);
    const msg = phoneValidationMessage(digits);
    introPhoneInput.classList.toggle("pm-helpdesk-input--invalid", Boolean(msg));
    if (introPhoneHint) {
      if (msg) {
        introPhoneHint.textContent = msg;
        introPhoneHint.hidden = false;
      } else {
        introPhoneHint.textContent = "";
        introPhoneHint.hidden = true;
      }
    }
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

  function bindHelpdeskPhoneInput(input) {
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    input.addEventListener("focus", () => {
      if (!input.value.trim()) {
        input.value = "+7 ";
      }
    });
    input.addEventListener("input", () => {
      const d = ruPhoneDigits(input.value);
      if (d === "" || d === "7") {
        input.value = d === "7" ? "+7 " : "";
        updatePhoneFieldUi();
        return;
      }
      input.value = formatRuPhoneDisplay(d);
      updatePhoneFieldUi();
    });
    input.addEventListener("blur", () => {
      const d = ruPhoneDigits(input.value);
      if (d === "" || d === "7") {
        input.value = "";
        updatePhoneFieldUi();
        return;
      }
      input.value = formatRuPhoneDisplay(d);
      updatePhoneFieldUi();
    });
  }

  bindHelpdeskPhoneInput(introPhoneInput);

  function welcomeMessageText(name) {
    return "Спасибо, " + name + "! Напишите ваш вопрос — передадим в поддержку.";
  }

  function ensureWelcomeMessage(name) {
    const text = welcomeMessageText(name);
    const has = state.messages.some((m) => m.role === "bot" && m.text === text);
    if (!has) {
      appendMessage("bot", text);
    }
  }
  let helpdeskCaptchaId = null;
  let helpdeskCaptchaReady = null;
  let pendingCaptchaResolve = null;
  let pendingCaptchaReject = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { profile: null, messages: [] };
      }
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") {
        return { profile: null, messages: [] };
      }
      return {
        profile: data.profile && typeof data.profile === "object" ? data.profile : null,
        messages: Array.isArray(data.messages) ? data.messages : []
      };
    } catch (_e) {
      return { profile: null, messages: [] };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getSiteKey() {
    const raw =
      typeof window.PM_SMARTCAPTCHA_SITE_KEY === "string"
        ? window.PM_SMARTCAPTCHA_SITE_KEY
        : typeof window.PM_RECAPTCHA_SITE_KEY === "string"
          ? window.PM_RECAPTCHA_SITE_KEY
          : "";
    return String(raw || "").trim();
  }

  function setStatus(text, kind) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = text || "";
    statusEl.classList.remove("is-ok");
    if (kind === "ok") {
      statusEl.classList.add("is-ok");
    }
  }

  function appendMessage(role, text) {
    state.messages.push({ role, text, at: new Date().toISOString() });
    saveState();
    renderMessages();
  }

  function renderMessages() {
    if (!messagesEl) {
      return;
    }
    messagesEl.innerHTML = "";
    state.messages.forEach((m) => {
      const div = document.createElement("div");
      div.className =
        "pm-helpdesk-msg " + (m.role === "user" ? "pm-helpdesk-msg--user" : "pm-helpdesk-msg--bot");
      div.textContent = m.text;
      messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function updateUiMode() {
    const hasProfile = Boolean(state.profile && state.profile.name);
    if (panel) {
      panel.classList.toggle("is-chat-mode", hasProfile);
    }
    if (introEl) {
      introEl.hidden = hasProfile;
      introEl.classList.toggle("is-hidden", hasProfile);
    }
    if (footEl) {
      footEl.hidden = !hasProfile;
    }
    if (messagesEl) {
      messagesEl.hidden = !hasProfile;
    }
    if (hasProfile) {
      renderMessages();
    } else if (messagesEl) {
      messagesEl.innerHTML = "";
    }
  }

  function openPanel() {
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    fab.setAttribute("aria-expanded", "true");
    ensureHelpdeskCaptcha().catch(() => {});
    if (state.profile && messageInput) {
      messageInput.focus();
    }
  }

  function closePanel() {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    fab.setAttribute("aria-expanded", "false");
    setStatus("");
  }

  function waitForSmartCaptchaApi(maxMs) {
    const limit = typeof maxMs === "number" ? maxMs : 15000;
    const start = Date.now();
    return new Promise((resolve, reject) => {
      function tick() {
        if (window.smartCaptcha && typeof window.smartCaptcha.render === "function") {
          resolve();
          return;
        }
        if (Date.now() - start > limit) {
          reject(new Error("smartcaptcha_unavailable"));
          return;
        }
        setTimeout(tick, 50);
      }
      tick();
    });
  }

  function ensureHelpdeskCaptcha() {
    if (helpdeskCaptchaReady) {
      return helpdeskCaptchaReady;
    }
    const siteKey = getSiteKey();
    if (!siteKey || !captchaHost) {
      helpdeskCaptchaReady = Promise.reject(new Error("no_site_key"));
      return helpdeskCaptchaReady;
    }
    helpdeskCaptchaReady = waitForSmartCaptchaApi().then(() => {
      if (helpdeskCaptchaId !== null) {
        return helpdeskCaptchaId;
      }
      window.__pmHelpdeskCaptchaToken = "";
      helpdeskCaptchaId = window.smartCaptcha.render(captchaHost, {
        sitekey: siteKey,
        invisible: true,
        hideShield: true,
        callback: (token) => {
          window.__pmHelpdeskCaptchaToken = token ? String(token).trim() : "";
          if (pendingCaptchaResolve) {
            pendingCaptchaResolve(window.__pmHelpdeskCaptchaToken);
            pendingCaptchaResolve = null;
            pendingCaptchaReject = null;
          }
        },
        "error-callback": () => {
          window.__pmHelpdeskCaptchaToken = "";
          if (pendingCaptchaReject) {
            pendingCaptchaReject(new Error("captcha_error"));
            pendingCaptchaResolve = null;
            pendingCaptchaReject = null;
          }
        }
      });
      return helpdeskCaptchaId;
    });
    return helpdeskCaptchaReady;
  }

  function obtainCaptchaToken() {
    const cached =
      typeof window.__pmHelpdeskCaptchaToken === "string"
        ? window.__pmHelpdeskCaptchaToken.trim()
        : "";
    if (cached.length > 10) {
      return Promise.resolve(cached);
    }
    const main =
      typeof window.__pmLastSmartCaptchaToken === "string"
        ? window.__pmLastSmartCaptchaToken.trim()
        : "";
    if (main.length > 10) {
      return Promise.resolve(main);
    }

    return ensureHelpdeskCaptcha().then((widgetId) => {
      return new Promise((resolve, reject) => {
        pendingCaptchaResolve = resolve;
        pendingCaptchaReject = reject;
        const timer = setTimeout(() => {
          if (pendingCaptchaReject) {
            pendingCaptchaReject(new Error("captcha_timeout"));
            pendingCaptchaResolve = null;
            pendingCaptchaReject = null;
          }
        }, 60000);
        try {
          window.smartCaptcha.execute(widgetId);
        } catch (err) {
          clearTimeout(timer);
          pendingCaptchaResolve = null;
          pendingCaptchaReject = null;
          reject(err);
        }
        const origResolve = resolve;
        pendingCaptchaResolve = (token) => {
          clearTimeout(timer);
          origResolve(token);
        };
      });
    });
  }

  async function sendToServer(payload) {
    const captchaToken = await obtainCaptchaToken();
    const res = await fetch("/helpdesk.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, smartcaptcha_token: captchaToken })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error((data && data.message) || "send_failed");
    }
    return data;
  }

  function setBusy(busy) {
    panel.classList.toggle("is-busy", busy);
  }

  if (introForm) {
    introForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (introSubmitting) {
        return;
      }
      const fd = new FormData(introForm);
      const name = String(fd.get("name") || "").trim();
      const phone = String(fd.get("phone") || "").trim();
      const email = String(fd.get("email") || "").trim();
      if (!name) {
        setStatus("Укажите имя.", "error");
        return;
      }
      if (!phone && !email) {
        setStatus("Укажите телефон или email.", "error");
        return;
      }
      let phoneFormatted = "";
      if (phone) {
        const digits = ruPhoneDigits(phone);
        const phoneMsg = phoneValidationMessage(digits) || (isValidRuPhone11(digits) ? "" : "Некорректный номер.");
        if (phoneMsg) {
          updatePhoneFieldUi();
          setStatus(phoneMsg, "error");
          return;
        }
        phoneFormatted = "+" + digits;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setStatus("Некорректный email.", "error");
        return;
      }
      introSubmitting = true;
      state.profile = { name, phone: phoneFormatted, email };
      saveState();
      updateUiMode();
      if (typeof window.reachYmGoal === "function") {
        window.reachYmGoal("chat_start");
      }
      setStatus("");
      ensureWelcomeMessage(name);
      introSubmitting = false;
      if (messageInput) {
        messageInput.focus();
      }
    });
  }

  if (composeForm) {
    composeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!state.profile) {
        setStatus("Сначала заполните контакты.", "error");
        return;
      }
      const text = messageInput ? String(messageInput.value || "").trim() : "";
      if (!text) {
        return;
      }
      setBusy(true);
      setStatus("Отправляем…");
      if (messageInput) {
        messageInput.value = "";
      }
      appendMessage("user", text);

      try {
        const data = await sendToServer({
          name: state.profile.name,
          phone: state.profile.phone || "",
          email: state.profile.email || "",
          message: text,
          pageUrl: window.location.href,
          hp_trap: ""
        });
        window.__pmHelpdeskCaptchaToken = "";
        appendMessage(
          "bot",
          "Сообщение принято. Менеджер ответит вам в ближайшее время — на email или по телефону."
        );
        const leadHint =
          data && data.lead_id
            ? " (сделка №" + data.lead_id + " в amoCRM)"
            : "";
        setStatus("Отправлено в поддержку" + leadHint + ".", "ok");
      } catch (err) {
        state.messages.pop();
        saveState();
        renderMessages();
        let msg = "Не удалось отправить. Попробуйте позже или напишите в Telegram.";
        if (err && err.message === "no_site_key") {
          msg = "Капча не настроена на сайте — заявка из чата временно недоступна.";
        } else if (err && err.message === "captcha_timeout") {
          msg = "Истекло время проверки. Обновите страницу и попробуйте снова.";
        } else if (err && typeof err.message === "string" && err.message.length > 3 && err.message !== "send_failed") {
          msg = err.message;
        }
        if (msg.indexOf("amocrm_helpdesk_pipeline") !== -1 || msg.indexOf("Входные обращения") !== -1) {
          msg =
            "Чат не подключён к amoCRM: в lead-config.php на сервере укажите ID воронки «Входные обращения» (см. amo-list-pipelines-once.php).";
        }
        setStatus(msg, "error");
      } finally {
        setBusy(false);
      }
    });
  }

  fab.addEventListener("click", () => {
    if (panel.classList.contains("is-open")) {
      closePanel();
    } else {
      openPanel();
    }
  });

  closeBtn.addEventListener("click", closePanel);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) {
      closePanel();
    }
  });

  updateUiMode();
})();
