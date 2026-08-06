<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

use LifeOS\Growth\EventIngestLogger;
use LifeOS\Growth\EventReceiver;
use LifeOS\Growth\GrowthHttp;

$config = growth_config();
GrowthHttp::applyCors($config);
GrowthHttp::handleOptions();

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        GrowthHttp::json(200, ['status' => 'ok', 'accepted' => 0, 'note' => 'method_ignored']);
    }

    $raw = file_get_contents('php://input') ?: '';
    $maxBytes = (int) ($config['max_payload_bytes'] ?? 65536);

    if (strlen($raw) > $maxBytes) {
        EventIngestLogger::logInvalid(['size' => strlen($raw)], 'payload_too_large');
        GrowthHttp::json(200, ['status' => 'ok', 'accepted' => 0, 'note' => 'payload_too_large']);
    }

    $body = json_decode($raw, true);
    if (!is_array($body)) {
        EventIngestLogger::logInvalid(['raw' => substr($raw, 0, 512)], 'invalid_json');
        GrowthHttp::json(200, ['status' => 'ok', 'accepted' => 0, 'note' => 'invalid_json']);
    }

    $max = (int) ($config['max_events_per_request'] ?? 50);
    $items = isset($body['events']) && is_array($body['events'])
        ? $body['events']
        : (isset($body[0]) && is_array($body[0]) ? $body : [$body]);

    if (count($items) > $max) {
        EventIngestLogger::logInvalid(['count' => count($items)], 'too_many_events');
        $items = array_slice($items, 0, $max);
    }

    $result = EventReceiver::ingestPayload(['events' => $items]);

    GrowthHttp::json(200, $result);
} catch (\Throwable $e) {
    EventIngestLogger::logInvalid(['fatal' => $e->getMessage()], 'receiver_fatal');
    GrowthHttp::json(200, ['status' => 'ok', 'accepted' => 0, 'note' => 'receiver_error']);
}
