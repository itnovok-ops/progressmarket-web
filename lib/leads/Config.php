<?php
declare(strict_types=1);

namespace MarketV11;

/**
 * Loads config/market-v1_1.php (gitignored, never committed).
 * See config/market-v1_1.sample.php for the required shape.
 */
final class Config
{
    /** @var array<string,mixed>|null */
    private static ?array $data = null;

    /** @return array<string,mixed> */
    public static function load(): array
    {
        if (self::$data !== null) {
            return self::$data;
        }

        $path = dirname(__DIR__, 2) . '/config/market-v1_1.php';
        if (!is_file($path)) {
            throw new \RuntimeException(
                'Missing config/market-v1_1.php — copy config/market-v1_1.sample.php to ' .
                'config/market-v1_1.php and fill it in (see docs/LEAD_REFERRAL_V1.md).'
            );
        }

        /** @var mixed $data */
        $data = require $path;
        if (!is_array($data)) {
            throw new \RuntimeException('config/market-v1_1.php must return an array.');
        }

        self::$data = $data;
        return $data;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $data = self::load();
        return $data[$key] ?? $default;
    }

    /** Test-only hook: inject config without a real file on disk. */
    public static function setForTesting(array $data): void
    {
        self::$data = $data;
    }
}
