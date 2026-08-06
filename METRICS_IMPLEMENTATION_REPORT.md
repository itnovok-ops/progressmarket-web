# Отчёт для настройки Яндекс.Метрики и Google Tag Manager

**Проект:** ProgressMarket (`progressmarket.ru`)  
**Дата:** 20 мая 2026  
**Назначение:** справочник элементов сайта для разметки целей, событий и DataLayer  
**Код проекта не изменялся** — отчёт только для внедрения аналитики.

---

## Текущее состояние

| Система | Статус |
|---------|--------|
| Яндекс.Метрика | ❌ Не подключена |
| Google Tag Manager | ❌ Не подключён |

**Рекомендуемый порядок внедрения:** GTM-контейнер в `<head>` всех HTML-страниц → DataLayer-события в `script.js` / `helpdesk.js` → цели Метрики типа «JavaScript-событие» с идентификатором = `event` из DataLayer.

---

# Все формы

На сайте **3 формы**, все на главной странице. Атрибуты `action` и `method` в HTML **отсутствуют** — отправка через JavaScript (`fetch`).

## Форма 1 — Заявка (основная лидогенерация)

| Параметр | Значение |
|----------|----------|
| **id** | `lead-form` |
| **class** | `lead-form` |
| **action** | *(нет в HTML)* → `lead.php` через `fetch` в `script.js` |
| **method** | *(нет в HTML)* → `POST`, `Content-Type: application/json` |
| **Название формы** | Оставить заявку / Lead form |
| **Страница** | `index.html` (`https://progressmarket.ru/`, секция `#form`) |

**Поля:** `name`, `phone`, `email`, `requestType`, `comment`, `consent`, `marketingConsent`, `hp_trap`  
**Submit-кнопка:** `<button type="submit" class="btn">Отправить заявку</button>`  
**Точка успеха в коде:** `script.js` — после `sendLeadViaPhp()` при `data.ok === true`

---

## Форма 2 — Вход в чат (intro)

| Параметр | Значение |
|----------|----------|
| **id** | `pm-helpdesk-intro-form` |
| **class** | `pm-helpdesk-intro-form` |
| **action** | *(нет)* — данные в `localStorage` (`pm_helpdesk_v1`), на сервер не отправляется |
| **method** | *(нет)* |
| **Название формы** | Helpdesk intro / Представьтесь в чате |
| **Страница** | `index.html` (виджет `#pm-helpdesk`) |

**Поля:** `name`, `phone`, `email`  
**Submit-кнопка:** `<button type="submit" class="btn">Начать диалог</button>`  
**Точка успеха в коде:** `helpdesk.js` — после валидации intro, до `updateUiMode()`

---

## Форма 3 — Сообщение в чате

| Параметр | Значение |
|----------|----------|
| **id** | `pm-helpdesk-compose-form` |
| **class** | `pm-helpdesk-compose` |
| **action** | *(нет в HTML)* → `helpdesk.php` через `fetch` в `helpdesk.js` |
| **method** | *(нет в HTML)* → `POST`, `Content-Type: application/json` |
| **Название формы** | Helpdesk compose / Отправка сообщения в поддержку |
| **Страница** | `index.html` (виджет `#pm-helpdesk`, footer панели) |

**Поля:** `pm-helpdesk-message` (textarea, вне `name`)  
**Submit-кнопка:** `<button type="submit" class="pm-helpdesk-send">` (иконка, aria-label «Отправить»)  
**Точка успеха в коде:** `helpdesk.js` — после `sendToServer()` при `data.ok === true`

---

# Все CTA кнопки

> В таблице — маркетинговые и конверсионные CTA. Служебные кнопки (lightbox, закрытие модалок, слайды) вынесены в раздел «Карта событий».

