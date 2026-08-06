# Технический аудит проекта ProgressMarket

**Дата аудита:** 20 мая 2026  
**Репозиторий:** `/Users/romanvladimirov/Documents/AI-Cursor/Saite-PM`  
**Продакшен-домен:** `https://progressmarket.ru/`  
**Режим:** только анализ, изменения в код не вносились.

---

# 1. Общая информация

| Параметр | Значение |
|----------|----------|
| **Название проекта** | ProgressMarket (лендинг сервиса управления продажами на Wildberries) |
| **Технологический стек** | HTML5, CSS3, Vanilla JavaScript (ES6+), PHP 8.x |
| **Framework** | Отсутствует (не React, не Vue, не Next.js — классический статический лендинг) |
| **Язык программирования** | Frontend: JavaScript; Backend: PHP |
| **Система сборки** | Отсутствует (нет Webpack, Vite, npm-скриптов; файлы отдаются как есть) |
| **Деплой** | Ручная загрузка в `public_html` на хостинге **Beget** (FTP / файловый менеджер). PHP 8.0+, расширение cURL. Документация: `AMOCRM-BEGET-SETUP.md` |

### Внешние интеграции

| Сервис | Назначение |
|--------|------------|
| **amoCRM REST API** | Создание контактов и сделок из формы заявки (`lead.php`) и чата (`helpdesk.php`) |
| **Яндекс SmartCaptcha** | Защита форм от ботов (видимый виджет на главной форме, невидимый — в чате) |
| **Google Fonts** | Шрифт Inter |
| **Внешняя SaaS-платформа** | `https://new.progress-market.ru/registration` — регистрация в продукте |

### Backend-эндпоинты

| URL | Файл | Метод |
|-----|------|-------|
| `/lead.php` | `lead.php` | POST JSON |
| `/helpdesk.php` | `helpdesk.php` | POST JSON |
| `/captcha-site-key.php` | `captcha-site-key.php` | GET (отдаёт JS с ключом капчи) |
| `/amo-list-pipelines-once.php` | `amo-list-pipelines-once.php` | GET (служебный, одноразовый) |

### Секреты (не в Git)

- `lead-config.php` — ключи amoCRM, SmartCaptcha, ID воронок
- `.lead-amocrm-token.json` — кэш OAuth-токена amoCRM (создаётся на сервере)

---

# 2. Структура сайта

Сайт состоит из **одной многосекционной главной страницы** и **четырёх юридических страниц**. Маршрутизации SPA/React Router нет.

## 2.1. Главная страница (лендинг)

| Параметр | Значение |
|----------|----------|
| **URL** | `https://progressmarket.ru/` (`index.html`) |
| **Название** | ProgressMarket — Полная оцифровка и управление Wildberries |
| **Назначение** | Продающий лендинг: описание модулей платформы, тариф, FAQ, форма заявки, виджет поддержки |
| **Основные блоки (якоря)** | См. таблицу ниже |

### Секции главной страницы

| Якорь | ID | Название секции | Основные блоки |
|-------|-----|-----------------|----------------|
| Верх | `#top` | Hero | Заголовок, подзаголовок, CTA, бейджи WB/Ozon, фото спикера |
| — | — | Обзорное видео | `<video id="program-video">`, ссылка на Яндекс.Диск |
| — | — | Статистика / преимущества | 6 карточек (точность, функционал, освоение и т.д.) |
| Платформа | `#client-modules` | Что получает клиент | 9 модулей (01–09): текст, слайдшоу скриншотов, кнопки «Подробнее» и «Видео» |
| — | `#speaker` | Спикер | Карточка Игоря Шанченко |
| Стоимость | `#pricing` | Тариф | 7 950 ₽/мес, список модулей, CTA |
| Возможности | `#modules` | Ключевые модули | Краткие карточки 7 модулей |
| — | — | CTA-блок | «Подключите ProgressMarket к вашему бизнесу» |
| FAQ | `#faq` | Частые вопросы | 7 раскрывающихся `<details>` |
| Заявка | `#form` | Форма заявки | `#lead-form`, Yandex SmartCaptcha, чекбоксы согласий |
| — | — | Lightbox | `#image-lightbox` — увеличение скриншотов |
| — | — | Video modal | `#video-modal` — модальные видео модулей |
| — | — | Helpdesk widget | `#pm-helpdesk` — чат поддержки (FAB + панель) |
| — | — | Footer | Юридические ссылки, реквизиты, Telegram, копирайт |

