<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

use LifeOS\Growth\ConversionEngine;
use LifeOS\Growth\EventCollector;
use LifeOS\Growth\GrowthHttp;
use LifeOS\Growth\IntentEngine;
use LifeOS\Growth\LandingRegistry;
use LifeOS\Growth\MetricsEngine;

$config = growth_config();
GrowthHttp::applyCors($config);
GrowthHttp::handleOptions();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    GrowthHttp::json(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

$landingId = trim((string) ($_GET['landing_id'] ?? ''));
if ($landingId === '') {
    $landingId = (string) ($config['default_landing_id'] ?? 'wb-fbs-v1');
}

if (LandingRegistry::find($landingId) === null) {
    GrowthHttp::json(404, ['ok' => false, 'error' => 'landing_not_found', 'landing_id' => $landingId]);
}

$events = EventCollector::readEvents($landingId);
$sessions = [];
foreach ($events as $event) {
    $sid = (string) ($event['session_id'] ?? '');
    if ($sid !== '' && !isset($sessions[$sid])) {
        $sessions[$sid] = IntentEngine::scoreSession($sid, $events);
    }
}

GrowthHttp::json(200, [
    'ok' => true,
    'landing_id' => $landingId,
    'metrics' => MetricsEngine::forLanding($landingId),
    'intent_summary' => IntentEngine::summarize($events, $landingId),
    'conversion_funnel' => ConversionEngine::funnel($landingId),
    'sessions_intent' => array_values($sessions),
]);
