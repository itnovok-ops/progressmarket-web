<?php
declare(strict_types=1);

/**
 * Инструкция: скопировать в lead-config.php на сервер (рядом с lead.php).
 * lead-config.php и .lead-amocrm-token.json не должны попадать в публичный Git.
 */

return [
    /**
     * Полный адрес аккаунта amoCRM из браузера, без завершающего слэша.
     * Примеры:
     *   https://вашПоддомен.amocrm.ru
     *   https://вашПоддомен.kommo.com (если у вас Kommo).
     *
     * Если оставите пустым — соберётся из amocrm_subdomain + .amocrm.ru .
     */
    'amocrm_base_url' => 'https://YOURSUBDOMAIN.amocrm.ru',

    /** Если не задаёте amocrm_base_url — только короткое имя без домена */
    'amocrm_subdomain' => 'YOURSUBDOMAIN',

    'amocrm_client_id' => 'CLIENT_IDИнтеграции',
    'amocrm_client_secret' => 'CLIENT_SECRETИнтеграции',

    /** Long-lived refresh token после авторизации OAuth (раздел Интеграции) */
    'amocrm_refresh_token' => 'REFRESH_TOKEN',

    /** Тот же URL, что в карточке интеграции поле Redirect / Callback URI */
    'amocrm_redirect_uri' => 'https://market.teravox.ru/',

    /**
     * ID воронки и этапа в amoCRM (целые числа > 0).
     * Для воронки «Заявки сайта»: amocrm_pipeline_id = id этой воронки;
     * amocrm_status_id = id колонки внутри неё (куда падёт карточка), не из другой воронки.
     * См. AMOCRM-BEGET-SETUP.md — раздел «Заявки сайта».
     */
    'amocrm_pipeline_id' => 0,
    'amocrm_status_id' => 0,

    /**
     * Воронка «Входные обращения» для виджета чата (helpdesk.php).
     * amocrm_helpdesk_pipeline_id = id воронки;
     * amocrm_helpdesk_status_id = id первой колонки (куда падает обращение).
     */
    'amocrm_helpdesk_pipeline_id' => 0,
    'amocrm_helpdesk_status_id' => 0,

    /**
     * Яндекс SmartCaptcha — оба ключа с одной карточки капчи в Yandex Cloud.
     * Клиентский → smartcaptcha_client_key (на сайт, через captcha-site-key.php).
     * Серверный → smartcaptcha_server_key (проверка в lead.php).
     */
    'smartcaptcha_client_key' => 'ВАШ_КЛЮЧ_КЛИЕНТА_SMARTCAPTCHA',
    'smartcaptcha_server_key' => 'ВАШ_КЛЮЧ_СЕРВЕРА_SMARTCAPTCHA',

    /**
     * Обычно не меняйте. Если Яндекс сменит хост — укажите полный URL до /validate
     */
    'smartcaptcha_validate_url' => 'https://smartcaptcha.cloud.yandex.net/validate',

    'allowed_origins' => [
        'https://market.teravox.ru',
        'https://www.market.teravox.ru',
        'http://market.teravox.ru',
        'http://www.market.teravox.ru',
    ],
];