## 2.2. Пользовательское соглашение

| Параметр | Значение |
|----------|----------|
| **URL** | `https://progressmarket.ru/offer.html` |
| **Название** | Пользовательское соглашение — Progress Market |
| **Назначение** | Публичная оферта на доступ к сервису |
| **Основные блоки** | Текст соглашения (14+ разделов), кнопка «Закрыть» → `index.html#form` |

## 2.3. Политика обработки персональных данных

| Параметр | Значение |
|----------|----------|
| **URL** | `https://progressmarket.ru/privacy-policy.html` |
| **Названение** | Политика обработки персональных данных |
| **Назначение** | Юридический документ по 152-ФЗ |
| **Основные блоки** | Текст политики, кнопка «Закрыть» → `index.html#form` |

## 2.4. Согласие на обработку персональных данных

| Параметр | Значение |
|----------|----------|
| **URL** | `https://progressmarket.ru/personal-data-consent.html` |
| **Название** | Согласие на обработку персональных данных |
| **Назначение** | Шаблон согласия для формы заявки |
| **Основные блоки** | Текст согласия, кнопка «Закрыть» → `index.html#form` |

## 2.5. Согласие на рекламные рассылки

| Параметр | Значение |
|----------|----------|
| **URL** | `https://progressmarket.ru/marketing-consent.html` |
| **Название** | Согласие на рекламные и информационные рассылки |
| **Назначение** | Условия маркетинговых рассылок |
| **Основные блоки** | Текст согласия, кнопка «Закрыть» → `index.html#form` |

---

# 3. Все формы

## 3.1. Форма заявки (основная лидогенерация)

| Параметр | Значение |
|----------|----------|
| **Название** | Форма заявки / Lead form |
| **ID** | `lead-form` |
| **Где находится** | `index.html`, секция `#form` |
| **Метод отправки** | AJAX `fetch("lead.php")`, `POST`, `Content-Type: application/json` |

### Поля

| Поле | `name` | Тип | Обязательное | Описание |
|------|--------|-----|--------------|----------|
| Имя | `name` | `text` | Да (`required`) | Имя клиента |
| Телефон | `phone` | `tel` | Да (`required`) | Маска +7, 11 цифр |
| Email | `email` | `email` | Нет | Опционально |
| Формат | `requestType` | `select` | Да | Регистрация / Демо / Звонок |
| Комментарий | `comment` | `textarea` | Нет | Свободный текст |
| Согласие с условиями | `consent` | `checkbox` | Да (`required`) | Оферта + ПДн |
| Маркетинговое согласие | `marketingConsent` | `checkbox` | Нет | Рассылки |
| Honeypot | `hp_trap` | `text` | Скрыто | Антиспам (`#lead-hp-trap`) |
| SmartCaptcha token | — | — | Да (неявно) | `smartcaptcha_token` в JSON |

### Куда отправляются данные

1. **Клиент:** `script.js` → `POST /lead.php`
2. **Сервер:** проверка honeypot, валидация, Yandex SmartCaptcha validate API
3. **CRM:** amoCRM — контакт + сделка `Сайт: {Формат} — {Имя}` в воронке «регистрация сайта» + примечание

### Валидация

| Уровень | Правила |
|---------|---------|
| **HTML5** | `required` на имени, телефоне, формате, согласии |
| **JavaScript** | Российский телефон `+7` + 10 цифр; проверка ключа SmartCaptcha `ysc1_`; обязательное прохождение капчи |
| **PHP (`lead.php`)** | Имя, телефон, `requestType` из whitelist `['Регистрация','Демо','Звонок']`; согласие; SmartCaptcha server-side; honeypot |

---

## 3.2. Форма входа в чат (helpdesk intro)

| Параметр | Значение |
|----------|----------|
| **Название** | Helpdesk intro form |
| **ID** | `pm-helpdesk-intro-form` |
| **Где находится** | Виджет `#pm-helpdesk`, панель чата |
| **Отправка на сервер** | **Нет** — данные сохраняются в `localStorage` (`pm_helpdesk_v1`) |

### Поля

