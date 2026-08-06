<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

use LifeOS\Growth\EventCollector;
use LifeOS\Growth\GrowthHttp;

$config = growth_config();
GrowthHttp::applyCors($config);
GrowthHttp::handleOptions();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    GrowthHttp::json(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

$landingId = trim((string) ($_GET['landing_id'] ?? ''));
$events = EventCollector::readEvents($landingId !== '' ? $landingId : null);

$byHour = [];
$byLanding = [];
$referrers = [];

foreach ($events as $event) {
    $ts = (int) ($event['timestamp'] ?? $event['received_at'] ?? time());
    $hour = gmdate('Y-m-d H:00', $ts);
    $byHour[$hour] = ($byHour[$hour] ?? 0) + 1;

    $lid = (string) ($event['landing_id'] ?? 'unknown');
    $byLanding[$lid] = ($byLanding[$lid] ?? 0) + 1;

    $data = is_array($event['data'] ?? null) ? $event['data'] : [];
    $ref = trim((string) ($data['referrer'] ?? $data['utm_source'] ?? ''));
    if ($ref !== '') {
        $referrers[$ref] = ($referrers[$ref] ?? 0) + 1;
    }
}

ksort($byHour);

GrowthHttp::json(200, [
    'ok' => true,
    'landing_id' => $landingId !== '' ? $landingId : null,
    'total_events' => count($events),
    'events_by_hour' => $byHour,
    'events_by_landing' => $byLanding,
    'top_referrers' => $referrers,
]);