| Текст кнопки | id | class | страница | действие |
|--------------|-----|-------|----------|----------|
| Регистрация | — | `btn btn-sm nav-btn-register` | `index.html` | Внешняя ссылка → `https://new.progress-market.ru/registration` (новая вкладка) |
| Получить консультацию | — | `btn` | `index.html` | Якорь `#form` |
| Посмотреть стоимость | — | `btn btn-ghost` | `index.html` | Якорь `#pricing` |
| (иконка play, aria «Воспроизвести видео») | — | `video-overlay-play` | `index.html` | Запуск `#program-video` |
| Подробнее (×9) | — | `module-toggle-more` | `index.html` | Раскрытие текста модуля |
| Видео обзор (disabled ×7) | — | `btn btn-sm module-video-btn module-video-btn--soon` | `index.html` | Неактивна |
| Видео: Построение плана | — | `btn btn-sm module-video-btn` | `index.html` | Модалка → `videos/module-02-plan-control.mp4` |
| Видео: Контроль факта | — | `btn btn-sm module-video-btn` | `index.html` | Модалка → `videos/module-02-2-plan-fact.mp4` |
| Видео обзор (модуль 08) | — | `btn btn-sm module-video-btn` | `index.html` | Модалка → `videos/module-08-reviews.mp4` |
| Оформить заявку | — | `btn pricing-cta` | `index.html` | Якорь `#form` |
| Оформить заявку | — | `btn` | `index.html` | Якорь `#form` (блок `.section-cta`) |
| Отправить заявку | — | `btn` (submit) | `index.html` | Submit `#lead-form` → `lead.php` |
| (иконка чата, aria «Открыть чат поддержки») | `pm-helpdesk-fab` | `pm-helpdesk-fab` | `index.html` | Открытие/закрытие панели чата |
| Начать диалог | — | `btn` (submit) | `index.html` | Submit `#pm-helpdesk-intro-form` |
| (иконка отправки, aria «Отправить») | — | `pm-helpdesk-send` | `index.html` | Submit `#pm-helpdesk-compose-form` → `helpdesk.php` |
| Закрыть | — | `close` | `offer.html` | Переход `index.html#form` |
| Закрыть | — | `close` | `privacy-policy.html` | Переход `index.html#form` |
| Закрыть | — | `close` | `personal-data-consent.html` | Переход `index.html#form` |
| Закрыть | — | `close` | `marketing-consent.html` | Переход `index.html#form` |

### CTA-ссылки в навигации (не `<button>`, но конверсионные)

| Текст | id | class | страница | действие |
|-------|-----|-------|----------|----------|
| ProgressMarket | — | `logo` | `index.html` | Якорь `#top` |
| Возможности | — | `menu` | `index.html` | Якорь `#modules` |
| Стоимость | — | `menu` | `index.html` | Якорь `#pricing` |
| Платформа | — | `menu` | `index.html` | Якорь `#client-modules` |
| Заявка | — | `menu` | `index.html` | Якорь `#form` |
| FAQ | — | `menu` | `index.html` | Якорь `#faq` |

---

# Все ссылки

> В таблице — пользовательские ссылки (`<a href>`). Служебные `<link rel="stylesheet">`, `preconnect`, `canonical` не включены.