| Поле | `name` | Тип | Обязательное |
|------|--------|-----|--------------|
| Имя | `name` | `text` | Да |
| Телефон | `phone` | `tel` | Хотя бы телефон или email |
| Email | `email` | `email` | Хотя бы телефон или email |

### Валидация (JavaScript)

- Имя не пустое
- Телефон **или** email обязателен
- Телефон: мобильный `+79XXXXXXXXX`, отклонение «фейковых» номеров (все цифры одинаковые), после +7 только 9
- Email: regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`

---

## 3.3. Форма сообщения в чате (helpdesk compose)

| Параметр | Значение |
|----------|----------|
| **Название** | Helpdesk compose form |
| **ID** | `pm-helpdesk-compose-form` |
| **Где находится** | Footer виджета чата (после intro) |
| **Метод отправки** | AJAX `fetch("/helpdesk.php")`, `POST`, JSON |

### Поля

| Поле | ID | Тип | Обязательное |
|------|-----|-----|--------------|
| Сообщение | `pm-helpdesk-message` | `textarea` | Да |

В JSON также передаются: `name`, `phone`, `email` из профиля intro, `pageUrl`, `smartcaptcha_token`, `hp_trap`.

### Куда отправляются данные

1. **Клиент:** `helpdesk.js` → `POST /helpdesk.php`
2. **Сервер:** SmartCaptcha (невидимая), валидация
3. **CRM:** amoCRM — сделка `Чат: {Имя}` в воронке «входящие обращения» + примечание с текстом

### Валидация

| Уровень | Правила |
|---------|---------|
| **JavaScript** | Профиль должен быть заполнен; текст не пустой |
| **PHP (`helpdesk.php`)** | Имя + сообщение; телефон или email; до 4000 символов; мобильный RU; SmartCaptcha |

---

# 4. Все кнопки и CTA

> **Примечание:** кнопки слайдов (`.module-dot`) создаются динамически в `script.js` — всего **41 шт.** (5+5+4+4+2+8+2+3+8 по модулям). В таблице они указаны агрегированно. Нативные контролы `<video controls>` (play/pause/seek) также кликабельны, но не перечислены поштучно.

## 4.1. Главная страница (`index.html`)

| Страница | Текст кнопки | ID | Class | Действие |
|----------|--------------|-----|-------|----------|
| Главная | ProgressMarket | — | `logo` | Якорь `#top` |
| Главная | Возможности | — | `menu` (ссылка) | Якорь `#modules` |
| Главная | Стоимость | — | `menu` (ссылка) | Якорь `#pricing` |
| Главная | Платформа | — | `menu` (ссылка) | Якорь `#client-modules` |
| Главная | Заявка | — | `menu` (ссылка) | Якорь `#form` |
| Главная | FAQ | — | `menu` (ссылка) | Якорь `#faq` |
| Главная | Регистрация | — | `btn btn-sm nav-btn-register` | Внешняя ссылка `new.progress-market.ru/registration` (новая вкладка) |
| Главная | Получить консультацию | — | `btn` | Якорь `#form` |
| Главная | Посмотреть стоимость | — | `btn btn-ghost` | Якорь `#pricing` |
| Главная | (иконка play) | — | `video-overlay-play` | Воспроизведение `#program-video` |
| Главная | смотреть обзор на Яндекс.Диске | — | — (ссылка) | `disk.yandex.ru` (новая вкладка) |
| Главная | Подробнее (×9) | — | `module-toggle-more` | Раскрытие/сворачивание текста модуля |
| Главная | Видео обзор (disabled ×7) | — | `btn btn-sm module-video-btn module-video-btn--soon` | Неактивна (`disabled`) |
| Главная | Видео: Построение плана | — | `btn btn-sm module-video-btn` | Открытие `#video-modal` с `videos/module-02-plan-control.mp4` |
| Главная | Видео: Контроль факта | — | `btn btn-sm module-video-btn` | Открытие `#video-modal` с `videos/module-02-2-plan-fact.mp4` |
| Главная | Видео обзор (модуль 08) | — | `btn btn-sm module-video-btn` | Открытие `#video-modal` с `videos/module-08-reviews.mp4` |
| Главная | Оформить заявку (pricing) | — | `btn pricing-cta` | Якорь `#form` |
| Главная | Оформить заявку (CTA) | — | `btn` | Якорь `#form` |
| Главная | Сколько стоит? | — | `<summary>` | Раскрытие FAQ |
| Главная | Безопасно ли подключать API-ключ? | — | `<summary>` | Раскрытие FAQ |
| Главная | Как быстро начать работать? | — | `<summary>` | Раскрытие FAQ |
| Главная | Есть скидки при оплате за несколько месяцев? | — | `<summary>` | Раскрытие FAQ |
| Главная | Подойдёт ли сервис для команды? | — | `<summary>` | Раскрытие FAQ |
| Главная | Можно ли оставить заявку на звонок и демо? | — | `<summary>` | Раскрытие FAQ |
| Главная | Есть ли интеграция с Wildberries? | — | `<summary>` | Раскрытие FAQ |
| Главная | Пользовательское соглашение | — | — (ссылка в checkbox) | `offer.html` (новая вкладка) |
| Главная | обработку персональных данных | — | — (ссылка в checkbox) | `personal-data-consent.html` |
| Главная | условия рассылки | — | — (ссылка в checkbox) | `marketing-consent.html` |
| Главная | Отправить заявку | — | `btn` (submit) | Submit `#lead-form` → `lead.php` |
| Главная | × | `lightbox-close` | `lightbox-close` | Закрытие lightbox |
| Главная | ‹ | `lightbox-prev` | `lightbox-nav lightbox-prev` | Предыдущий слайд в lightbox |
| Главная | › | `lightbox-next` | `lightbox-nav lightbox-next` | Следующий слайд в lightbox |
| Главная | × | `video-modal-close` | `video-modal-close` | Закрытие видео-модалки |
| Главная | (backdrop) | — | `video-modal-backdrop` | Закрытие видео-модалки |
| Главная | ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ… | — | `footer-links` | `offer.html` |
| Главная | Политика обработки ПДн | — | `footer-links` | `privacy-policy.html` |
| Главная | Согласие на обработку ПДн | — | `footer-links` | `personal-data-consent.html` |
| Главная | Согласие на рассылки | — | `footer-links` | `marketing-consent.html` |
| Главная | support@progress-market.ru | — | — (mailto) | Открытие почтового клиента |
| Главная | (иконка Telegram) | — | `footer-telegram-link` | `t.me/ChatProgMarket` (новая вкладка) |
| Главная | (иконка чата) | `pm-helpdesk-fab` | `pm-helpdesk-fab` | Открытие/закрытие панели чата |
| Главная | × | `pm-helpdesk-close` | `pm-helpdesk-close` | Закрытие панели чата |
| Главная | Начать диалог | — | `btn` (submit) | Submit intro-формы чата (localStorage) |
| Главная | (иконка отправки) | — | `pm-helpdesk-send` | Submit сообщения → `helpdesk.php` |
| Главная | Слайд N (×41) | — | `module-dot` | Переключение слайда в слайдшоу модуля |
| Главная | (изображения слайдов) | — | `module-slideshow-img` | Клик → открытие `#image-lightbox` |

