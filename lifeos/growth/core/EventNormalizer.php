<?php
declare(strict_types=1);

namespace LifeOS\Growth;

final class EventNormalizer
{
    /** @var array<string, string> */
    private const EVENT_MAP = [
        'visit' => 'visit',
        'scroll' => 'scroll',
        'cta_click' => 'cta_click',
        'form_focus' => 'form_start',
        'form_start' => 'form_start',
        'form_submit' => 'form_submit',
        'video_play' => 'video_play',
        'video_click' => 'video_click',
        'video_view' => 'video_view',
        'exit_intent' => 'intent',
    ];

    /**
     * Normalize SuperSite / client payload to storage schema.
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>|null
     */
    public static function fromClient(array $payload): ?array
    {
        if (isset($payload['event_type'], $payload['landing_id'], $payload['session_id'])) {
            return $payload;
        }

        if (!isset($payload['event']) || !is_string($payload['event']) || trim($payload['event']) === '') {
            return null;
        }

        $session = self::normalizeSession($payload['session'] ?? null);
        $page = self::normalizePage($payload['page'] ?? null);
        if ($page === null) {
            return null;
        }

        $metadata = is_array($payload['metadata'] ?? null) ? $payload['metadata'] : [];
        $lifeosSession = is_array($payload['lifeos_session'] ?? null) ? $payload['lifeos_session'] : [];

        $config = growth_config();
        $landingId = trim((string) ($page['landing_id'] ?? $session['landing_id'] ?? $config['default_landing_id'] ?? 'wb-fbs-v1'));
        if ($landingId === '') {
            $landingId = (string) ($config['default_landing_id'] ?? 'wb-fbs-v1');
        }

        $timestamp = self::normalizeTimestamp($payload['timestamp'] ?? null);
        if ($timestamp === null) {
            return null;
        }

        $eventName = trim($payload['event']);
        $eventType = self::EVENT_MAP[$eventName] ?? $eventName;

        return [
            'landing_id' => $landingId,
            'session_id' => $session['id'],
            'event_type' => $eventType,
            'timestamp' => $timestamp,
            'data' => array_merge($metadata, [
                'page' => $page,
                'session_mode' => $session['mode'],
                'session_context' => $session['context'],
                'lifeos_session' => $lifeosSession,
                'client_event' => $eventName,
            ]),
        ];
    }

    /**
     * @param mixed $raw
     * @return array{id: string, mode: string, landing_id: string, context: array<string, mixed>}|null
     */
    private static function normalizeSession(mixed $raw): ?array
    {
        $config = growth_config();
        $defaultLanding = (string) ($config['default_landing_id'] ?? 'wb-fbs-v1');

        if (!is_array($raw)) {
            return [
                'id' => self::generateGuestSessionId(),
                'mode' => 'guest',
                'landing_id' => $defaultLanding,
                'context' => ['source' => 'landing'],
            ];
        }

        $id = trim((string) ($raw['id'] ?? ''));
        if ($id === '') {
            $id = self::generateGuestSessionId();
        }

        $mode = trim((string) ($raw['mode'] ?? 'guest'));
        if ($mode === '') {
            $mode = 'guest';
        }

        $context = is_array($raw['context'] ?? null) ? $raw['context'] : [];

        return [
            'id' => $id,
            'mode' => $mode,
            'landing_id' => trim((string) ($raw['landing_id'] ?? $defaultLanding)) ?: $defaultLanding,
            'context' => $context,
        ];
    }

    /**
     * @param mixed $raw
     * @return array<string, mixed>|null
     */
    private static function normalizePage(mixed $raw): ?array
    {
        $config = growth_config();
        $defaultLanding = (string) ($config['default_landing_id'] ?? 'wb-fbs-v1');

        if (is_string($raw)) {
            $path = trim($raw);
            if ($path === '') {
                return null;
            }

            return [
                'path' => $path,
                'href' => $path,
                'landing_id' => $defaultLanding,
            ];
        }

        if (!is_array($raw)) {
            return null;
        }

        $path = trim((string) ($raw['path'] ?? $raw['href'] ?? ''));
        $landingId = trim((string) ($raw['landing_id'] ?? $defaultLanding));

        if ($path === '' && $landingId === '') {
            return null;
        }

        return [
            'path' => $path !== '' ? $path : '/',
            'href' => (string) ($raw['href'] ?? $path),
            'landing_id' => $landingId !== '' ? $landingId : $defaultLanding,
        ];
    }

    private static function normalizeTimestamp(mixed $raw): ?int
    {
        if (!is_numeric($raw)) {
            return null;
        }

        $ts = (int) $raw;
        if ($ts > 9999999999) {
            $ts = (int) floor($ts / 1000);
        }

        if ($ts <= 0) {
            return null;
        }

        return $ts;
    }

    public static function generateGuestSessionId(): string
    {
        try {
            return 'guest-' . bin2hex(random_bytes(8));
        } catch (\Throwable) {
            return 'guest-' . uniqid('', true);
        }
    }
}
