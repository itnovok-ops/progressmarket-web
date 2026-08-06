<?php
declare(strict_types=1);

namespace LifeOS\Growth;

final class EventReceiver
{
    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    public static function ingestPayload(array $body): array
    {
        $items = self::collectItems($body);
        $accepted = 0;
        $processedLandingIds = [];
        $batch = [];

        foreach ($items as $index => $item) {
            if (!is_array($item)) {
                EventIngestLogger::logInvalid(['index' => $index], 'invalid_item');
                continue;
            }

            $result = self::ingestOne($item);
            $batch[] = $result;

            if (($result['stored'] ?? false) === true) {
                $accepted++;
                $landingId = (string) ($result['landing_id'] ?? '');
                if ($landingId !== '') {
                    $processedLandingIds[$landingId] = true;
                }
            }
        }

        $analytics = self::buildAnalyticsResponse(array_keys($processedLandingIds));

        return [
            'status' => 'ok',
            'accepted' => $accepted,
            'batch' => $batch,
            'analytics' => $analytics,
        ];
    }

    /**
     * @param array<string, mixed> $item
     * @return array<string, mixed>
     */
    public static function ingestOne(array $item): array
    {
        $normalized = EventNormalizer::fromClient($item);
        if ($normalized === null) {
            EventIngestLogger::logInvalid($item, 'normalize_failed');
            return ['stored' => false, 'error' => 'normalize_failed'];
        }

        $validation = EventValidator::validate($normalized);
        if (!$validation['ok']) {
            EventIngestLogger::logInvalid($item, (string) ($validation['error'] ?? 'invalid'));
            return ['stored' => false, 'error' => $validation['error'] ?? 'invalid'];
        }

        $event = $validation['event'];
        $landingId = (string) ($event['landing_id'] ?? '');

        if (LandingRegistry::find($landingId) === null) {
            LandingRegistry::register([
                'landing_id' => $landingId,
                'name' => $landingId,
                'version' => 'auto',
                'active' => true,
            ]);
        }

        $stored = EventCollector::collect($event);

        return [
            'stored' => (bool) ($stored['stored'] ?? false),
            'landing_id' => $landingId,
            'session_id' => (string) ($event['session_id'] ?? ''),
            'event_type' => (string) ($event['event_type'] ?? ''),
        ];
    }

    /**
     * @param list<string> $landingIds
     * @return array<string, mixed>
     */
    public static function buildAnalyticsResponse(array $landingIds): array
    {
        if ($landingIds === []) {
            $config = growth_config();
            $landingIds = [(string) ($config['default_landing_id'] ?? 'wb-fbs-v1')];
        }

        $primaryLanding = $landingIds[0];
        $metrics = MetricsEngine::forLanding($primaryLanding);
        $funnel = ConversionEngine::funnel($primaryLanding);
        $events = EventCollector::readEvents($primaryLanding);
        $intent = IntentEngine::summarize($events, $primaryLanding);

        $intentTotal = max(1, (int) ($intent['low'] ?? 0) + (int) ($intent['medium'] ?? 0) + (int) ($intent['high'] ?? 0));

        $landingStats = [
            'landing_id' => $primaryLanding,
            'sessions' => (int) ($metrics['sessions'] ?? 0),
            'ctr' => (float) ($metrics['ctr'] ?? 0),
            'video_engagement_rate' => (float) ($metrics['video_rate'] ?? 0),
            'conversion_rate' => (float) ($metrics['conversion_rate'] ?? 0),
            'average_intent_score' => (float) ($intent['average_score'] ?? 0),
            'scroll_depth_avg' => (float) ($metrics['scroll_depth_avg'] ?? 0),
            'calculated_at' => time(),
        ];

        return [
            'landing_stats' => $landingStats,
            'funnel_metrics' => [
                'stages' => $funnel['stages'] ?? [],
                'rates' => $funnel['rates'] ?? [],
                'drop_offs' => $funnel['drop_offs'] ?? [],
                'weakest_stage' => $funnel['weakest_step'] ?? 'visit',
                'conversion_rate' => (float) ($funnel['rates']['form_submit'] ?? 0),
            ],
            'intent_distribution' => [
                'low' => round(((int) ($intent['low'] ?? 0)) / $intentTotal, 4),
                'medium' => round(((int) ($intent['medium'] ?? 0)) / $intentTotal, 4),
                'high' => round(((int) ($intent['high'] ?? 0)) / $intentTotal, 4),
                'average_score' => (float) ($intent['average_score'] ?? 0),
            ],
        ];
    }

    /**
     * @param array<string, mixed> $body
     * @return list<array<string, mixed>>
     */
    private static function collectItems(array $body): array
    {
        if (isset($body['events']) && is_array($body['events'])) {
            return $body['events'];
        }

        if (isset($body[0]) && is_array($body[0])) {
            return $body;
        }

        return [$body];
    }
}