## 4.2. Юридические страницы

| Страница | Текст кнопки | ID | Class | Действие |
|----------|--------------|-----|-------|----------|
| offer.html | Закрыть | — | `close` | Переход `index.html#form` |
| privacy-policy.html | Закрыть | — | `close` | Переход `index.html#form` |
| personal-data-consent.html | Закрыть | — | `close` | Переход `index.html#form` |
| marketing-consent.html | Закрыть | — | `close` | Переход `index.html#form` |

---

# 5. Навигация

## 5.1. Главное меню (header)

Расположение: `<header class="header">` → `<nav class="menu">`

| Пункт | Href | Целевая секция |
|-------|------|----------------|
| ProgressMarket (логотип) | `#top` | Hero |
| Возможности | `#modules` | Ключевые модули |
| Стоимость | `#pricing` | Тариф |
| Платформа | `#client-modules` | Детальные модули |
| Заявка | `#form` | Форма заявки |
| FAQ | `#faq` | Вопросы и ответы |

Дополнительно в header: кнопка **«Регистрация»** → внешний URL SaaS.

## 5.2. Мобильное меню

**Отдельного мобильного меню (бургер, off-canvas) нет.**

При ширине экрана **≤ 760px** (`styles.css`):

- `.menu { display: none; }` — пункты навигации **скрываются**
- Остаются: логотип и кнопка «Регистрация» на всю ширину
- Переход к секциям на мобильных возможен только через CTA-кнопки в контенте, скролл или прямые якорные ссылки

