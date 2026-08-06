<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$configPath = __DIR__ . '/lead-config.php';
if (!is_readable($configPath)) {
    http_response_code(500);
    echo json_encode(
        ['ok' => false, 'error' => 'config_missing', 'message' => 'На сервере не найден lead-config.php'],
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

$config = require $configPath;

/**
 * Российский номер: +7 и ровно 10 цифр после (8… → 7…, 9XXXXXXXXX → 7…).
 */
function normalize_ru_phone_e164(string $raw): ?string
{
    $d = preg_replace('/\D+/u', '', $raw);
    if ($d === '') {
        return null;
    }
    if (strlen($d) === 11 && $d[0] === '8') {
        $d = '7' . substr($d, 1);
    }
    if (strlen($d) === 10 && isset($d[0]) && $d[0] === '9') {
        $d = '7' . $d;
    }
    if (strlen($d) !== 11 || $d[0] !== '7') {
        return null;
    }
    if (!preg_match('/^7\d{10}$/', $d)) {
        return null;
    }

    return '+' . $d;
}

function json_out(int $code, array $data): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * IP для проверки токена в Yandex SmartCaptcha должен совпадать с IP посетителя.
 * На shared-хостинге за nginx REMOTE_ADDR часто указывает на прокси — тогда validate падает.
 */
function client_ip_for_smartcaptcha(): string
{
    $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if (is_string($xff) && $xff !== '') {
        $parts = array_map('trim', explode(',', $xff));
        foreach ($parts as $p) {
            if ($p !== '' && filter_var($p, FILTER_VALIDATE_IP) !== false) {
                return $p;
            }
        }
    }
    $xri = $_SERVER['HTTP_X_REAL_IP'] ?? '';
    if (is_string($xri) && $xri !== '' && filter_var($xri, FILTER_VALIDATE_IP) !== false) {
        return $xri;
    }
    $cf = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '';
    if (is_string($cf) && $cf !== '' && filter_var($cf, FILTER_VALIDATE_IP) !== false) {
        return $cf;
    }
    $ra = $_SERVER['REMOTE_ADDR'] ?? '';

    return is_string($ra) ? $ra : '';
}

function smartcaptcha_response_is_ok(string $raw): bool
{
    $t = trim($raw);
    if ($t === '') {
        return false;
    }
    if (strcasecmp($t, 'ok') === 0) {
        return true;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return false;
    }
    $status = $data['status'] ?? null;
    if (is_string($status) && strcasecmp($status, 'ok') === 0) {
        return true;
    }
    if (isset($data['success']) && $data['success'] === true) {
        return true;
    }
    $nested = $data['data'] ?? null;
    if (is_array($nested) && isset($nested['status']) && strcasecmp((string)$nested['status'], 'ok') === 0) {
        return true;
    }

    return false;
}

function smartcaptcha_post_validate(string $url, string $secret, string $token, ?string $ip): string
{
    $body = [
        'secret' => $secret,
        'token' => $token,
    ];
    if ($ip !== null && $ip !== '') {
        $body['ip'] = $ip;
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded;charset=UTF-8'],
        CURLOPT_POSTFIELDS => http_build_query($body),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 8,
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);

    return is_string($resp) ? $resp : '';
}

$allowed = $config['allowed_origins'] ?? [];
if ($allowed !== []) {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? (string)$_SERVER['HTTP_ORIGIN'] : '';
    $referer = isset($_SERVER['HTTP_REFERER']) ? (string)$_SERVER['HTTP_REFERER'] : '';
    $ok = false;
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        $ok = true;
    }
    if (!$ok && $referer !== '') {
        foreach ($allowed as $baseUrl) {
            $p = rtrim((string)$baseUrl, '/');
            if ($referer === $p || strpos($referer, $p . '/') === 0) {
                $ok = true;
                break;
            }
        }
    }
    if (!$ok) {
        json_out(403, ['ok' => false, 'error' => 'forbidden_origin']);
    }
    if ($origin !== '') {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
    }
}

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '[]', true);
if (!is_array($body)) {
    json_out(400, ['ok' => false, 'error' => 'invalid_json']);
}

