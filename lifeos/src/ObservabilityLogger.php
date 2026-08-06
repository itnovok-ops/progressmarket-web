<?php
declare(strict_types=1);

namespace LifeOS;

final class ObservabilityLogger
{
    /**
     * @param array<string, mixed> $event
     */
    public static function log(array $event): void
    {
        $record = array_merge(
            [
                'timestamp' => gmdate('c'),
            ],
            $event
        );

        $path = lifeos_storage_path('logs/lead-events.jsonl');
        file_put_contents(
            $path,
            json_encode($record, JSON_UNESCAPED_UNICODE) . PHP_EOL,
            FILE_APPEND | LOCK_EX
        );
    }
}