## 5.3. Footer меню

### Блок «Юридические документы»

| Ссылка | URL |
|--------|-----|
| Пользовательское соглашение | `offer.html` |
| Политика обработки персональных данных | `privacy-policy.html` |
| Согласие на обработку персональных данных | `personal-data-consent.html` |
| Согласие на рекламные и информационные рассылки | `marketing-consent.html` |

### Блок «Реквизиты»

- ОГРНИП, ИНН (текст)
- Email: `support@progress-market.ru`
- Telegram: `https://t.me/ChatProgMarket`

---

# 6. Аналитика

Проверены все HTML-файлы и JS на наличие счётчиков и пикселей.

| Система | Статус |
|---------|--------|
| **Яндекс Метрика** | ❌ Не подключена |
| **Google Analytics** | ❌ Не подключена |
| **Google Tag Manager** | ❌ Не подключен |
| **VK Pixel** | ❌ Не подключен |
| **Facebook Pixel** | ❌ Не подключен |
| **TikTok Pixel** | ❌ Не подключен |

### Что подключено вместо аналитики

| Сервис | Назначение | Идентификатор |
|--------|------------|---------------|
| **Яндекс SmartCaptcha** | Антиспам (не аналитика) | Ключ клиента загружается из `lead-config.php` через `captcha-site-key.php` → `window.PM_SMARTCAPTCHA_SITE_KEY` |
| **Schema.org JSON-LD** | SEO-разметка | `SoftwareApplication`, цена 7950 RUB |

> Строка «INVESTMENTS PREDICTIVE ANALYTICS» в блоке формы — декоративный текст бренда, не код аналитики.

---

# 7. Формы лидогенерации

| Тип | Реализовано | Как |
|-----|-------------|-----|
| **Заказать звонок** | ✅ Частично | Опция `requestType = "Звонок"` в форме `#lead-form` (не отдельная форма) |
| **Оставить заявку** | ✅ Да | Форма `#lead-form` → `lead.php` → amoCRM |
| **Регистрация** | ✅ Два канала | (1) Опция в форме заявки; (2) внешняя кнопка → `new.progress-market.ru/registration` |
| **Подписка** | ❌ Нет | Отдельной формы подписки на рассылку нет (только опциональный чекбокс маркетинга в заявке) |
| **Обратная связь** | ✅ Да | Виджет чата `#pm-helpdesk` → `helpdesk.php` → amoCRM (воронка «входящие обращения») |

### Дополнительные каналы связи (не формы)

- Email: `support@progress-market.ru`
- Telegram: `https://t.me/ChatProgMarket`

---

# 8. Конверсии

Действия пользователя, которые можно считать **микро- и макроконверсиями**:

## Макроконверсии (лиды / регистрация)

| # | Событие | Тип | CRM / результат |
|---|---------|-----|-----------------|
| 1 | Успешная отправка формы заявки | Lead | Сделка в amoCRM, этап «Регистрация с сайта» |
| 2 | Заявка с типом «Регистрация» | Lead (qualified) | То же + формат в названии сделки |
| 3 | Заявка с типом «Демо» | Lead (demo request) | Сделка `Сайт: Демо — {Имя}` |
| 4 | Заявка с типом «Звонок» | Lead (callback) | Сделка `Сайт: Звонок — {Имя}` |
| 5 | Отправка сообщения в чат поддержки | Lead / support | Сделка `Чат: {Имя}` в воронке обращений |
| 6 | Клик «Регистрация» в header | Registration intent | Переход на SaaS (вне сайта, нужен отдельный трекинг на `new.progress-market.ru`) |
| 7 | Согласие на маркетинговые рассылки | Opt-in | Флаг в примечании amoCRM |

## Микроконверсии (вовлечение)

| # | Событие |
|---|---------|
| 8 | Клик CTA «Получить консультацию» |
| 9 | Клик CTA «Оформить заявку» (pricing / mid-page) |
| 10 | Скролл до секции `#form` |
| 11 | Открытие виджета чата (FAB) |
| 12 | Завершение intro-формы чата («Начать диалог») |
| 13 | Воспроизведение обзорного видео `#program-video` |
| 14 | Просмотр видео модуля в модалке (02, 08) |
| 15 | Раскрытие блока «Подробнее» в модуле |
| 16 | Просмотр скриншота в lightbox |
| 17 | Переход на Яндекс.Диск (fallback видео) |
| 18 | Клик по ссылке Telegram |
| 19 | Клик mailto support |
| 20 | Раскрытие пункта FAQ |
| 21 | Переход на юридические страницы из footer / формы |

