# Заявки с сайта: Beget + PHP + amoCRM (API) + Яндекс SmartCaptcha

Ниже — **полная цепочка**: лендинг → форма → `lead.php` на Beget → проверка капчи → **REST API amoCRM** (контакт + сделка в воронке «Заявки сайта»).  
Имеется в виду подключение через **API** (не «APK»).

---

## Как всё связано (схема)

1. Пользователь на **`progress-market.ru`** заполняет форму и проходит **Яндекс SmartCaptcha**.
2. Браузер отправляет **JSON** методом `POST` на **`https://progress-market.ru/lead.php`** (тот же домен).
3. `lead.php` проверяет капчу на сервере Яндекса, читает секреты из **`lead-config.php`**.
4. По **OAuth** получает `access_token` amoCRM (из кэша или через `refresh_token`).
5. Через API создаётся **контакт**, **сделка** в указанной воронке и этапе, **примечание** с текстом заявки.

Секреты (**ключ сервера капчи**, **client_secret**, **refresh_token**) живут **только** в `lead-config.php` на сервере, не в Git.

---

## Шаг 1. Файлы лендинга и Beget

### 1.1 Что лежит в проекте

| Файл | Назначение |
|------|------------|
| `lead.php` | Принимает JSON, проверяет SmartCaptcha, вызывает API amoCRM. |
| `lead-config.sample.php` | Образец настроек → на сервере копия с именем **`lead-config.php`**. |
| `script.js` | Отправка формы в `lead.php`, **Яндекс SmartCaptcha** (видимый виджет «Я не робот»). |
| `index.html` | Ключ клиента капчи: `window.PM_SMARTCAPTCHA_SITE_KEY`, блок `#pm-smartcaptcha-root`. |
| `styles.css` | Стили, в том числе блока капчи и сообщений формы. |
| `amo-list-pipelines-once.php` | **Одноразово** на сервере: вывести ID воронок и этапов для `lead-config.php`, затем удалить файл. |
| `helpdesk.php` | Сообщения из виджета чата → сделка в воронке **«Входные обращения»**. |
| `helpdesk.js`, `helpdesk.css` | Кнопка чата внизу справа и окно диалога на `index.html`. |
| `amo-lib.php` | Общая логика amoCRM/SmartCaptcha для `helpdesk.php`. |

На сервере PHP сам создаст **`.lead-amocrm-token.json`** (кэш access/refresh) рядом с `lead.php` — в Git его не кладут.

### Воронка для чата (helpdesk)

В `lead-config.php` отдельно от формы заявки:

```php
'amocrm_helpdesk_pipeline_id' => ЧИСЛО,  // воронка «Входные обращения»
'amocrm_helpdesk_status_id' => ЧИСЛО,    // первый этап внутри неё
```

ID возьмите через `amo-list-pipelines-once.php?k=…` (как для основной формы). После настройки отправьте тестовое сообщение из чата на сайте — в amo должна появиться сделка **«Чат: Имя»** с текстом в примечании.

### 1.2 Панель Beget

1. Откройте **Файловый менеджер** (или FTP/SFTP) → каталог сайта, обычно **`public_html`** (или поддомен — свой путь к корню сайта).
2. Загрузите/обновите: **`index.html`**, **`styles.css`**, **`script.js`**, **`lead.php`**, а также картинки и остальные страницы, если менялись.
3. Убедитесь, что для каталога включён **PHP 8.0+** (в панели Beget: настройки сайта / PHP). Нужно расширение **curl** (обычно уже есть).
4. Рядом с `lead.php` создайте **`lead-config.php`** из шаблона (см. шаг 4).

---

## Шаг 2. Яндекс SmartCaptcha (обязательно до теста формы)

Без ключей капчи форма не сможет корректно отправить заявку.

