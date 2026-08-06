<?php
declare(strict_types=1);

namespace LifeOS;

/**
 * Read-only Nika scoring layer. Does not mutate lead data.
 */
final class NikaScoring
{
    /**
     * @param array<string, string> $payload
     * @return array{score: int, recommendation: string, tags: list<string>}
     */
    public static function score(array $payload): array
    {
        $score = 40;
        $tags = ['new_inbound'];

        if ($payload['email'] !== '') {
            $score += 15;
            $tags[] = 'has_email';
        }

        if (strlen($payload['comment']) >= 20) {
            $score += 10;
            $tags[] = 'detailed_intent';
        }

        if ($payload['project_type'] === 'dropshipping') {
            $score += 10;
            $tags[] = 'dropshipping_intent';
        }

        if ($payload['source'] === 'ads') {
            $score += 8;
            $tags[] = 'paid_traffic';
        } elseif ($payload['source'] === 'landing') {
            $score += 5;
            $tags[] = 'organic_landing';
        }

        if ($score >= 75) {
            $recommendation = 'high_priority';
        } elseif ($score >= 55) {
            $recommendation = 'standard_follow_up';
        } else {
            $recommendation = 'nurture_sequence';
        }

        return [
            'score' => min(100, $score),
            'recommendation' => $recommendation,
            'tags' => $tags,
        ];
    }
}
