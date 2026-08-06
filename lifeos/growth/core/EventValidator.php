<?php
declare(strict_types=1);

namespace LifeOS\Growth;

final class EventValidator
{
    /** @var list<string> */
    private const ALLOWED_TYPES = [
        'visit',
        'scroll',
        'video_view',
        'video_play',
        'video_click',
        'cta_click',
        'form_start',
        'form_submit',
        'intent',
    ];

    /**
     * Validate normalized storage payload or client payload.
     *
     * @param array<string, mixed> $payload
     * @return array{ok: bool, error?: string, event?: array<string, mixed>}
     */
    public static function validateClient(array $payload): array
    {
        $normalized = EventNormalizer::fromClient($payload);
        if ($normalized === null) {
            return ['ok' => false, 'error' => 'invalid_client_payload'];
        }

        return self::validate($normalized);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{ok: bool, error?: string, event?: array<string, mixed>}
     */
    public static function validate(array $payload): array
    {
        if (!isset($payload['landing_id'], $payload['session_id'], $payload['event_type'])) {
            $normalized = EventNormalizer::fromClient($payload);
            if ($normalized === null) {
                return ['ok' => false, 'error' => 'invalid_schema'];
            }
            $payload = $normalized;
        }

        $landingId = trim((string) ($payload['landing_id'] ?? ''));
        if ($landingId === '') {
            return ['ok' => false, 'error' => 'landing_id_required'];
        }

        $sessionId = trim((string) ($payload['session_id'] ?? ''));
        if ($sessionId === '') {
            $payload['session_id'] = EventNormalizer::generateGuestSessionId();
            $sessionId = $payload['session_id'];
            $data = is_array($payload['data'] ?? null) ? $payload['data'] : [];
            $data['session_mode'] = $data['session_mode'] ?? 'guest';
            $payload['data'] = $data;
        }

        $eventType = trim((string) ($payload['event_type'] ?? ''));
        if ($eventType === '' && isset($payload['event']) && is_string($payload['event'])) {
            $eventType = trim($payload['event']);
        }

        if (!in_array($eventType, self::ALLOWED_TYPES, true)) {
            return ['ok' => false, 'error' => 'invalid_event_type'];
        }

        $timestamp = $payload['timestamp'] ?? null;
        if (!is_numeric($timestamp)) {
            return ['ok' => false, 'error' => 'timestamp_required'];
        }

        $ts = (int) $timestamp;
        if ($ts > 9999999999) {
            $ts = (int) floor($ts / 1000);
        }
        if ($ts <= 0) {
            return ['ok' => false, 'error' => 'timestamp_invalid'];
        }

        $data = $payload['data'] ?? [];
        if (!is_array($data)) {
            return ['ok' => false, 'error' => 'invalid_data'];
        }

        return [
            'ok' => true,
            'event' => [
                'landing_id' => $landingId,
                'session_id' => $sessionId,
                'event_type' => $eventType,
                'timestamp' => $ts,
                'data' => $data,
                'received_at' => time(),
            ],
        ];
    }
}
