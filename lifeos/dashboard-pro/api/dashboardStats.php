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

try {
    $payload = DashboardData::globalOverview();
    $payload['generated_at'] = gmdate('c');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
} catch (Throwable) {
    http_response_code(200);
    echo json_encode(['ok' => true, 'total_sessions' => 0, 'landing_cards' => []], JSON_UNESCAPED_UNICODE);
}
