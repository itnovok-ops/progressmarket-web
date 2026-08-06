<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/lifeos/bootstrap.php';

use LifeOS\Http;
use LifeOS\LeadIngestionService;

$config = lifeos_config();
Http::applyCors($config);

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    Http::json(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '[]', true);
if (!is_array($body)) {
    Http::json(400, ['ok' => false, 'error' => 'invalid_json', 'message' => 'Invalid JSON body.']);
}

$result = LeadIngestionService::ingest($body);
Http::json($result['status'], $result['body']);
