<?php
declare(strict_types=1);

/**
 * Persist SuperSite / LifeOS system reports to /reports (project root).
 */

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw ?: '[]', true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_json']);
    exit;
}

$root = dirname(__DIR__, 2);
$reportsDir = $root . '/reports';
$historyDir = $reportsDir . '/history';

if (!is_dir($reportsDir) && !mkdir($reportsDir, 0755, true) && !is_dir($reportsDir)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'reports_dir_unavailable']);
    exit;
}

if (!is_dir($historyDir) && !mkdir($historyDir, 0755, true) && !is_dir($historyDir)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'history_dir_unavailable']);
    exit;
}

$json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'encode_failed']);
    exit;
}

$mainPath = $reportsDir . '/system-report.json';
$timestamp = gmdate('Ymd\THis\Z');
$historyPath = $historyDir . '/system-report-' . $timestamp . '.json';

$mainWritten = file_put_contents($mainPath, $json . PHP_EOL, LOCK_EX);
$historyWritten = file_put_contents($historyPath, $json . PHP_EOL, LOCK_EX);
$latestWritten = file_put_contents($historyDir . '/latest.json', $json . PHP_EOL, LOCK_EX);

if ($mainWritten === false || $historyWritten === false || $latestWritten === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'write_failed']);
    exit;
}

http_response_code(200);
echo json_encode([
    'ok' => true,
    'path' => 'reports/system-report.json',
    'history' => 'reports/history/system-report-' . $timestamp . '.json',
]);
