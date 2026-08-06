<?php
declare(strict_types=1);

namespace LifeOS\Growth;

final class EventCollector
{
    /**
     * @param array<string, mixed> $event
     * @return array{ok: bool, stored: bool}
     */
    public static function collect(array $event): array
    {
        $eventsPath = growth_storage_path('events.jsonl');
        $line = json_encode($event, JSON_UNESCAPED_UNICODE);
        if ($line === false) {
            return ['ok' => false, 'stored' => false];
        }

        $written = file_put_contents($eventsPath, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
        if ($written === false) {
            return ['ok' => false, 'stored' => false];
        }

        self::touchSession($event);
        self::touchConversion($event);

        return ['ok' => true, 'stored' => true];
    }

    /**
     * @param array<string, mixed> $event
     */
    private static function touchConversion(array $event): void
    {
        /** @var list<string> */
        static $funnelStages = [
            'visit',
            'scroll',
            'video_view',
            'video_play',
            'video_click',
            'cta_click',
            'form_start',
            'form_submit',
        ];

        $eventType = (string) ($event['event_type'] ?? '');
        if (!in_array($eventType, $funnelStages, true)) {
            return;
        }

        $stage = $eventType;
        if ($eventType === 'video_play') {
            $stage = 'video_view';
        }

        $conversionRecord = [
            'landing_id' => $event['landing_id'],
            'session_id' => $event['session_id'],
            'stage' => $stage,
            'event_type' => $eventType,
            'timestamp' => (int) ($event['timestamp'] ?? time()),
            'converted' => $eventType === 'form_submit',
            'received_at' => time(),
        ];

        $path = growth_storage_path('conversions.jsonl');
        $line = json_encode($conversionRecord, JSON_UNESCAPED_UNICODE);
        if ($line !== false) {
            file_put_contents($path, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
        }
    }

    /**
     * @param array<string, mixed> $event
     */
    private static function touchSession(array $event): void
    {
        $sessionRecord = [
            'landing_id' => $event['landing_id'],
            'session_id' => $event['session_id'],
            'last_event_type' => $event['event_type'],
            'last_timestamp' => $event['timestamp'],
            'updated_at' => time(),
        ];

        $path = growth_storage_path('sessions.jsonl');
        $line = json_encode($sessionRecord, JSON_UNESCAPED_UNICODE);
        if ($line !== false) {
            file_put_contents($path, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function readEvents(?string $landingId = null): array
    {
        return self::readJsonl(growth_storage_path('events.jsonl'), $landingId);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function readSessions(?string $landingId = null): array
    {
        $rows = self::readJsonl(growth_storage_path('sessions.jsonl'), $landingId);
        $latest = [];

        foreach ($rows as $row) {
            $sid = (string) ($row['session_id'] ?? '');
            if ($sid === '') {
                continue;
            }
            $ts = (int) ($row['last_timestamp'] ?? $row['updated_at'] ?? 0);
            if (!isset($latest[$sid]) || $ts >= (int) ($latest[$sid]['last_timestamp'] ?? 0)) {
                $latest[$sid] = $row;
            }
        }

        return array_values($latest);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function readJsonl(string $path, ?string $landingId): array
    {
        if (!is_readable($path)) {
            return [];
        }

        $out = [];
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            return [];
        }

        while (($line = fgets($handle)) !== false) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            $decoded = json_decode($line, true);
            if (!is_array($decoded)) {
                continue;
            }
            if ($landingId !== null && ($decoded['landing_id'] ?? '') !== $landingId) {
                continue;
            }
            $out[] = $decoded;
        }

        fclose($handle);

        return $out;
    }
}