| URL | Текст | Тип |
|-----|-------|-----|
| `#top` | ProgressMarket | внутренний якорь |
| `#modules` | Возможности | внутренний якорь |
| `#pricing` | Стоимость | внутренний якорь |
| `#client-modules` | Платформа | внутренний якорь |
| `#form` | Заявка | внутренний якорь |
| `#faq` | FAQ | внутренний якорь |
| `https://new.progress-market.ru/registration` | Регистрация | регистрация |
| `#form` | Получить консультацию | внутренний якорь |
| `#pricing` | Посмотреть стоимость | внутренний якорь |
| `https://disk.yandex.ru/d/HlLVKbrHnUXBHw` | смотреть обзор на Яндекс.Диске | внешняя ссылка |
| `#form` | Оформить заявку | внутренний якорь |
| `#form` | Оформить заявку | внутренний якорь |
| `offer.html` | Пользовательское соглашение | внешняя ссылка *(относительная, новая вкладка)* |
| `personal-data-consent.html` | обработку персональных данных | внешняя ссылка *(относительная, новая вкладка)* |
| `marketing-consent.html` | условия рассылки | внешняя ссылка *(относительная, новая вкладка)* |
| `offer.html` | ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ… | внешняя ссылка *(относительная, новая вкладка)* |
| `privacy-policy.html` | Политика обработки персональных данных | внешняя ссылка *(относительная, новая вкладка)* |
| `personal-data-consent.html` | Согласие на обработку персональных данных | внешняя ссылка *(относительная, новая вкладка)* |
| `marketing-consent.html` | Согласие на рекламные и информационные рассылки | внешняя ссылка *(относительная, новая вкладка)* |
| `mailto:support@progress-market.ru` | support@progress-market.ru | email |
| `https://t.me/ChatProgMarket` | *(иконка Telegram, aria-label «Telegram Progress Market»)* | telegram |
| `index.html#form` | Закрыть | внутренний якорь *(с юридических страниц)* |

**Не найдено на сайте:** ссылки типа `tel:`, `whatsapp`, `wa.me`.

---

# Видео

| id | class | источник | страница | описание |
|----|-------|----------|----------|----------|
| `program-video` | *(тег `<video>`, обёртка `.video-overlay-wrap`)* | `assets/overview.mp4` | `index.html` | Обзорное видео в hero, нативные `controls` |
| `video-modal-video` | *(внутри `.video-modal-player`)* | динамически через `#video-modal-source` | `index.html` | Модальное видео модулей |
| `video-modal-source` | — | `videos/module-02-plan-control.mp4` | `index.html` | При клике «Видео: Построение плана» |
| `video-modal-source` | — | `videos/module-02-2-plan-fact.mp4` | `index.html` | При клике «Видео: Контроль факта» |
| `video-modal-source` | — | `videos/module-08-reviews.mp4` | `index.html` | При клике «Видео обзор» (модуль 08) |

**Дополнительно (не `<video>`):** fallback-ссылка на Яндекс.Диск — `https://disk.yandex.ru/d/HlLVKbrHnUXBHw`.

**Рекомендуемые события play:**

| Видео | event при `play` |
|-------|------------------|
| `#program-video` | `video_play` + `video_id: "program"` |
| Модуль 02 (план) | `video_play` + `video_id: "module_02_plan"` |
| Модуль 02 (факт) | `video_play` + `video_id: "module_02_fact"` |
| Модуль 08 (отзывы) | `video_play` + `video_id: "module_08_reviews"` |

---

# FAQ

**Контейнер:** `#faq` → `.faq`  
**Механизм раскрытия:** нативный HTML `<details>` / `<summary>` (без JavaScript, без отдельных id у вопросов).

| id вопроса *(рекомендуемый для аналитики)* | class | текст `<summary>` | механизм раскрытия |
|---------------------------------------------|-------|-------------------|-------------------|
| `faq-price` *(добавить `id` на `<details>` при внедрении)* | `.faq details` | Сколько стоит? | `<details>` click/toggle |
| `faq-api-safety` | `.faq details` | Безопасно ли подключать API-ключ? | `<details>` click/toggle |
| `faq-quick-start` | `.faq details` | Как быстро начать работать? | `<details>` click/toggle |
| `faq-discount` | `.faq details` | Есть скидки при оплате за несколько месяцев? | `<details>` click/toggle |
| `faq-team` | `.faq details` | Подойдёт ли сервис для команды? | `<details>` click/toggle |
| `faq-callback-demo` | `.faq details` | Можно ли оставить заявку на звонок и демо? | `<details>` click/toggle |
| `faq-wb-integration` | `.faq details` | Есть ли интеграция с Wildberries? | `<details>` click/toggle |