$name = isset($body['name']) ? trim((string)$body['name']) : '';
$phone = isset($body['phone']) ? trim((string)$body['phone']) : '';
$email = isset($body['email']) ? trim((string)$body['email']) : '';
$requestType = isset($body['requestType']) ? trim((string)$body['requestType']) : '';
$comment = isset($body['comment']) ? trim((string)$body['comment']) : '';
$marketing = !empty($body['marketingConsent']);
$consent = !empty($body['consent']);
$hp = isset($body['hp_trap']) ? trim((string)$body['hp_trap']) : '';
$token = isset($body['smartcaptcha_token']) ? trim((string)$body['smartcaptcha_token']) : '';
if ($token === '' && isset($body['gRecaptchaToken'])) {
    $token = trim((string)$body['gRecaptchaToken']);
}

if ($hp !== '') {
    json_out(200, ['ok' => true]);
}

if ($name === '' || $phone === '' || $requestType === '') {
    json_out(400, ['ok' => false, 'error' => 'validation', 'message' => 'Заполните имя, телефон и формат обращения.']);
}

$phoneNorm = normalize_ru_phone_e164($phone);
if ($phoneNorm === null) {
    json_out(400, ['ok' => false, 'error' => 'validation', 'message' => 'Укажите корректный российский номер: +7 и 10 цифр (например +7 912 345-67-89).']);
}
$phone = $phoneNorm;

if (!$consent) {
    json_out(400, ['ok' => false, 'error' => 'validation', 'message' => 'Нужно согласие с условиями.']);
}

$allowedTypes = ['Регистрация', 'Демо', 'Звонок'];
if (!in_array($requestType, $allowedTypes, true)) {
    json_out(400, ['ok' => false, 'error' => 'validation', 'message' => 'Недопустимый формат обращения.']);
}

if ($token === '') {
    json_out(400, ['ok' => false, 'error' => 'captcha', 'message' => 'Не пройдена проверка SmartCaptcha.']);
}

$serverKey = (string)($config['smartcaptcha_server_key'] ?? '');
if ($serverKey === '' && isset($config['recaptcha_secret_key'])) {
    $serverKey = (string)$config['recaptcha_secret_key'];
}
if ($serverKey === '') {
    json_out(500, ['ok' => false, 'error' => 'captcha_config', 'message' => 'Не задан smartcaptcha_server_key в lead-config.php']);
}

$validateUrl = (string)($config['smartcaptcha_validate_url'] ?? 'https://smartcaptcha.cloud.yandex.net/validate');
$fallbackValidateUrl = 'https://smartcaptcha.yandexcloud.net/validate';
$clientIp = client_ip_for_smartcaptcha();

$scRaw = smartcaptcha_post_validate($validateUrl, $serverKey, $token, $clientIp);
$scOk = smartcaptcha_response_is_ok($scRaw);
if (!$scOk && $clientIp !== '') {
    $scRaw = smartcaptcha_post_validate($validateUrl, $serverKey, $token, null);
    $scOk = smartcaptcha_response_is_ok($scRaw);
}
if (!$scOk && trim($scRaw) === '' && strcasecmp($validateUrl, $fallbackValidateUrl) !== 0) {
    $scRaw = smartcaptcha_post_validate($fallbackValidateUrl, $serverKey, $token, $clientIp);
    $scOk = smartcaptcha_response_is_ok($scRaw);
    if (!$scOk && $clientIp !== '') {
        $scRaw = smartcaptcha_post_validate($fallbackValidateUrl, $serverKey, $token, null);
        $scOk = smartcaptcha_response_is_ok($scRaw);
    }
}

if (!$scOk) {
    json_out(400, ['ok' => false, 'error' => 'captcha_failed', 'message' => 'Проверка Яндекс SmartCaptcha не пройдена. Обновите страницу и попробуйте снова.']);
}

