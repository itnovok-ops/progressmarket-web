<?php
declare(strict_types=1);

namespace LifeOS\Growth;

final class ConversionEngine
{
    /** @var list<string> */
    private const STAGES = [
        'visit',
        'scroll',
        'video_view',
        'video_click',
        'cta_click',
        'form_start',
        'form_submit',
    ];

    /** @var array<string, string> */
    private const EVENT_TO_STAGE = [
        'visit' => 'visit',
        'scroll' => 'scroll',
        'video_view' => 'video_view',
        'video_play' => 'video_view',
        'video_click' => 'video_click',
        'cta_click' => 'cta_click',
        'form_start' => 'form_start',
        'form_submit' => 'form_submit',
    ];

    /**
     * @param list<array<string, mixed>> $events
     * @return array<string, mixed>
     */
    public static function funnel(?string $landingId = null): array
    {
        $events = EventCollector::readEvents($landingId);
        $sessions = [];

        foreach ($events as $event) {
            $sid = (string) ($event['session_id'] ?? '');
            if ($sid === '') {
                continue;
            }
            if (!isset($sessions[$sid])) {
                $sessions[$sid] = [];
            }
            $type = (string) ($event['event_type'] ?? '');
            if (isset(self::EVENT_TO_STAGE[$type])) {
                $sessions[$sid][self::EVENT_TO_STAGE[$type]] = true;
            }
        }

        $sessionCount = count($sessions);
        $stageCounts = [];
        foreach (self::STAGES as $stage) {
            $stageCounts[$stage] = 0;
        }

        foreach ($sessions as $stages) {
            foreach (self::STAGES as $stage) {
                if (!empty($stages[$stage])) {
                    $stageCounts[$stage]++;
                }
            }
        }

        $rates = [];
        $prev = max($sessionCount, 1);
        $drops = [];

        foreach (self::STAGES as $stage) {
            $count = $stageCounts[$stage];
            $rates[$stage] = $sessionCount > 0 ? round($count / $sessionCount, 4) : 0.0;
            $drop = $prev > 0 ? round(1 - ($count / $prev), 4) : 0.0;
            $drops[$stage] = $drop;
            $prev = max($count, 1);
        }

        $weakest = 'visit';
        $maxDrop = -1.0;
        foreach ($drops as $stage => $drop) {
            if ($stage === 'visit') {
                continue;
            }
            if ($drop > $maxDrop) {
                $maxDrop = $drop;
                $weakest = $stage;
            }
        }

        $bestLanding = self::bestPerformingLanding();

        return [
            'stages' => $stageCounts,
            'rates' => $rates,
            'drop_offs' => $drops,
            'weakest_step' => $weakest,
            'best_landing' => $bestLanding,
            'sessions' => $sessionCount,
        ];
    }

    /**
     * @return array{landing_id: string, conversion_rate: float}|null
     */
    private static function bestPerformingLanding(): ?array
    {
        $best = null;
        foreach (LandingRegistry::activeIds() as $landingId) {
            $metrics = MetricsEngine::forLanding($landingId);
            $rate = (float) ($metrics['conversion_rate'] ?? 0);
            if ($best === null || $rate > $best['conversion_rate']) {
                $best = [
                    'landing_id' => $landingId,
                    'conversion_rate' => $rate,
                ];
            }
        }

        return $best;
    }
}
