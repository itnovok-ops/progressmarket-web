<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once dirname(__DIR__, 2) . '/lifeos/growth/bootstrap.php';

use LifeOS\Growth\EventReceiver;
use LifeOS\Growth\GrowthHttp;

$config = growth_config();
GrowthHttp::applyCors($config);
GrowthHttp::handleOptions();

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        GrowthHttp::json(200, ['status' => 'ok', 'accepted' => 0]);
    }

    $raw = file_get_contents('php://input') ?: '';
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        GrowthHttp::json(200, ['status' => 'ok', 'accepted' => 0]);
    }

    $result = EventReceiver::ingestPayload($body);
    GrowthHttp::json(200, $result);
} catch (\Throwable) {
    GrowthHttp::json(200, ['status' => 'ok', 'accepted' => 0]);
}
