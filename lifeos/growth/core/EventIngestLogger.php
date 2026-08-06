<?php
declare(strict_types=1);

namespace LifeOS\Growth;

final class EventIngestLogger
{
    /**
     * @param array<string, mixed> $payload
     */
    public static function logInvalid(array $payload, string $reason): void
    {
        try {
            $record = [
                'reason' => $reason,
                'payload' => $payload,
                'logged_at' => time(),
            ];

            $path = growth_storage_path('invalid_events.jsonl');
            $line = json_encode($record, JSON_UNESCAPED_UNICODE);
            if ($line !== false) {
                @file_put_contents($path, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
            }
        } catch (\Throwable) {
            /* silent */
        }
    }
}
