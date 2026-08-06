<?php
declare(strict_types=1);

/**
 * Normalize unified Growth client schema to backend event payload.
 *
 * @param array<string, mixed> $body
 * @return array<string, mixed>|null
 */
function growth_normalize_event(array $body): ?array
{
    if (isset($body['event_type'], $body['landing_id'], $body['session_id'])) {
        return $body;
    }

    if (!isset($body['event']) || !is_string($body['event'])) {
        return null;
    }

    $session = is_array($body['session'] ?? null) ? $body['session'] : [];
    $page = is_array($body['page'] ?? null) ? $body['page'] : [];
    $metadata = is_array($body['metadata'] ?? null) ? $body['metadata'] : [];
    $lifeosSession = is_array($body['lifeos_session'] ?? null) ? $body['lifeos_session'] : [];

    $sessionId = trim((string) ($session['id'] ?? ''));
    if ($sessionId === '') {
        return null;
    }

    $landingId = trim((string) ($page['landing_id'] ?? $session['landing_id'] ?? growth_config()['default_landing_id'] ?? 'wb-fbs-v1'));
    $timestamp = $body['timestamp'] ?? time();
    if (is_numeric($timestamp) && (int) $timestamp > 9999999999) {
        $timestamp = (int) floor(((float) $timestamp) / 1000);
    }

    $map = [
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

    $eventType = $map[$body['event']] ?? $body['event'];

    return [
        'landing_id' => $landingId,
        'session_id' => $sessionId,
        'event_type' => $eventType,
        'timestamp' => (int) $timestamp,
        'data' => array_merge($metadata, [
            'page' => $page,
            'session_mode' => $session['mode'] ?? 'guest',
            'lifeos_session' => $lifeosSession,
        ]),
    ];
}

/**
 * @param array<string, mixed> $body
 * @return list<array<string, mixed>>
 */
function growth_collect_payload_items(array $body): array
{
    if (isset($body['events']) && is_array($body['events'])) {
        return $body['events'];
    }

    return [$body];
}

/**
 * @param list<array<string, mixed>> $items
 * @return array{accepted: int, errors: list<array<string, mixed>>}
 */
function growth_store_events(array $items): array
{
    require_once dirname(__DIR__, 2) . '/lifeos/growth/bootstrap.php';

    $accepted = 0;
    $errors = [];

    foreach ($items as $index => $item) {
        if (!is_array($item)) {
            $errors[] = ['index' => $index, 'error' => 'invalid_item'];
            continue;
        }

        $normalized = growth_normalize_event($item);
        if ($normalized === null) {
            $errors[] = ['index' => $index, 'error' => 'invalid_schema'];
            continue;
        }

        $validation = \LifeOS\Growth\EventValidator::validate($normalized);
        if (!$validation['ok']) {
            $errors[] = ['index' => $index, 'error' => $validation['error'] ?? 'invalid'];
            continue;
        }

        $landingId = (string) $validation['event']['landing_id'];
        if (\LifeOS\Growth\LandingRegistry::find($landingId) === null) {
            \LifeOS\Growth\LandingRegistry::register([
                'landing_id' => $landingId,
                'name' => $landingId,
                'version' => 'auto',
                'active' => true,
            ]);
        }

        $result = \LifeOS\Growth\EventCollector::collect($validation['event']);
        if ($result['stored']) {
            $accepted++;
        } else {
            $errors[] = ['index' => $index, 'error' => 'storage_failed'];
        }
    }

    return ['accepted' => $accepted, 'errors' => $errors];
}