$baseUrl = trim((string)($config['amocrm_base_url'] ?? ''));
if ($baseUrl === '' || $baseUrl === 'https://YOURSUBDOMAIN.amocrm.ru') {
    $sub = trim((string)($config['amocrm_subdomain'] ?? ''));
    $sub = preg_replace('#^https?://#', '', $sub);
    $sub = explode('/', str_replace('\\', '/', $sub))[0];
    $sub = preg_replace('#\.amocrm\..+$#', '', $sub);
    $sub = rtrim((string)$sub, '.');
    if ($sub === '' || $sub === 'ВАШ_СУБДОМЕН') {
        json_out(500, ['ok' => false, 'error' => 'amocrm_config', 'message' => 'Укажите amocrm_base_url или amocrm_subdomain в lead-config.php']);
    }
    $baseUrl = 'https://' . $sub . '.amocrm.ru';
}
$baseUrl = rtrim($baseUrl, '/');

$pipelineId = (int)($config['amocrm_pipeline_id'] ?? 0);
$statusId = (int)($config['amocrm_status_id'] ?? 0);
if ($pipelineId <= 0 || $statusId <= 0) {
    json_out(500, [
        'ok' => false,
        'error' => 'amocrm_config',
        'message' => 'В lead-config.php укажите amocrm_pipeline_id (ID воронки «регистрация сайта») и amocrm_status_id (ID этапа внутри неё). Числа: откройте amo-list-pipelines-once.php на сервере или см. AMOCRM-BEGET-SETUP.md.',
    ]);
}

$cacheFile = __DIR__ . '/.lead-amocrm-token.json';

/** Долгосрочный токен из amo (JWT) — это уже access_token, не refresh для /oauth2/access_token. */
function amo_is_long_lived_jwt(string $token): bool
{
    $t = trim($token);
    if ($t === '' || strpos($t, 'eyJ') !== 0) {
        return false;
    }

    return substr_count($t, '.') === 2;
}

function amo_jwt_expires_at(string $jwt): ?int
{
    $parts = explode('.', $jwt, 3);
    if (count($parts) < 2) {
        return null;
    }
    $b64 = strtr($parts[1], '-_', '+/');
    $pad = strlen($b64) % 4;
    if ($pad > 0) {
        $b64 .= str_repeat('=', 4 - $pad);
    }
    $payload = json_decode((string)base64_decode($b64, true), true);
    if (!is_array($payload) || !isset($payload['exp'])) {
        return null;
    }

    return (int)$payload['exp'];
}

function amo_long_lived_jwt_access(string $token): string
{
    if (!amo_is_long_lived_jwt($token)) {
        throw new RuntimeException('amo_not_jwt');
    }
    $exp = amo_jwt_expires_at($token);
    if ($exp !== null && $exp < time()) {
        throw new RuntimeException('amo_jwt_expired');
    }

    return trim($token);
}

function amo_refresh_token(string $baseUrl, array $config, string $cacheFile): string
{
    // Всегда refresh из lead-config.php — не из .lead-amocrm-token.json (иначе 401 после смены токена в amo).
    $payload = json_encode([
        'client_id' => $config['amocrm_client_id'] ?? '',
        'client_secret' => $config['amocrm_client_secret'] ?? '',
        'grant_type' => 'refresh_token',
        'refresh_token' => $config['amocrm_refresh_token'] ?? '',
        'redirect_uri' => $config['amocrm_redirect_uri'] ?? '',
    ], JSON_THROW_ON_ERROR);

    $url = $baseUrl . '/oauth2/access_token';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    $out = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode((string)$out, true);
    if ($code !== 200 || !is_array($data) || empty($data['access_token'])) {
        throw new RuntimeException('amo_oauth_failed');
    }
    $access = (string)$data['access_token'];
    $expiresAt = time() + (int)($data['expires_in'] ?? 86400) - 120;
    $newRefresh = (string)($data['refresh_token'] ?? ($config['amocrm_refresh_token'] ?? ''));

    file_put_contents(
        $cacheFile,
        json_encode(
            ['access_token' => $access, 'refresh_token' => $newRefresh, 'expires_at' => $expiresAt],
            JSON_UNESCAPED_UNICODE
        ),
        LOCK_EX
    );

    return $access;
}