**Трекинг без правки HTML:** слушатель `toggle` на `#faq details` + текст из `summary.textContent`.

```javascript
document.querySelectorAll('#faq details').forEach((el) => {
  el.addEventListener('toggle', () => {
    if (!el.open) return;
    const question = el.querySelector('summary')?.textContent?.trim() || '';
    dataLayer.push({ event: 'faq_open', faq_question: question });
  });
});
```

---

# Карта событий

## Макроконверсии

| Элемент | Селектор / триггер | Рекомендуемое событие |
|---------|-------------------|----------------------|
| Форма заявки — успешная отправка | `#lead-form` submit → `lead.php` ok | `lead_submit` |
| Форма заявки — ошибка | `#lead-form` submit → ошибка | `lead_submit_error` |
| Тип заявки «Регистрация» | `requestType === "Регистрация"` при успехе | `lead_submit_registration` |
| Тип заявки «Демо» | `requestType === "Демо"` при успехе | `lead_submit_demo` |
| Тип заявки «Звонок» | `requestType === "Звонок"` при успехе | `lead_submit_callback` |
| Маркетинговое согласие | `marketingConsent` checked при успехе | `marketing_opt_in` |
| Кнопка «Регистрация» (header) | `.nav-btn-register` click | `registration_click` |
| Чат — открытие | `#pm-helpdesk-fab` click (open) | `chat_open` |
| Чат — закрытие | `#pm-helpdesk-fab` / `#pm-helpdesk-close` click (close) | `chat_close` |
| Чат — intro завершён | `#pm-helpdesk-intro-form` submit ok | `chat_start` |
| Чат — сообщение отправлено | `#pm-helpdesk-compose-form` submit → `helpdesk.php` ok | `chat_send` |
| Чат — ошибка отправки | compose submit → ошибка | `chat_send_error` |

## CTA-клики

| Элемент | Селектор | Рекомендуемое событие |
|---------|----------|----------------------|
| Получить консультацию | `.hero-cta .btn[href="#form"]` | `cta_consultation_click` |
| Посмотреть стоимость | `.hero-cta .btn-ghost[href="#pricing"]` | `cta_pricing_view_click` |
| Оформить заявку (тариф) | `.pricing-cta` | `cta_apply_click` |
| Оформить заявку (mid-page) | `.section-cta .btn[href="#form"]` | `cta_apply_click` |
| Пункт меню «Заявка» | `.menu a[href="#form"]` | `nav_form_click` |
| Пункт меню «Стоимость» | `.menu a[href="#pricing"]` | `nav_pricing_click` |
| Пункт меню «Возможности» | `.menu a[href="#modules"]` | `nav_modules_click` |
| Пункт меню «Платформа» | `.menu a[href="#client-modules"]` | `nav_platform_click` |
| Пункт меню «FAQ» | `.menu a[href="#faq"]` | `nav_faq_click` |
| Логотип | `.logo[href="#top"]` | `nav_logo_click` |

## Видео

| Элемент | Триггер | Рекомендуемое событие |
|---------|---------|----------------------|
| Обзорное видео | `#program-video` event `play` | `video_play` |
| Overlay play | `.video-overlay-play` click | `video_play_click` |
| Модальное видео модуля | `.module-video-btn[data-video-src]` click | `video_modal_open` |
| Модальное видео — play | `#video-modal-video` event `play` | `video_play` |
| Яндекс.Диск fallback | `a[href*="disk.yandex.ru"]` click | `video_external_click` |

## FAQ

| Элемент | Триггер | Рекомендуемое событие |
|---------|---------|----------------------|
| Любой вопрос FAQ | `#faq details` event `toggle` (open) | `faq_open` |

## Вовлечение и прочее