---

# 9. Компоненты

> **Важно:** проект **не использует** React, Vue или Next.js. Ниже перечислены **логические UI-модули** (секции HTML + JS-функциональность), аналогичные компонентам в SPA-проектах.

## 9.1. HTML-секции (`index.html`)

| Модуль | Файл / селектор | Описание |
|--------|-----------------|----------|
| Header / Nav | `.header`, `.nav`, `.menu` | Фиксированная шапка с якорной навигацией |
| Hero | `.hero` | Первый экран с CTA |
| Program Video | `.program-video-block` | Встроенное видео + overlay play |
| Stats Cards | `.stats-block`, `.card` | 6 преимуществ |
| Client Modules | `#client-modules`, `.module-row` | 9 детальных модулей со слайдшоу |
| Speaker Card | `#speaker`, `.speaker-card` | Блок эксперта |
| Pricing Card | `#pricing`, `.pricing-card` | Тариф и список функций |
| Module List | `#modules`, `.module-list` | Краткий список модулей |
| CTA Box | `.section-cta`, `.cta-box` | Промежуточный призыв к действию |
| FAQ | `#faq`, `.faq`, `<details>` | Аккордеон вопросов |
| Lead Form | `#form`, `#lead-form` | Основная форма + SmartCaptcha |
| Image Lightbox | `#image-lightbox` | Галерея скриншотов |
| Video Modal | `#video-modal` | Модальное окно для видео модулей |
| Footer | `.footer`, `.legal-columns` | Юридическая информация |
| Helpdesk Widget | `#pm-helpdesk` | Чат поддержки |

## 9.2. JavaScript-модули

| Модуль | Файл | Функции |
|--------|------|---------|
| Lead Form Handler | `script.js` | Маска телефона, SmartCaptcha, отправка в `lead.php` |
| SmartCaptcha Loader | `script.js` | Загрузка captcha.js с fallback URL |
| Module Slideshows | `script.js` | `initModuleSlideshows()` — автопрокрутка, точки |
| Module Collapsible | `script.js` | `initModuleTextCollapsibles()` — «Подробнее» / «Свернуть» |
| Image Lightbox | `script.js` | Увеличение скриншотов, навигация |
| Video Modal | `script.js` | `initModuleVideoModal()` |
| Video Overlay Play | `script.js` | Кнопка play на hero-видео |
| Helpdesk Chat | `helpdesk.js` | FAB, intro, compose, localStorage, `helpdesk.php` |
| Year in Footer | `script.js` | `#year` — текущий год |

## 9.3. Backend-модули (PHP)

| Модуль | Файл | Описание |
|--------|------|----------|
| Lead API | `lead.php` | Обработка заявки, amoCRM, SmartCaptcha |
| Helpdesk API | `helpdesk.php` | Обработка чата |
| amoCRM Library | `amo-lib.php` | Общие функции OAuth, API, CORS, капча |
| Captcha Key Endpoint | `captcha-site-key.php` | Публичный ключ клиента |
| Pipeline Helper | `amo-list-pipelines-once.php` | Одноразовый список воронок amoCRM |

## 9.4. Стили

| Файл | Область |
|------|---------|
| `styles.css` | Основной лендинг |
| `helpdesk.css` | Виджет чата |
| `legal.css` | Юридические страницы |

---

# 10. Карта проекта

> Классическая структура `/src`, `/pages`, `/components` **отсутствует**. Ниже — фактическое дерево репозитория.

