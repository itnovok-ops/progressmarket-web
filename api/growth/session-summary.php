<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once dirname(__DIR__, 2) . '/lifeos/growth/bootstrap.php';

use LifeOS\Growth\GrowthHttp;

$config = growth_config();
GrowthHttp::applyCors($config);
GrowthHttp::handleOptions();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    GrowthHttp::json(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

$raw = file_get_contents('php://input') ?: '';
if (strlen($raw) > (int) ($config['max_payload_bytes'] ?? 65536)) {
    GrowthHttp::json(413, ['ok' => false, 'error' => 'payload_too_large']);
}

$body = json_decode($raw, true);
if (!is_array($body)) {
    GrowthHttp::json(400, ['ok' => false, 'error' => 'invalid_json']);
}

$session = is_array($body['session'] ?? null) ? $body['session'] : [];
$sessionId = trim((string) ($session['id'] ?? $body['session_id'] ?? ''));
$landingId = trim((string) ($body['landing_id'] ?? $session['landing_id'] ?? $config['default_landing_id'] ?? 'wb-fbs-v1'));

if ($sessionId === '') {
    GrowthHttp::json(400, ['ok' => false, 'error' => 'session_id_required']);
}

$timestamp = $body['timestamp'] ?? time();
if (is_numeric($timestamp)) {
    $timestamp = (int) $timestamp;
    if ($timestamp > 9999999999) {
        $timestamp = (int) floor($timestamp / 1000);
    }
} else {
    $timestamp = time();
}

$record = [
    'landing_id' => $landingId,
    'session_id' => $sessionId,
    'summary' => [
        'scroll_depth_pct' => (int) ($body['scroll_depth_pct'] ?? 0),
        'cta_click_rate' => (float) ($body['cta_click_rate'] ?? 0),
        'form_conversion_rate' => (float) ($body['form_conversion_rate'] ?? 0),
        'drop_off_stage' => $body['drop_off_stage'] ?? null,
        'counters' => is_array($body['counters'] ?? null) ? $body['counters'] : [],
    ],
    'timestamp' => $timestamp,
    'received_at' => time(),
];

$path = growth_storage_path('session_summaries.jsonl');
$line = json_encode($record, JSON_UNESCAPED_UNICODE);
if ($line === false || file_put_contents($path, $line . PHP_EOL, FILE_APPEND | LOCK_EX) === false) {
    GrowthHttp::json(500, ['ok' => false, 'error' => 'storage_failed']);
}

GrowthHttp::json(202, ['ok' => true, 'stored' => true]);
