<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$config = growth_config();
$landingId = trim((string) ($_GET['id'] ?? $_GET['landing_id'] ?? ''));
if ($landingId === '') {
    $landingId = (string) ($config['default_landing_id'] ?? 'wb-fbs-v1');
}

try {
    $payload = DashboardData::landingDetail($landingId);
    $payload['generated_at'] = gmdate('c');
    $code = !empty($payload['ok']) ? 200 : 404;
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
} catch (Throwable) {
    http_response_code(200);
    echo json_encode(['ok' => false, 'error' => 'read_failed'], JSON_UNESCAPED_UNICODE);
}