```
Saite-PM/
├── index.html                 # Главный лендинг (все секции)
├── offer.html                 # Пользовательское соглашение
├── privacy-policy.html        # Политика ПДн
├── personal-data-consent.html # Согласие на обработку ПДн
├── marketing-consent.html     # Согласие на рассылки
├── styles.css                 # Стили лендинга
├── legal.css                  # Стили юридических страниц
├── script.js                  # Логика лендинга (форма, слайдеры, lightbox, video)
├── helpdesk.js                # Виджет чата
├── helpdesk.css               # Стили чата
├── lead.php                   # API заявок → amoCRM
├── helpdesk.php               # API чата → amoCRM
├── amo-lib.php                # Общая библиотека amoCRM
├── captcha-site-key.php       # Эндпоинт ключа SmartCaptcha
├── amo-list-pipelines-once.php# Служебный скрипт (удалить после настройки)
├── lead-config.sample.php     # Шаблон конфигурации
├── lead-config.php            # Секреты (gitignored, только на сервере)
├── .lead-amocrm-token.json    # Кэш токена (gitignored, на сервере)
├── sitemap.xml
├── robots.txt
├── AMOCRM-BEGET-SETUP.md      # Документация деплоя
├── SITE_AUDIT_REPORT.md       # Этот отчёт
├── .gitignore
└── assets/                    # Изображения, иконки
    ├── hero-dashboard.png
    ├── hero-speaker.png
    ├── speaker-igor.png
    ├── overview.mp4           # (ожидается на сервере)
    ├── telegram-icon-clean.png
    ├── dashboard-*.png        # Скриншоты модулей
    ├── plan-fact-*.png
    ├── supply-*.png
    ├── autobook-*.png
    ├── orders-sales-*.png
    ├── bidder-*.png
    ├── repricer-*.png
    ├── reviews-appeal-*.png
    ├── finance-report-*.png
    └── …
```

### Ожидаемые, но отсутствующие в репозитории каталоги

```
videos/                        # Видео модулей (ссылки в index.html)
├── module-02-plan-control.mp4
├── module-02-2-plan-fact.mp4
└── module-08-reviews.mp4
```

### Соответствие запрошенной структуре SPA

| Запрошенный путь | Фактический аналог |
|------------------|-------------------|
| `/src` | Корень проекта (HTML/CSS/JS напрямую) |
| `/pages` | `index.html`, `*.html` (юридические) |
| `/components` | Секции в `index.html` + функции в `script.js` / `helpdesk.js` |
| `/hooks` | Отсутствует |
| `/services` | `lead.php`, `helpdesk.php`, `amo-lib.php` |
| `/public` | `assets/` |

---

# 11. Рекомендации для внедрения аналитики

На момент аудита **ни одна система веб-аналитики не подключена**. Ниже — приоритетный план внедрения.

## 11.1. Базовая инфраструктура

1. **Яндекс Метрика** — основной инструмент для RU-трафика (`progressmarket.ru`).
   - Включить: вебвизор, карта кликов, ecommerce не требуется (нет корзины на лендинге).
   - Цели через `ym(COUNTER_ID, 'reachGoal', 'GOAL_NAME')`.

2. **Google Tag Manager** (опционально) — если планируются GA4 + рекламные пиксели из одной точки.

3. **Отдельный трекинг на `new.progress-market.ru`** — для кнопки «Регистрация» в header (кросс-доменные цели или UTM).

## 11.2. События для отслеживания

### Макроцели (обязательно)

| Событие | ID цели (пример) | Триггер |
|---------|------------------|---------|
| `lead_form_success` | lead_submit | Успешный ответ `lead.php` (`data.ok === true`) в `script.js` |
| `lead_form_error` | lead_error | Ошибка отправки формы |
| `helpdesk_message_sent` | chat_lead | Успешный ответ `helpdesk.php` |
| `helpdesk_opened` | chat_open | Клик `#pm-helpdesk-fab` |
| `helpdesk_intro_complete` | chat_start | Submit intro-формы |
| `registration_click` | saas_register | Клик `.nav-btn-register` |
| `registration_lead_type` | lead_register | `requestType === "Регистрация"` при успехе формы |
| `demo_lead_type` | lead_demo | `requestType === "Демо"` |
| `callback_lead_type` | lead_callback | `requestType === "Звонок"` |
| `marketing_opt_in` | marketing_consent | Чекбокс `marketingConsent` при отправке |

### Микроцели (вовлечение)

| Событие | Триггер |
|---------|---------|
| `cta_consultation_click` | `.hero-cta .btn[href="#form"]` |
| `cta_pricing_click` | `.pricing-cta`, `.section-cta .btn` |
| `scroll_to_form` | Intersection Observer на `#form` (50% видимости) |
| `scroll_to_pricing` | Intersection Observer на `#pricing` |
| `video_program_play` | `play` на `#program-video` |
| `video_module_open` | Клик `.module-video-btn[data-video-src]` |
| `faq_expand` | `toggle` на `<details>` в `#faq` |
| `telegram_click` | `.footer-telegram-link` |
| `legal_doc_open` | Клики footer / checkbox links |
| `lightbox_open` | Открытие `#image-lightbox` |
| `module_expand` | Клик `[data-module-toggle]` |

