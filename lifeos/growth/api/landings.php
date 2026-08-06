<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

use LifeOS\Growth\GrowthHttp;
use LifeOS\Growth\LandingRegistry;

$config = growth_config();
GrowthHttp::applyCors($config);
GrowthHttp::handleOptions();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    GrowthHttp::json(200, [
        'ok' => true,
        'landings' => LandingRegistry::all(),
    ]);
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input') ?: '';
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        GrowthHttp::json(400, ['ok' => false, 'error' => 'invalid_json']);
    }

    $ok = LandingRegistry::register($body);
    if (!$ok) {
        GrowthHttp::json(400, ['ok' => false, 'error' => 'register_failed']);
    }

    GrowthHttp::json(201, [
        'ok' => true,
        'landing' => LandingRegistry::find((string) ($body['landing_id'] ?? '')),
    ]);
}

GrowthHttp::json(405, ['ok' => false, 'error' => 'method_not_allowed']);