| Элемент | Триггер | Рекомендуемое событие |
|---------|---------|----------------------|
| Подробнее (модуль) | `[data-module-toggle]` click | `module_expand_click` |
| Слайдшоу — точка | `.module-dot` click | `slideshow_dot_click` |
| Скриншот — lightbox | `.module-slideshow-img` click | `lightbox_open` |
| Telegram | `.footer-telegram-link` click | `telegram_click` |
| Email support | `a[href^="mailto:"]` click | `email_click` |
| Юридический документ | footer / form links | `legal_doc_click` |
| Скролл до формы | `#form` IntersectionObserver 50% | `scroll_to_form` |
| Скролл до тарифа | `#pricing` IntersectionObserver 50% | `scroll_to_pricing` |
| Закрыть (legal) | `.close` click | `legal_close_click` |

---

# Яндекс.Метрика

## Установка счётчика

Разместить на **всех** страницах: `index.html`, `offer.html`, `privacy-policy.html`, `personal-data-consent.html`, `marketing-consent.html`.

```html
<!-- Yandex.Metrika counter -->
<script type="text/javascript">
  (function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
  })(window, document,'script','https://mc.yandex.ru/metrika/tag.js', 'ym');

  ym(XXXXXX, 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
    ecommerce: false
  });
</script>
```

Замените `XXXXXX` на ID счётчика.

## Вызов целей из кода

```javascript
ym(XXXXXX, 'reachGoal', 'EVENT_NAME', { /* опциональные параметры */ });
```

Или через GTM (рекомендуется): тег «Яндекс.Метрика — достижение цели» на триггер Custom Event = имя события DataLayer.

---

## Полный список целей

| № | Название цели (в интерфейсе Метрики) | Тип цели | JS событие (`reachGoal` / DataLayer `event`) |
|---|--------------------------------------|----------|---------------------------------------------|
| 1 | Отправка заявки | JavaScript-событие | `lead_submit` |
| 2 | Ошибка отправки заявки | JavaScript-событие | `lead_submit_error` |
| 3 | Заявка: Регистрация | JavaScript-событие | `lead_submit_registration` |
| 4 | Заявка: Демо | JavaScript-событие | `lead_submit_demo` |
| 5 | Заявка: Звонок | JavaScript-событие | `lead_submit_callback` |
| 6 | Согласие на рассылку | JavaScript-событие | `marketing_opt_in` |
| 7 | Клик «Регистрация» (SaaS) | JavaScript-событие *или* «Посещение страниц» `new.progress-market.ru/registration` | `registration_click` |
| 8 | Открытие чата | JavaScript-событие | `chat_open` |
| 9 | Закрытие чата | JavaScript-событие | `chat_close` |
| 10 | Начало диалога в чате | JavaScript-событие | `chat_start` |
| 11 | Отправка сообщения в чате | JavaScript-событие | `chat_send` |
| 12 | Ошибка отправки в чате | JavaScript-событие | `chat_send_error` |
| 13 | CTA «Получить консультацию» | JavaScript-событие | `cta_consultation_click` |
| 14 | CTA «Посмотреть стоимость» | JavaScript-событие | `cta_pricing_view_click` |
| 15 | CTA «Оформить заявку» | JavaScript-событие | `cta_apply_click` |
| 16 | Воспроизведение видео | JavaScript-событие | `video_play` |
| 17 | Открытие видео-модалки | JavaScript-событие | `video_modal_open` |
| 18 | Клик на видео (Яндекс.Диск) | JavaScript-событие | `video_external_click` |
| 19 | Раскрытие FAQ | JavaScript-событие | `faq_open` |
| 20 | Клик Telegram | JavaScript-событие | `telegram_click` |
| 21 | Клик email | JavaScript-событие | `email_click` |
| 22 | Скролл до формы | JavaScript-событие | `scroll_to_form` |
| 23 | Скролл до тарифа | JavaScript-событие | `scroll_to_pricing` |
| 24 | Раскрытие модуля «Подробнее» | JavaScript-событие | `module_expand_click` |
| 25 | Открытие lightbox | JavaScript-событие | `lightbox_open` |

### Приоритет целей (для отчётов)