## 11.3. Целевые кнопки (приоритет для CRM-аналитики)

| Приоритет | Элемент | Class / селектор |
|-----------|---------|------------------|
| 🔴 P0 | Отправить заявку | `#lead-form button[type=submit]` |
| 🔴 P0 | Начать диалог (чат) | `#pm-helpdesk-intro-form button` |
| 🔴 P0 | Отправить сообщение (чат) | `.pm-helpdesk-send` |
| 🔴 P0 | Регистрация (SaaS) | `.nav-btn-register` |
| 🟠 P1 | Оформить заявку | `.pricing-cta`, `.section-cta .btn` |
| 🟠 P1 | Получить консультацию | `.hero-cta .btn` |
| 🟡 P2 | Открыть чат | `#pm-helpdesk-fab` |
| 🟡 P2 | Видео модулей | `.module-video-btn[data-video-src]` |

## 11.4. Конверсионные формы

| Форма | Воронка | Рекомендация |
|-------|---------|--------------|
| `#lead-form` | Основная лидогенерация | Главная цель Метрики; передавать `requestType` как параметр цели |
| `#pm-helpdesk-compose-form` | Поддержка / входящие | Отдельная цель; дедупликация с основной формой по телефону в CRM |
| Intro чата | Промежуточный шаг | Цель «начало диалога» без отправки на сервер |

## 11.5. Страницы для отдельного отслеживания

| Страница / URL | Зачем |
|----------------|-------|
| `/` (лендинг) | Основной трафик, воронка до заявки |
| `/#form` | Прямые заходы на форму (UTM `/#form`) |
| `/offer.html` | Юридические визиты перед конверсией |
| `/privacy-policy.html` | Доверие / compliance |
| Внешний `/registration` | Финальная регистрация в продукте (отдельный счётчик) |

## 11.6. Технические рекомендации по внедрению

1. Добавить код Метрики в `<head>` всех HTML-страниц (включая юридические).
2. Вызовы целей — в существующие обработчики `script.js` и `helpdesk.js` (после успеха `fetch`, без изменения бизнес-логики).
3. Для кнопок-ссылок — делегирование кликов или `data-ym-goal` атрибуты + один обработчик.
4. Настроить **кросс-доменные ссылки** Метрика ↔ `new.progress-market.ru`.
5. UTM-метки: единый шаблон для рекламных кампаний (`utm_source`, `utm_medium`, `utm_campaign`).
6. Связать цели Метрики с этапами amoCRM (ручная сверка или webhook — вне scope лендинга).
7. Не дублировать передачу PII (телефон, email) в аналитику — только хэши или ID сделки amoCRM.

## 11.7. Рекламные пиксели (при запуске рекламы)

| Платформа | Когда подключать | Событие конверсии |
|-----------|------------------|-------------------|
| VK Pixel | Таргет VK | `lead_form_success` |
| Facebook/Meta Pixel | Meta Ads | Lead event |
| TikTok Pixel | TikTok Ads | SubmitForm |

Рекомендуется подключать через GTM для централизованного управления.

---

## Приложение A. SEO и индексация

| Файл | Содержание |
|------|------------|
| `sitemap.xml` | 5 URL (главная + 4 юридические) |
| `robots.txt` | `Allow: /`, ссылка на sitemap |
| `index.html` | meta description, keywords, Open Graph, canonical, JSON-LD |

## Приложение B. Известные ограничения

| Ограничение | Описание |
|-------------|----------|
| Односторонний чат | Ответы из amoCRM не возвращаются в виджет |
| Нет мобильного меню | Навигация скрыта на экранах ≤760px |
| Видео модулей | Папка `videos/` отсутствует в репозитории — файлы должны быть на сервере |
| Нет CI/CD | Деплой только вручную |
| Нет аналитики | Все конверсии видны только в amoCRM |

---

*Отчёт сформирован автоматически на основе анализа исходного кода репозитория. Код проекта не изменялся.*
