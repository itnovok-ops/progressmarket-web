<?php
declare(strict_types=1);

namespace LifeOS\Growth;

final class MetricsEngine
{
    /**
     * @return array<string, mixed>
     */
    public static function forLanding(string $landingId): array
    {
        $events = EventCollector::readEvents($landingId);
        $sessions = self::uniqueSessions($events);
        $sessionCount = count($sessions);

        if ($sessionCount === 0) {
            return [
                'landing_id' => $landingId,
                'sessions' => 0,
                'ctr' => 0.0,
                'video_rate' => 0.0,
                'scroll_depth_avg' => 0.0,
                'conversion_rate' => 0.0,
                'drop_off_rate' => 0.0,
            ];
        }

        $ctaSessions = self::sessionsWithEvent($events, ['cta_click']);
        $videoSessions = self::sessionsWithEvent($events, ['video_view', 'video_click']);
        $formSubmitSessions = self::sessionsWithEvent($events, ['form_submit']);

        $scrollDepths = [];
        foreach ($events as $event) {
            if (($event['event_type'] ?? '') !== 'scroll') {
                continue;
            }
            $data = is_array($event['data'] ?? null) ? $event['data'] : [];
            if (isset($data['depth'])) {
                $scrollDepths[] = (float) $data['depth'];
            }
        }

        $conversionRate = count($formSubmitSessions) / $sessionCount;
        $ctr = count($ctaSessions) / $sessionCount;
        $videoRate = count($videoSessions) / $sessionCount;
        $scrollAvg = count($scrollDepths) > 0
            ? round(array_sum($scrollDepths) / count($scrollDepths), 4)
            : 0.0;

        return [
            'landing_id' => $landingId,
            'sessions' => $sessionCount,
            'ctr' => round($ctr, 4),
            'video_rate' => round($videoRate, 4),
            'scroll_depth_avg' => $scrollAvg,
            'conversion_rate' => round($conversionRate, 4),
            'drop_off_rate' => round(1 - $conversionRate, 4),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function globalSummary(): array
    {
        $events = EventCollector::readEvents();
        $sessions = self::uniqueSessions($events);
        $sessionCount = count($sessions);

        $landingMetrics = [];
        foreach (LandingRegistry::activeIds() as $landingId) {
            $landingMetrics[$landingId] = self::forLanding($landingId);
        }

        $topLanding = null;
        foreach ($landingMetrics as $id => $metrics) {
            if ($topLanding === null || ($metrics['sessions'] ?? 0) > ($topLanding['sessions'] ?? 0)) {
                $topLanding = $metrics;
                $topLanding['landing_id'] = $id;
            }
        }

        $formSubmits = count(self::sessionsWithEvent($events, ['form_submit']));
        $globalConversion = $sessionCount > 0 ? round($formSubmits / $sessionCount, 4) : 0.0;

        return [
            'total_sessions' => $sessionCount,
            'conversion_rate' => $globalConversion,
            'top_landing' => $topLanding,
            'landings' => $landingMetrics,
        ];
    }

    /**
     * @param list<array<string, mixed>> $events
     * @return array<string, true>
     */
    private static function uniqueSessions(array $events): array
    {
        $sessions = [];
        foreach ($events as $event) {
            $sid = (string) ($event['session_id'] ?? '');
            if ($sid !== '') {
                $sessions[$sid] = true;
            }
        }

        return $sessions;
    }

    /**
     * @param list<array<string, mixed>> $events
     * @param list<string> $types
     * @return array<string, true>
     */
    private static function sessionsWithEvent(array $events, array $types): array
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
}