| Приоритет | Цели |
|-----------|------|
| **P0 — лиды** | `lead_submit`, `chat_send`, `registration_click` |
| **P1 — квалификация** | `lead_submit_registration`, `lead_submit_demo`, `lead_submit_callback`, `chat_start` |
| **P2 — вовлечение** | `cta_consultation_click`, `cta_apply_click`, `video_play`, `faq_open`, `scroll_to_form` |

---

# GTM

## Контейнер

1. Создать контейнер GTM для `progressmarket.ru`.
2. Вставить snippet GTM в `<head>` и `<body>` всех HTML-страниц.
3. Инициализировать DataLayer до GTM:

```html
<script>
  window.dataLayer = window.dataLayer || [];
</script>
```

## Рекомендуемая схема тегов

| Тег GTM | Триггер | Действие |
|---------|---------|----------|
| YM — Base counter | All Pages | Инициализация Метрики |
| YM — reachGoal | Custom Event = `event` из DataLayer | `ym(ID, 'reachGoal', {{Event}})` |
| GA4 Event *(опционально)* | Custom Event | Параллельная отправка в GA4 |

## DataLayer — все целевые действия

### Макроконверсии

```javascript
// Успешная отправка заявки
dataLayer.push({
  event: "lead_submit",
  form_id: "lead-form",
  request_type: "Регистрация", // или "Демо", "Звонок"
  marketing_consent: true
});

// Ошибка заявки
dataLayer.push({
  event: "lead_submit_error",
  form_id: "lead-form",
  error_message: "текст ошибки"
});

// Заявка по типу (дополнительно к lead_submit)
dataLayer.push({
  event: "lead_submit_registration",
  form_id: "lead-form"
});

dataLayer.push({
  event: "lead_submit_demo",
  form_id: "lead-form"
});

dataLayer.push({
  event: "lead_submit_callback",
  form_id: "lead-form"
});

// Маркетинговое согласие
dataLayer.push({
  event: "marketing_opt_in",
  form_id: "lead-form"
});

// Клик «Регистрация» → SaaS
dataLayer.push({
  event: "registration_click",
  link_url: "https://new.progress-market.ru/registration"
});
```

### Чат

```javascript
// Открытие чата
dataLayer.push({
  event: "chat_open"
});

// Закрытие чата
dataLayer.push({
  event: "chat_close"
});

// Intro форма пройдена
dataLayer.push({
  event: "chat_start",
  has_phone: true,
  has_email: false
});

// Сообщение отправлено в поддержку
dataLayer.push({
  event: "chat_send",
  form_id: "pm-helpdesk-compose-form"
});

// Ошибка чата
dataLayer.push({
  event: "chat_send_error",
  error_message: "текст ошибки"
});
```

### CTA

```javascript
dataLayer.push({
  event: "cta_consultation_click",
  cta_text: "Получить консультацию",
  cta_location: "hero"
});

dataLayer.push({
  event: "cta_pricing_view_click",
  cta_text: "Посмотреть стоимость",
  cta_location: "hero"
});

dataLayer.push({
  event: "cta_apply_click",
  cta_text: "Оформить заявку",
  cta_location: "pricing" // или "section_cta"
});

dataLayer.push({
  event: "nav_form_click",
  link_text: "Заявка"
});
```

### Видео

```javascript
dataLayer.push({
  event: "video_play",
  video_id: "program",
  video_title: "Обзор платформы",
  video_src: "assets/overview.mp4"
});

dataLayer.push({
  event: "video_modal_open",
  video_id: "module_02_plan",
  video_title: "Построение плана",
  video_src: "videos/module-02-plan-control.mp4"
});

dataLayer.push({
  event: "video_external_click",
  link_url: "https://disk.yandex.ru/d/HlLVKbrHnUXBHw"
});
```

### FAQ

```javascript
dataLayer.push({
  event: "faq_open",
  faq_question: "Сколько стоит?",
  faq_id: "faq-price"
});
```

