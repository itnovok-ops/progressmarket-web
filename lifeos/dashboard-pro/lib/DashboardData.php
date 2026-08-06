<?php
declare(strict_types=1);

use LifeOS\Growth\ConversionEngine;
use LifeOS\Growth\EventCollector;
use LifeOS\Growth\IntentEngine;
use LifeOS\Growth\LandingRegistry;
use LifeOS\Growth\MetricsEngine;

final class DashboardData
{
    /**
     * @return array<string, mixed>
     */
    public static function globalOverview(): array
    {
        try {
            $summary = MetricsEngine::globalSummary();
            $landings = $summary['landings'] ?? [];
            $events = EventCollector::readEvents();
            $sessions = self::uniqueSessionIds($events);
            $sessionCount = count($sessions);

            $totalConversions = count(self::sessionsWithTypes($events, ['form_submit']));
            $avgCtr = self::averageMetric($landings, 'ctr');
            $avgVideo = self::averageMetric($landings, 'video_rate');
            $avgScroll = self::averageMetric($landings, 'scroll_depth_avg');

            $cards = [];
            foreach (LandingRegistry::activeIds() as $landingId) {
                $cards[] = self::landingCard($landingId);
            }

            usort($cards, static fn(array $a, array $b): int => ($b['performance_score'] ?? 0) <=> ($a['performance_score'] ?? 0));

            $best = $cards[0] ?? null;
            $worst = null;
            foreach (array_reverse($cards) as $card) {
                if (($card['sessions'] ?? 0) > 0) {
                    $worst = $card;
                    break;
                }
            }

            $globalFunnel = ConversionEngine::funnel();
            $globalIntent = IntentEngine::summarize($events);

            return [
                'ok' => true,
                'total_sessions' => $sessionCount,
                'total_conversions' => $totalConversions,
                'conversion_rate' => $sessionCount > 0 ? round($totalConversions / $sessionCount, 4) : 0.0,
                'average_ctr' => $avgCtr,
                'average_video_engagement' => $avgVideo,
                'average_scroll_depth' => $avgScroll,
                'best_landing' => $best,
                'worst_landing' => $worst,
                'landing_cards' => $cards,
                'funnel' => $globalFunnel,
                'intent' => self::intentPercents($globalIntent),
                'landings' => $landings,
            ];
        } catch (Throwable) {
            return self::emptyOverview();
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function landingCard(string $landingId): array
    {
        try {
            $landing = LandingRegistry::find($landingId);
            $metrics = MetricsEngine::forLanding($landingId);
            $events = EventCollector::readEvents($landingId);
            $intent = IntentEngine::summarize($events, $landingId);
            $intentPct = self::intentPercents($intent);

            return [
                'landing_id' => $landingId,
                'name' => (string) ($landing['name'] ?? $landingId),
                'version' => (string) ($landing['version'] ?? '—'),
                'sessions' => (int) ($metrics['sessions'] ?? 0),
                'conversion_rate' => (float) ($metrics['conversion_rate'] ?? 0),
                'ctr' => (float) ($metrics['ctr'] ?? 0),
                'video_engagement' => (float) ($metrics['video_rate'] ?? 0),
                'scroll_depth_avg' => (float) ($metrics['scroll_depth_avg'] ?? 0),
                'intent' => $intentPct,
                'intent_raw' => $intent,
                'performance_score' => self::performanceScore($metrics),
            ];
        } catch (Throwable) {
            return [
                'landing_id' => $landingId,
                'name' => $landingId,
                'sessions' => 0,
                'conversion_rate' => 0.0,
                'video_engagement' => 0.0,
                'intent' => ['low' => 0, 'medium' => 0, 'high' => 0],
                'performance_score' => 0,
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function landingDetail(string $landingId): array
    {
        try {
            $landing = LandingRegistry::find($landingId);
            if ($landing === null) {
                return ['ok' => false, 'error' => 'landing_not_found'];
            }

            $events = EventCollector::readEvents($landingId);
            $metrics = MetricsEngine::forLanding($landingId);
            $funnel = ConversionEngine::funnel($landingId);
            $intent = IntentEngine::summarize($events, $landingId);
            $sessions = EventCollector::readSessions($landingId);

            $sessionBehaviors = [];
            foreach (self::uniqueSessionIds($events) as $sid) {
                $sessionBehaviors[] = [
                    'session_id' => $sid,
                    'intent' => IntentEngine::scoreSession($sid, $events),
                    'events' => array_values(array_filter(
                        $events,
                        static fn(array $e): bool => ($e['session_id'] ?? '') === $sid
                    )),
                ];
            }

            usort($sessionBehaviors, static function (array $a, array $b): int {
                $ta = (int) (($a['events'][0]['timestamp'] ?? 0));
                $tb = (int) (($b['events'][0]['timestamp'] ?? 0));
                return $tb <=> $ta;
            });

            return [
                'ok' => true,
                'landing' => $landing,
                'landing_id' => $landingId,
                'card' => self::landingCard($landingId),
                'metrics' => $metrics,
                'funnel' => $funnel,
                'intent' => self::intentPercents($intent),
                'intent_raw' => $intent,
                'timeline' => self::buildTimeline($events),
                'session_behaviors' => array_slice($sessionBehaviors, 0, 50),
                'heatmap_summary' => self::heatmapSummary($events),
                'conversion_timeline' => self::conversionTimeline($events),
                'sessions_meta' => $sessions,
            ];
        } catch (Throwable) {
            return ['ok' => false, 'error' => 'read_failed'];
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function trafficStats(): array
    {
        try {
            $events = EventCollector::readEvents();
            $byLanding = [];
            $byHour = [];

            foreach ($events as $event) {
                $lid = (string) ($event['landing_id'] ?? 'unknown');
                $sid = (string) ($event['session_id'] ?? '');
                if ($sid === '') {
                    continue;
                }
                if (!isset($byLanding[$lid])) {
                    $byLanding[$lid] = [];
                }
                $byLanding[$lid][$sid] = true;

                $ts = (int) ($event['timestamp'] ?? 0);
                if ($ts > 0) {
                    $hour = gmdate('Y-m-d H:00', $ts);
                    $byLandingHour = &$byHour[$lid];
                    if (!isset($byLandingHour)) {
                        $byLandingHour = [];
                    }
                    $byLandingHour[$hour] = ($byLandingHour[$hour] ?? 0) + 1;
                }
            }

            $traffic = [];
            foreach ($byLanding as $lid => $sessions) {
                $traffic[] = [
                    'landing_id' => $lid,
                    'sessions' => count($sessions),
                    'events' => count(array_filter($events, static fn(array $e): bool => ($e['landing_id'] ?? '') === $lid)),
                ];
            }

            usort($traffic, static fn(array $a, array $b): int => $b['sessions'] <=> $a['sessions']);

            return ['ok' => true, 'traffic' => $traffic, 'events_by_hour' => $byHour];
        } catch (Throwable) {
            return ['ok' => true, 'traffic' => [], 'events_by_hour' => []];
        }
    }

    /**
     * @param array<string, mixed> $metrics
     */
    public static function performanceScore(array $metrics): int
    {
        $score = (float) ($metrics['conversion_rate'] ?? 0) * 40
            + (float) ($metrics['ctr'] ?? 0) * 25
            + (float) ($metrics['video_rate'] ?? 0) * 25
            + (float) ($metrics['scroll_depth_avg'] ?? 0) * 10;

        return (int) round(min(100, max(0, $score * 100)));
    }

    /**
     * @param array{low: int, medium: int, high: int} $intent
     * @return array{low: float, medium: float, high: float, low_count: int, medium_count: int, high_count: int}
     */
    public static function intentPercents(array $intent): array
    {
        $low = (int) ($intent['low'] ?? 0);
        $medium = (int) ($intent['medium'] ?? 0);
        $high = (int) ($intent['high'] ?? 0);
        $total = max(1, $low + $medium + $high);

        return [
            'low' => round($low / $total, 4),
            'medium' => round($medium / $total, 4),
            'high' => round($high / $total, 4),
            'low_count' => $low,
            'medium_count' => $medium,
            'high_count' => $high,
        ];
    }

    /**
     * @param list<array<string, mixed>> $events
     * @return list<string>
     */
    private static function uniqueSessionIds(array $events): array
    {
        $sessions = [];
        foreach ($events as $event) {
            $sid = (string) ($event['session_id'] ?? '');
            if ($sid !== '') {
                $sessions[$sid] = true;
            }
        }

        return array_keys($sessions);
    }

    /**
     * @param list<array<string, mixed>> $events
     * @param list<string> $types
     * @return array<string, true>
     */
    private static function sessionsWithTypes(array $events, array $types): array
    {
        $sessions = [];
        foreach ($events as $event) {
            if (!in_array((string) ($event['event_type'] ?? ''), $types, true)) {
                continue;
            }
            $sid = (string) ($event['session_id'] ?? '');
            if ($sid !== '') {
                $sessions[$sid] = true;
            }
        }

        return $sessions;
    }

    /**
     * @param array<string, array<string, mixed>> $landings
     */
    private static function averageMetric(array $landings, string $key): float
    {
        if ($landings === []) {
            return 0.0;
        }
        $sum = 0.0;
        $n = 0;
        foreach ($landings as $metrics) {
            if (!is_array($metrics)) {
                continue;
            }
            $sum += (float) ($metrics[$key] ?? 0);
            $n++;
        }

        return $n > 0 ? round($sum / $n, 4) : 0.0;
    }

    /**
     * @param list<array<string, mixed>> $events
     * @return list<array<string, mixed>>
     */
    private static function buildTimeline(array $events): array
    {
        $sorted = $events;
        usort($sorted, static fn(array $a, array $b): int => ((int) ($a['timestamp'] ?? 0)) <=> ((int) ($b['timestamp'] ?? 0)));

        $timeline = [];
        foreach (array_slice($sorted, -200) as $event) {
            $timeline[] = [
                'timestamp' => (int) ($event['timestamp'] ?? 0),
                'time' => $event['timestamp'] ? gmdate('Y-m-d H:i:s', (int) $event['timestamp']) : '—',
                'session_id' => (string) ($event['session_id'] ?? ''),
                'event_type' => (string) ($event['event_type'] ?? ''),
                'data' => is_array($event['data'] ?? null) ? $event['data'] : [],
            ];
        }

        return array_reverse($timeline);
    }

    /**
     * @param list<array<string, mixed>> $events
     * @return array<string, mixed>
     */
    private static function heatmapSummary(array $events): array
    {
        $zones = [
            'hero' => 0,
            'mid' => 0,
            'pricing' => 0,
            'form' => 0,
            'other' => 0,
        ];
        $maxDepth = 0.0;

        foreach ($events as $event) {
            $type = (string) ($event['event_type'] ?? '');
            $data = is_array($event['data'] ?? null) ? $event['data'] : [];

            if ($type === 'scroll' && isset($data['depth'])) {
                $depth = (float) $data['depth'];
                $maxDepth = max($maxDepth, $depth);
                if ($depth < 0.25) {
                    $zones['hero']++;
                } elseif ($depth < 0.55) {
                    $zones['mid']++;
                } elseif ($depth < 0.8) {
                    $zones['pricing']++;
                } else {
                    $zones['form']++;
                }
            }

            if ($type === 'cta_click') {
                $zones['mid']++;
            }
            if (in_array($type, ['form_start', 'form_submit'], true)) {
                $zones['form']++;
            }
        }

        $total = max(1, array_sum($zones));

        return [
            'zones' => $zones,
            'zone_percent' => array_map(static fn(int $c): float => round($c / $total, 4), $zones),
            'max_scroll_depth' => round($maxDepth, 4),
            'summary' => self::heatmapNarrative($zones, $maxDepth),
        ];
    }

    /**
     * @param array<string, int> $zones
     */
    private static function heatmapNarrative(array $zones, float $maxDepth): string
    {
        $top = array_keys($zones, max($zones), true)[0] ?? 'other';
        $labels = [
            'hero' => 'верх страницы (hero)',
            'mid' => 'середина контента',
            'pricing' => 'блок цены / оффера',
            'form' => 'форма заявки',
            'other' => 'прочие зоны',
        ];

        return sprintf(
            'Пик вовлечённости: %s. Макс. глубина скролла: %s%%.',
            $labels[$top] ?? $top,
            number_format($maxDepth * 100, 1)
        );
    }

    /**
     * @param list<array<string, mixed>> $events
     * @return list<array<string, mixed>>
     */
    private static function conversionTimeline(array $events): array
    {
        $submits = array_filter(
            $events,
            static fn(array $e): bool => ($e['event_type'] ?? '') === 'form_submit'
        );

        $buckets = [];
        foreach ($submits as $event) {
            $ts = (int) ($event['timestamp'] ?? 0);
            if ($ts <= 0) {
                continue;
            }
            $day = gmdate('Y-m-d', $ts);
            $buckets[$day] = ($buckets[$day] ?? 0) + 1;
        }

        ksort($buckets);
        $out = [];
        foreach ($buckets as $day => $count) {
            $out[] = ['date' => $day, 'conversions' => $count];
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private static function emptyOverview(): array
    {
        return [
            'ok' => true,
            'total_sessions' => 0,
            'total_conversions' => 0,
            'conversion_rate' => 0.0,
            'average_ctr' => 0.0,
            'average_video_engagement' => 0.0,
            'average_scroll_depth' => 0.0,
            'best_landing' => null,
            'worst_landing' => null,
            'landing_cards' => [],
            'funnel' => ConversionEngine::funnel(),
            'intent' => ['low' => 0, 'medium' => 0, 'high' => 0, 'low_count' => 0, 'medium_count' => 0, 'high_count' => 0],
            'landings' => [],
        ];
    }
}
