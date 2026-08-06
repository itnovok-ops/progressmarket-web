<?php
declare(strict_types=1);

namespace LifeOS\Growth;

use LifeOS\Http;

final class GrowthHttp
{
    /**
     * @param array<string, mixed> $config
     */
    public static function applyCors(array $config): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowed = $config['allowed_origins'] ?? [];
        if ($origin !== '' && in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
        }
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Accept');
    }

    public static function handleOptions(): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    /**
     * @param array<string, mixed> $payload
     */
    public static function json(int $status, array $payload): void
    {
        Http::json($status, $payload);
    }
}