### Вовлечение

```javascript
dataLayer.push({
  event: "module_expand_click",
  module_label: "Модуль 02"
});

dataLayer.push({
  event: "lightbox_open",
  image_src: "assets/dashboard-1.png"
});

dataLayer.push({
  event: "telegram_click",
  link_url: "https://t.me/ChatProgMarket"
});

dataLayer.push({
  event: "email_click",
  email: "support@progress-market.ru"
});

dataLayer.push({
  event: "scroll_to_form"
});

dataLayer.push({
  event: "scroll_to_pricing"
});

dataLayer.push({
  event: "legal_doc_click",
  doc_url: "offer.html",
  doc_title: "Пользовательское соглашение"
});
```

---

## Точки внедрения в существующий код

Без изменения бизнес-логики — добавить `dataLayer.push` / `ym()` в указанные места:

| Файл | Место | Событие |
|------|-------|---------|
| `script.js` | После успешного `sendLeadViaPhp()` (~строка 449) | `lead_submit` + тип заявки |
| `script.js` | В блоке `catch` submit handler (~строка 452) | `lead_submit_error` |
| `script.js` | `#program-video` listener `play` (~строка 524) | `video_play` |
| `script.js` | `.module-video-btn` click (~строка 840) | `video_modal_open` |
| `script.js` | `#video-modal-video` play в `openVideoModal` | `video_play` |
| `script.js` | `[data-module-toggle]` click (~строка 795) | `module_expand_click` |
| `script.js` | `openLightbox()` (~строка 566) | `lightbox_open` |
| `helpdesk.js` | `openPanel()` (~строка 241) | `chat_open` |
| `helpdesk.js` | `closePanel()` (~строка 251) | `chat_close` |
| `helpdesk.js` | intro submit success (~строка 415) | `chat_start` |
| `helpdesk.js` | compose submit success (~строка 457) | `chat_send` |
| `helpdesk.js` | compose submit catch (~строка 462) | `chat_send_error` |
| `index.html` или GTM | click на `.nav-btn-register` | `registration_click` |
| `index.html` или GTM | click на CTA-ссылки | соответствующие `cta_*` |
| `index.html` или GTM | `#faq details` toggle | `faq_open` |

### Альтернатива без правки JS — только GTM

| Триггер GTM | Условие | Событие |
|-------------|---------|---------|
| Click — All Elements | Click URL contains `#form` | `cta_apply_click` / `nav_form_click` |
| Click — All Elements | Click URL = `https://new.progress-market.ru/registration` | `registration_click` |
| Click — All Elements | Click Classes contains `nav-btn-register` | `registration_click` |
| Click — All Elements | Click Classes contains `pm-helpdesk-fab` | `chat_open` |
| Click — All Elements | Click Classes contains `footer-telegram-link` | `telegram_click` |
| Form Submission | Form ID = `lead-form` | ⚠️ Не сработает — submit перехватывается JS (`preventDefault`) |
| Custom Event | Из `dataLayer.push` в коде | Все макроконверсии |

> **Важно:** формы `#lead-form` и `#pm-helpdesk-compose-form` используют `event.preventDefault()` — цели «Отправка формы» в GTM **не сработают** без `dataLayer.push` в `script.js` / `helpdesk.js`.

---

## Чеклист перед запуском

- [ ] Счётчик Метрики на всех 5 HTML-страницах
- [ ] GTM-контейнер на всех страницах
- [ ] Цели P0: `lead_submit`, `chat_send`, `registration_click`
- [ ] Тест в режиме предпросмотра GTM + отладка Метрики
- [ ] Кросс-домен: `new.progress-market.ru` (отдельный счётчик или связка доменов)
- [ ] Не передавать в DataLayer телефон и email в открытом виде (только флаги `has_phone`, `request_type`)

---

*Отчёт подготовлен для внедрения аналитики. Исходный код сайта не изменялся.*