1. Зайдите в **[консоль Yandex Cloud](https://console.cloud.yandex.ru/)** → сервис **SmartCaptcha** (нужен аккаунт с оплатой/триалом по [документации](https://yandex.cloud/ru/docs/smartcaptcha/quickstart)).
2. Создайте капчу. В списке **доменов** укажите:
   - `progress-market.ru`
   - при необходимости `www.progress-market.ru`
3. На карточке капчи скопируйте:
   - **Ключ клиента** → в файл **`index.html`** на сайте, в скрипт внизу страницы:
     ```html
     <script>
       window.PM_SMARTCAPTCHA_SITE_KEY = "ВСТАВИТЬ_КЛЮЧ_КЛИЕНТА";
     </script>
     ```
   - **Ключ сервера** → в **`lead-config.php`** поле `smartcaptcha_server_key`.

Оба ключа должны быть от **одной и той же** капчи.

Проверка на сервере уже настроена в `lead.php` (в т.ч. учёт IP за прокси Beget). URL проверки по умолчанию: `https://smartcaptcha.cloud.yandex.net/validate` — менять не нужно, если Яндекс не менял endpoint.

---

## Шаг 3. Интеграция amoCRM + получение токенов (API)

Сайт не логинится в amo «логином/паролем». Используется **OAuth 2.0**: ваша интеграция получает `refresh_token`, а `lead.php` по нему периодически запрашивает `access_token` и вызывает API.

### 3.0 Куда заходить в интерфейсе (важно: не amoMARKET)

Если открыт раздел **amoMARKET** (иконка цветного пазла слева) — это **магазин готовых виджетов**. Там категории вроде «Email и SMS», в меню «⋯» пункт **«Интеграция с веб-сайтом»**, кнопка **«+ WEB HOOKS»** — всё это **другие сценарии** (витрина приложений, рассылки, свои исходящие вебхуки). **Client ID и Secret для нашего `lead.php` там не создаются.**

Чтобы выполнить **пункт 3** инструкции, сделайте так:

1. **Выйдите из витрины amoMARKET** — переключитесь на обычный раздел (например **Сделки**, **Контакты** или главная воронка).
2. Откройте **Настройки** аккаунта: обычно **шестерёнка** внизу левого меню или клик по **аватару / названию аккаунта** → пункт вроде **«Настройки»** / **«CRM Settings»**.
3. Найдите раздел **«Интеграции»** (иногда «Интеграции и API», в Kommo — аналогично в настройках).
4. Нажмите **«Создать интеграцию»** — тип **«Внешняя интеграция»**. Нужны поля **Client ID** и **Secret**, это не приложение из маркета amoMARKET.

Дальше по шагу **3.1** заполняете Redirect URI и копируете ключи. Когда интеграция создана — переходите к **3.3** (ссылка OAuth) и **3.4** (обмен кода на `refresh_token`).

### 3.1 Создать интеграцию в amoCRM

1. **amoCRM** → **Настройки** → **Интеграции** → создать интеграцию. Если спросят тип: для **`lead.php`** выбирайте **«Внешняя интеграция»** (только API с вашего сервера). **«Приватная интеграция»** — если бы вы ещё загружали JS‑виджет в интерфейс amo; для лендинга это не нужно.
2. Запишите **Integration ID** / **Client ID** и **Secret key** / **Client Secret**.
3. В поле **Redirect URI** (Callback URL) укажите тот адрес, куда amo вернёт пользователя с кодом. Для лендинга удобно:
   - `https://progress-market.ru/`  
   Он должен **буквально совпасть** с тем, что вы пропишете в `lead-config.php` в `amocrm_redirect_uri` (включая слэш или без — как завели в amo).

**Форма «Создать интеграцию» в amo (кратко):**

| Поле | Что указать |
|------|-------------|
| **Ссылка для перенаправления** | Тот же Redirect URI, см. п. 3 выше (например `https://progress-market.ru/`). |
| **Ссылка для хука об отключении** | Обычно **пусто** — для `lead.php` не нужно. |
| **Предоставить доступ** | Достаточно прав на **сделки** и **контакты** (и примечания); «Все» для теста тоже допустимо. |
| **Контроль дублей / Множественные источники** | Для простой формы **не обязательны**. |
| **Название / описание / логотип** | Произвольно, на API не влияет. |

### 3.2 Права интеграции

Интеграции нужны права на **сделки** и **контакты** (чтение/запись по API). В карточке интеграции включите соответствующие scope/доступы, как требует ваш интерфейс amo/Kommo.

### 3.2.1 Вкладка «Ключи и доступы» (после сохранения интеграции)

У внешней интеграции в amo часто показывают:

| Экран amo | Куда в `lead-config.php` |
|-----------|--------------------------|
| **ID интеграции** | `amocrm_client_id` |
| **Секретный ключ** (кнопка «Сгенерировать ключ») | `amocrm_client_secret` |
| **Долгосрочный токен** (кнопка «Сгенерировать токен») | `amocrm_refresh_token` — обычно его подставляют вместо ручного OAuth; **сохраните сразу**, показывают один раз. |

**Код авторизации (20 минут)** нужен, если вы **не** используете долгосрочный токен и идёте по сценарию шага **3.3–3.4** (обмен `code` на `refresh_token`).

### 3.3 Один раз получить `authorization code`

Соберите ссылку (подставьте свои значения):

```text
https://ВАШ_ПОДДОМЕН.amocrm.ru/oauth?client_id=ВАШ_CLIENT_ID&state=pm&mode=popup&redirect_uri=REDIRECT_ЗАКОДИРОВАННЫЙ
```

- **`ВАШ_ПОДДОМЕН`** — из URL аккаунта (например `company` из `https://company.amocrm.ru`).
- **`redirect_uri`** в ссылке должен быть **urlencode**-версией того же URL, что в интеграции, например `https%3A%2F%2Fprogress-market.ru%2F`.

Откройте ссылку в браузере, войдите в amo при запросе. После успеха браузер перейдёт на:

```text
https://progress-market.ru/?code=КОД&state=pm
```

Скопируйте значение параметра **`code`** (одноразовый).

### 3.4 Обмен `code` на `access_token` и `refresh_token`

Запрос (**пример** — выполните в Postman, Insomnia или через `curl`):

- **URL:** `https://ВАШ_ПОДДОМЕН.amocrm.ru/oauth2/access_token`
- **Метод:** POST  
- **Заголовок:** `Content-Type: application/json`
- **Тело (JSON):**

```json
{
  "client_id": "ВАШ_CLIENT_ID",
  "client_secret": "ВАШ_CLIENT_SECRET",
  "grant_type": "authorization_code",
  "code": "КОД_ИЗ_АДРЕСНОЙ_СТРОКИ",
  "redirect_uri": "https://progress-market.ru/"
}
```

`redirect_uri` здесь — **строка в точности как в интеграции и в браузере**, не URL-encoded в теле JSON.

В ответе возьмите **`refresh_token`** и сохраните в **`lead-config.php`** в поле `amocrm_refresh_token`.  
`access_token` из этого же ответа можно не копировать вручную — `lead.php` сам получит и положит в `.lead-amocrm-token.json`.

Если аккаунт на **Kommo**, базовый URL будет **`https://поддомен.kommo.com`** — его укажите в `amocrm_base_url`.

---

## Шаг 4. Заполнить `lead-config.php` на сервере

1. Скопируйте **`lead-config.sample.php`** → переименуйте в **`lead-config.php`** в **той же папке**, что и `lead.php`.
2. Заполните поля **без лишних пробелов** по краям строк.

| Ключ | Что вписать |
|------|-------------|
| `amocrm_base_url` | Полный URL аккаунта, например `https://company.amocrm.ru` **без** `/` в конце. Или оставьте шаблон и задайте только `amocrm_subdomain`. |
| `amocrm_subdomain` | Короткое имя поддомена, если не используете полный `amocrm_base_url`. |
| `amocrm_client_id` | Client ID интеграции. |
| `amocrm_client_secret` | Client Secret. |
| `amocrm_refresh_token` | Долговременный токен из шага 3.4. |
| `amocrm_redirect_uri` | Тот же Redirect URI, что в карточке интеграции (как правило `https://progress-market.ru/`). |
| `amocrm_pipeline_id` | Число — ID воронки **«Заявки сайта»** (см. шаг 5). |
| `amocrm_status_id` | Число — ID **этапа внутри этой воронки**, куда падать новой сделке. |
| `smartcaptcha_server_key` | Серверный ключ капчи из Yandex Cloud. |
| `allowed_origins` | Массив origin’ов, с которых разрешён запрос к `lead.php`. Должны совпасть с сайтом: `https://progress-market.ru`, при необходимости `https://www.progress-market.ru`. |

Если при отправке формы браузер пишет ошибку про **origin** — добавьте в `allowed_origins` точный `https://...` без пути, как показывает консоль.

---

## Шаг 5. Воронка «Заявки сайта» (`pipeline_id` и `status_id`)

Нужны **два разных положительных числа**:

- **`amocrm_pipeline_id`** — ID **самой воронки** «Заявки сайта».
- **`amocrm_status_id`** — ID **колонки** (статуса сделки) **внутри этой воронки**, куда попадает карточка с лендинга.

Нельзя взять `status_id` из другой воронки.

**Надёжный способ — API amo:**

`GET https://ВАШ_ПОДДОМЕН.amocrm.ru/api/v4/leads/pipelines`  
Заголовок: `Authorization: Bearer ACCESS_TOKEN`  
(`ACCESS_TOKEN` можно взять из файла `.lead-amocrm-token.json` после первой успешной отправки или из ответа обмена кодом.)

В JSON найдите воронку с нужным `name`, возьмите её **`id`** → pipeline_id.  
В `statuses` этой воронки найдите нужную колонку и возьмите её **`id`** → status_id.

Запишите их в `lead-config.php`, сохраните файл на Beget.

### 5.1 Как сделать это в Postman (или Insomnia / Thunder Client в VS Code)

**Часть A — получить `access_token` (если его ещё нет)**

1. Установите [Postman](https://www.postman.com/downloads/) (или аналог).
2. **New** → **HTTP Request**.
3. Метод **POST**, URL:
   ```text
   https://new1479078043.amocrm.ru/oauth2/access_token
   ```
   (подставьте свой домен amo, если другой.)
4. Вкладка **Headers**: добавьте строку  
   **Key:** `Content-Type` **Value:** `application/json`
5. Вкладка **Body** → выберите **raw** → справа тип **JSON**. Вставьте (подставьте свои значения из `lead-config.php`):

   ```json
   {
     "client_id": "ВАШ_ID_ИНТЕГРАЦИИ_UUID",
     "client_secret": "ВАШ_СЕКРЕТНЫЙ_КЛЮЧ",
     "grant_type": "refresh_token",
     "refresh_token": "ВАШ_ДОЛГОСРОЧНЫЙ_ТОКЕН",
     "redirect_uri": "https://progress-market.ru/"
   }
   ```

   `redirect_uri` — **точно как** в интеграции и в `lead-config.php`.

6. Нажмите **Send**. В ответе (тело JSON) найдите поле **`access_token`** — длинная строка. Скопируйте её (действует ограниченное время, для следующего запроса достаточно).

**Часть B — список воронок**

1. Новый запрос: метод **GET**, URL:
   ```text
   https://new1479078043.amocrm.ru/api/v4/leads/pipelines
   ```
2. Вкладка **Authorization**:
   - Type: **Bearer Token**
   - Token: вставьте **`access_token`** из части A  
   *(Postman сам добавит заголовок `Authorization: Bearer …`.)*

   Либо вкладка **Headers** вручную:  
   **Key:** `Authorization` **Value:** `Bearer ` + пробел + ваш токен (без угловых скобок в значении).

3. **Send**. В ответе разверните JSON: массив воронок обычно в **`_embedded.pipelines`**. У каждой воронки есть **`id`** и **`name`**. У нужной воронки откройте **`_embedded.statuses`** — у каждого этапа свой **`id`** и **`name`**.

4. Запишите два числа в `lead-config.php`: **`amocrm_pipeline_id`** и **`amocrm_status_id`**.

**Если POST на `/oauth2/access_token` вернул ошибку** — проверьте кавычки в JSON, совпадение `redirect_uri`, что `refresh_token` не обрезан при копировании.

**Альтернатива без Postman:** после успешной отправки формы на сайте на Beget в папке с `lead.php` появляется файл **`.lead-amocrm-token.json`** — в нём поле **`access_token`** (не публикуйте файл целиком). Его можно временно скопировать и использовать в GET из части B, пока не истёк срок.

### 5.2 Без Postman: скрипт в проекте **`amo-list-pipelines-once.php`**

Я не могу сам вызвать ваш amoCRM (нет доступа к аккаунту и секретам). В репозитории есть одноразовый скрипт:

1. Откройте **`amo-list-pipelines-once.php`** в редакторе, задайте **`const PM_ONE_TIME_SECRET = 'любая-длинная-случайная-строка';`** (не оставляйте `__CHANGE_ME__`).
2. Загрузите файл в **`public_html`** рядом с **`lead.php`** и **`lead-config.php`**.
3. В браузере откройте:  
   `https://progress-market.ru/amo-list-pipelines-once.php?k=та-же-строка-секрета`  
4. На странице появятся таблицы: для каждой воронки — **`amocrm_pipeline_id`** и список этапов с **`amocrm_status_id`**. Выберите воронку «Заявки с сайта» / «БАЗА РМ» и нужную колонку, скопируйте два числа в `lead-config.php`.
5. **Обязательно удалите** `amo-list-pipelines-once.php` с сервера после использования.

**Ошибка OAuth 401 / «Cannot decrypt the refresh token»:** чаще всего в **`lead-config.php`** не тот **долгосрочный токен** (обрезан, старый) или после смены **секретного ключа** в amo не обновили пару secret + refresh. Удалите на сервере **`.lead-amocrm-token.json`** и снова вставьте из amo свежий долгосрочный токен в `amocrm_refresh_token`. Актуальный **`amo-list-pipelines-once.php`** в проекте всегда берёт refresh **только из `lead-config.php`**, не из кэша.

---

## Шаг 6. Проверка с сайта

1. В **`index.html`** на продакшене обязательно задан **`PM_SMARTCAPTCHA_SITE_KEY`** (не пустая строка).
2. Обновите страницу с кэшем (Ctrl+F5).
3. Заполните форму, отметьте капчу «Я не робот», отправьте.
4. В браузере: **F12 → Сеть** → запрос **`lead.php`** — должен быть **200**, в теле JSON `"ok": true`.
5. В amoCRM: появились **контакт** и **сделка** в воронке «Заявки сайта» на выбранном этапе.

Если видите JSON с **`message`** об ошибке — ориентируйтесь на текст (капча, amo, pipeline, origin).

---

## Официальная документация amoCRM (по вашему стеку)

Сводный **[API Reference](https://www.amocrm.ru/developers/content/crm_platform/api-reference)** — оглавление методов. Для **`lead.php`** и настройки интеграции чаще всего нужны:

| Задача | Раздел документации |
|--------|----------------------|
| Выдать токены (`code` → `refresh_token`, `refresh_token` → `access_token`) | **[OAuth 2.0](https://www.amocrm.ru/developers/content/oauth/oauth)** |
| Пошагово пройти авторизацию интеграции | В блоке **[OAuth](https://www.amocrm.ru/developers/content/oauth/oauth)** откройте в левом меню страницу **«Пример по шагам»** и **«Разрешения и права»** (нужные scope для контактов и сделок) |
| Узнать `pipeline_id` и `status_id` | **[Воронки и этапы сделок](https://www.amocrm.ru/developers/content/crm_platform/leads_pipelines)** (`GET /api/v4/leads/pipelines`) |
| Поля и формат создания сделки | **[Сделки](https://www.amocrm.ru/developers/content/crm_platform/leads-api)** (`POST /api/v4/leads`) |
| Создание контакта | **[Контакты](https://www.amocrm.ru/developers/content/crm_platform/contacts-api)** (`POST /api/v4/contacts`) |
| Примечание к сделке | **[События и примечания](https://www.amocrm.ru/developers/content/crm_platform/events-and-notes)** (`POST .../api/v4/leads/notes`) |

Код ответов и лимиты запросов: **[Коды ошибок](https://www.amocrm.ru/developers/content/crm_platform/api-errors)** и ограничения в начале **[API Reference](https://www.amocrm.ru/developers/content/crm_platform/api-reference)**.

Наш **`lead.php`** уже соответствует общим правилам v4 API (Bearer-токен, JSON-тело, эндпоинты из таблицы выше): ваша работа по документации — правильно **создать интеграцию**, **выписать OAuth-токены** и **подставить id воронки/этапа** из `GET .../pipelines`.

---

## Что не светить публично

Не отправляйте в чаты открытым текстом: **`client_secret`**, **`refresh_token`**, **серверный ключ SmartCaptcha**, содержимое **`lead-config.php`**.

---

## После запуска: Albato

Если раньше лиды шли через Albato — отключите сценарий, когда `lead.php` стабильно создаёт сделки, иначе возможны **дубли**.
