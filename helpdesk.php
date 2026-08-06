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

require_once __DIR__ . '/amo-lib.php';

$configPath = __DIR__ . '/lead-config.php';
if (!is_readable($configPath)) {
    pm_json_out(500, ['ok' => false, 'error' => 'config_missing', 'message' => 'На сервере не найден lead-config.php']);
}

/** @var array<string, mixed> $config */
$config = require $configPath;

pm_apply_cors($config);

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '[]', true);
if (!is_array($body)) {
    pm_json_out(400, ['ok' => false, 'error' => 'invalid_json']);
}

$name = isset($body['name']) ? trim((string)$body['name']) : '';
$message = isset($body['message']) ? trim((string)$body['message']) : '';
$phone = isset($body['phone']) ? trim((string)$body['phone']) : '';
$email = isset($body['email']) ? trim((string)$body['email']) : '';
$pageUrl = isset($body['pageUrl']) ? trim((string)$body['pageUrl']) : '';
$hp = isset($body['hp_trap']) ? trim((string)$body['hp_trap']) : '';
$token = isset($body['smartcaptcha_token']) ? trim((string)$body['smartcaptcha_token']) : '';

if ($hp !== '') {
    pm_json_out(200, ['ok' => true]);
}

if ($name === '' || $message === '') {
    pm_json_out(400, ['ok' => false, 'error' => 'validation', 'message' => 'Укажите имя и текст сообщения.']);
}

if (mb_strlen($message) > 4000) {
    pm_json_out(400, ['ok' => false, 'error' => 'validation', 'message' => 'Сообщение слишком длинное (до 4000 символов).']);
}

$phoneE164 = null;
if ($phone !== '') {
    $phoneE164 = pm_normalize_ru_phone_e164($phone);
    if ($phoneE164 === null) {
        pm_json_out(400, ['ok' => false, 'error' => 'validation', 'message' => 'Укажите корректный мобильный номер (+7 и 10 цифр) или оставьте только email.']);
    }
    $digits = preg_replace('/\D+/', '', $phoneE164);
    $mobile = strlen($digits) === 11 ? substr($digits, 2) : '';
    if ($mobile === '' || $digits[1] !== '9' || preg_match('/^(\d)\1+$/', $mobile)) {
        pm_json_out(400, ['ok' => false, 'error' => 'validation', 'message' => 'Укажите корректный мобильный номер (+7 и 10 цифр) или оставьте только email.']);
    }
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    pm_json_out(400, ['ok' => false, 'error' => 'validation', 'message' => 'Некорректный email.']);
}

if ($phoneE164 === null && $email === '') {
    pm_json_out(400, ['ok' => false, 'error' => 'validation', 'message' => 'Укажите телефон или email для связи.']);
}

pm_validate_smartcaptcha($config, $token);

$baseUrl = pm_resolve_amocrm_base_url($config);

$pipelineId = (int)($config['amocrm_helpdesk_pipeline_id'] ?? 0);
$statusId = (int)($config['amocrm_helpdesk_status_id'] ?? 0);
if ($pipelineId <= 0 || $statusId <= 0) {
    pm_json_out(500, [
        'ok' => false,
        'error' => 'amocrm_config',
        'message' => 'В lead-config.php укажите amocrm_helpdesk_pipeline_id и amocrm_helpdesk_status_id для воронки «Входные обращения». ID — через amo-list-pipelines-once.php на сервере.',
    ]);
}

$cacheFile = __DIR__ . '/.lead-amocrm-token.json';

$leadTitle = 'Чат: ' . $name;
$noteLines = [
    'Источник: progress-market.ru (виджет поддержки)',
    'Сообщение клиента:',
    $message,
    $phoneE164 !== null ? 'Телефон: ' . $phoneE164 : null,
    $email !== '' ? 'Email: ' . $email : null,
    $pageUrl !== '' ? 'Страница: ' . $pageUrl : null,
    'Время (UTC): ' . gmdate('Y-m-d H:i:s'),
];
$noteText = implode("\n", array_filter($noteLines, static fn($v) => $v !== null && $v !== ''));

$result = pm_amo_create_lead(
    $baseUrl,
    $config,
    $cacheFile,
    $pipelineId,
    $statusId,
    $name,
    $phoneE164,
    $email,
    $leadTitle,
    $noteText
);

pm_json_out(200, [
    'ok' => true,
    'lead_id' => $result['lead_id'],
    'contact_id' => $result['contact_id'],
    'note_ok' => $result['note_ok'],
    'pipeline_id' => $pipelineId,
    'status_id' => $statusId,
]);
