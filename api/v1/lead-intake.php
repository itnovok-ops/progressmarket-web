<?php

declare(strict_types=1);

/**
 * V1.1 canonical lead-intake endpoint.
 *
 * Deliberately self-contained: it does NOT require the top-level lifeos/ directory
 * (the existing /api/v1/leads.php does, via lifeos/bootstrap.php). That directory is
 * out of scope for this agent and its runtime secrets are inaccessible here — see
 * docs/LEAD_REFERRAL_V1.md and reports/market-v1.1-implementation.md §7 for why this
 * is a separate, parallel endpoint rather than a modification of the existing one.
 */

require_once dirname(__DIR__, 2) . '/lib/leads/Config.php';
require_once dirname(__DIR__, 2) . '/lib/leads/Lead.php';
require_once dirname(__DIR__, 2) . '/lib/leads/LeadRepository.php';
require_once dirname(__DIR__, 2) . '/lib/leads/SqliteLeadRepository.php';
require_once dirname(__DIR__, 2) . '/lib/leads/JsonlLeadRepository.php';
require_once dirname(__DIR__, 2) . '/lib/leads/LeadRepositoryFactory.php';
require_once dirname(__DIR__, 2) . '/lib/leads/RateLimiter.php';

use MarketV11\Config;
use MarketV11\Lead;
use MarketV11\LeadRepositoryFactory;
use MarketV11\RateLimiter;

function respond(int $status, array $body): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function clientIp(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function hashIp(string $ip, string $salt): string
{
    return substr(hash('sha256', $salt . '|' . $ip), 0, 24);
}

// --- CORS -------------------------------------------------------------
$allowedOrigin = (string) Config::get('allowed_origin', 'https://market.teravox.ru');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === $allowedOrigin) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'message' => 'Метод не поддерживается.']);
}

// --- Request size limit -------------------------------------------------
$maxBytes = (int) Config::get('max_request_bytes', 20000);
$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 0 && $contentLength > $maxBytes) {
    respond(413, ['ok' => false, 'message' => 'Слишком большой запрос.']);
}

$raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
if ($raw === false || strlen($raw) > $maxBytes) {
    respond(413, ['ok' => false, 'message' => 'Слишком большой запрос.']);
}

$input = json_decode($raw, true);
if (!is_array($input)) {
    respond(400, ['ok' => false, 'message' => 'Некорректный формат заявки.']);
}

// --- Rate limiting --------------------------------------------------------
$ip = clientIp();
$ipHash = hashIp($ip, (string) Config::get('ip_hash_salt', 'default-salt'));

$limiter = new RateLimiter();
$rateOk = $limiter->allow(
    $ipHash,
    (int) Config::get('rate_limit_max_requests', 8),
    (int) Config::get('rate_limit_window_seconds', 60)
);
if (!$rateOk) {
    respond(429, ['ok' => false, 'message' => 'Слишком много попыток. Попробуйте позже.']);
}

// --- Honeypot: pretend success, never persist ------------------------------
$hpTrap = trim((string) ($input['hp_trap'] ?? ''));
if ($hpTrap !== '') {
    respond(200, ['ok' => true]);
}

// --- Minimum submit time: pretend success, never persist -----------------------
$minSubmitSeconds = (int) Config::get('min_submit_seconds', 2);
$clientRenderTs = (int) ($input['client_render_ts'] ?? 0);
if ($clientRenderTs > 0) {
    $elapsedMs = (int) (microtime(true) * 1000) - $clientRenderTs;
    if ($elapsedMs >= 0 && $elapsedMs < $minSubmitSeconds * 1000) {
        respond(200, ['ok' => true]);
    }
}

// --- Validate + persist ------------------------------------------------
$userAgentShort = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 140);
$result = Lead::fromInput($input, $ipHash, $userAgentShort);

if ($result['errors'] !== []) {
    $messages = [
        'name_required' => 'Укажите имя.',
        'contact_required' => 'Укажите телефон или электронную почту.',
        'phone_invalid' => 'Проверьте номер телефона.',
        'email_invalid' => 'Проверьте адрес электронной почты.',
    ];
    $first = $result['errors'][0];
    respond(400, ['ok' => false, 'message' => $messages[$first] ?? 'Проверьте данные формы.']);
}

try {
    $repository = LeadRepositoryFactory::make();
    $repository->insert($result['lead']);
} catch (\Throwable $e) {
    error_log('[market-v1.1] lead insert failed: ' . $e->getMessage());
    respond(500, ['ok' => false, 'message' => 'Не удалось сохранить заявку. Попробуйте ещё раз.']);
}

respond(201, ['ok' => true]);