function amo_get_access_token(string $baseUrl, array $config, string $cacheFile): string
{
    $configuredRefresh = trim((string)($config['amocrm_refresh_token'] ?? ''));
    if (amo_is_long_lived_jwt($configuredRefresh)) {
        return amo_long_lived_jwt_access($configuredRefresh);
    }

    if (!is_readable($cacheFile)) {
        return amo_refresh_token($baseUrl, $config, $cacheFile);
    }
    $cached = json_decode((string)file_get_contents($cacheFile), true);
    if (!is_array($cached) || empty($cached['access_token'])) {
        return amo_refresh_token($baseUrl, $config, $cacheFile);
    }
    if (!empty($cached['expires_at']) && (int)$cached['expires_at'] < time()) {
        return amo_refresh_token($baseUrl, $config, $cacheFile);
    }

    return (string)$cached['access_token'];
}

function amo_api(string $method, string $url, array $payload, string $token): array
{
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
    ];
    if ($method !== 'GET') {
        $opts[CURLOPT_CUSTOMREQUEST] = $method;
        $opts[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_UNESCAPED_UNICODE);
    }
    curl_setopt_array($ch, $opts);
    $out = curl_exec($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $decoded = json_decode((string)$out, true);

    return ['http' => $http, 'body' => is_array($decoded) ? $decoded : null, 'raw' => (string)$out];
}

try {
    $access = amo_get_access_token($baseUrl, $config, $cacheFile);
} catch (Throwable $e) {
    json_out(502, [
        'ok' => false,
        'error' => 'amo_auth',
        'message' => 'Не удалось авторизоваться в amoCRM. Проверьте client_id, client_secret и долгосрочный токен в lead-config.php; удалите .lead-amocrm-token.json после смены токена в amo.',
    ]);
}

$contactPayload = [[
    'name' => $name,
    'custom_fields_values' => array_values(array_filter([
        [
            'field_code' => 'PHONE',
            'values' => [['value' => $phone]],
        ],
        $email !== '' ? [
            'field_code' => 'EMAIL',
            'values' => [['value' => $email]],
        ] : null,
    ])),
]];

$r1 = amo_api('POST', $baseUrl . '/api/v4/contacts', $contactPayload, $access);
if ($r1['http'] === 401) {
    $access = amo_refresh_token($baseUrl, $config, $cacheFile);
    $r1 = amo_api('POST', $baseUrl . '/api/v4/contacts', $contactPayload, $access);
}

$body1 = $r1['body'];
if ($r1['http'] !== 200 || !is_array($body1) || empty($body1['_embedded']['contacts'][0]['id'])) {
    json_out(502, ['ok' => false, 'error' => 'amo_contact', 'message' => 'Не удалось создать контакт в amoCRM.']);
}
$contactId = (int)$body1['_embedded']['contacts'][0]['id'];

$leadName = 'Сайт: ' . $requestType . ' — ' . $name;
$leadPayload = [[
    'name' => $leadName,
    'pipeline_id' => $pipelineId,
    'status_id' => $statusId,
    '_embedded' => [
        'contacts' => [['id' => $contactId]],
    ],
]];

$r2 = amo_api('POST', $baseUrl . '/api/v4/leads', $leadPayload, $access);
if ($r2['http'] === 401) {
    $access = amo_refresh_token($baseUrl, $config, $cacheFile);
    $r2 = amo_api('POST', $baseUrl . '/api/v4/leads', $leadPayload, $access);
}

$body2 = $r2['body'];
if ($r2['http'] !== 200 || !is_array($body2) || empty($body2['_embedded']['leads'][0]['id'])) {
    json_out(502, ['ok' => false, 'error' => 'amo_lead', 'message' => 'Не удалось создать сделку в amoCRM.']);
}
$leadId = (int)$body2['_embedded']['leads'][0]['id'];

$noteLines = [
    'Источник: progress-market.ru (форма лендинга)',
    'Формат: ' . $requestType,
    $comment !== '' ? 'Комментарий: ' . $comment : null,
    'Рассылки: ' . ($marketing ? 'да' : 'нет'),
];
$noteText = implode("\n", array_filter($noteLines, static fn($v) => $v !== null && $v !== ''));
$r3 = amo_api(
    'POST',
    $baseUrl . '/api/v4/leads/notes',
    [[
        'entity_id' => $leadId,
        'note_type' => 'common',
        'params' => ['text' => $noteText],
    ]],
    $access
);

json_out(
    200,
    [
        'ok' => true,
        'lead_id' => $leadId,
        'contact_id' => $contactId,
        'note_ok' => $r3['http'] === 200,
    ]
);
