<?php
declare(strict_types=1);

namespace LifeOS\Growth;

final class IntentEngine
{
    /**
     * @param list<array<string, mixed>> $events
     * @return array{session_id: string, intent_score: int, level: string}
     */
    public static function scoreSession(string $sessionId, array $events): array
    {
        $score = 15;
        $hasFastScroll = false;
        $hasVideoView = false;
        $hasVideoClick = false;
        $hasCta = false;
        $hasFormFocus = false;

        foreach ($events as $event) {
            if (($event['session_id'] ?? '') !== $sessionId) {
                continue;
            }

            $type = (string) ($event['event_type'] ?? '');
            $data = is_array($event['data'] ?? null) ? $event['data'] : [];

            if ($type === 'scroll' && !empty($data['fast_scroll'])) {
                $hasFastScroll = true;
                $score -= 8;
            }
            if ($type === 'scroll' && isset($data['pause_ms']) && (int) $data['pause_ms'] > 2500) {
                $score += 12;
            }
            if ($type === 'video_view') {
                $hasVideoView = true;
                $score += 18;
            }
            if ($type === 'video_click') {
                $hasVideoClick = true;
                $score += 28;
            }
            if ($type === 'cta_click') {
                $hasCta = true;
                $score += 25;
            }
            if ($type === 'form_start') {
                $hasFormFocus = true;
                $score += 30;
            }
            if ($type === 'form_submit') {
                $score += 35;
            }
            if ($type === 'intent' && isset($data['score'])) {
                $score = max($score, (int) $data['score']);
            }
        }

        if ($hasFastScroll && !$hasVideoView && !$hasVideoClick) {
            $score = min($score, 35);
        }
        if ($hasVideoClick || $hasCta || $hasFormFocus) {
            $score = max($score, 70);
        }
        if ($hasVideoView && !$hasFastScroll) {
            $score = max($score, 45);
        }

        $score = max(0, min(100, $score));
        $level = 'LOW';
        if ($score >= 70) {
            $level = 'HIGH';
        } elseif ($score >= 40) {
            $level = 'MEDIUM';
        }

        return [
            'session_id' => $sessionId,
            'intent_score' => $score,
            'level' => $level,
        ];
    }

    /**
     * @param list<array<string, mixed>> $events
     * @return array{low: int, medium: int, high: int, average_score: float}
     */
    public static function summarize(array $events, ?string $landingId = null): array
    {
        $sessions = [];
        foreach ($events as $event) {
            if ($landingId !== null && ($event['landing_id'] ?? '') !== $landingId) {
                continue;
            }
            $sid = (string) ($event['session_id'] ?? '');
            if ($sid !== '') {
                $sessions[$sid] = true;
            }
        }

        $low = 0;
        $medium = 0;
        $high = 0;
        $totalScore = 0;

        foreach (array_keys($sessions) as $sessionId) {
            $result = self::scoreSession($sessionId, $events);
            $totalScore += $result['intent_score'];
            if ($result['level'] === 'HIGH') {
                $high++;
            } elseif ($result['level'] === 'MEDIUM') {
                $medium++;
            } else {
                $low++;
            }
        }

        $count = count($sessions);

        return [
            'low' => $low,
            'medium' => $medium,
            'high' => $high,
            'average_score' => $count > 0 ? round($totalScore / $count, 2) : 0.0,
        ];
    }
}
