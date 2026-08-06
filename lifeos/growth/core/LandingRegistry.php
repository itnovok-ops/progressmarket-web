<?php
declare(strict_types=1);

namespace LifeOS\Growth;

final class LandingRegistry
{
    /**
     * @return list<array<string, mixed>>
     */
    public static function all(): array
    {
        $path = growth_storage_path('landings.json');
        if (!is_readable($path)) {
            return [];
        }

        $raw = json_decode((string) file_get_contents($path), true);
        if (!is_array($raw) || !isset($raw['landings']) || !is_array($raw['landings'])) {
            return [];
        }

        return $raw['landings'];
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function find(string $landingId): ?array
    {
        foreach (self::all() as $landing) {
            if (($landing['landing_id'] ?? '') === $landingId) {
                return $landing;
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $landing
     */
    public static function register(array $landing): bool
    {
        $landingId = trim((string) ($landing['landing_id'] ?? ''));
        if ($landingId === '') {
            return false;
        }

        $landings = self::all();
        $found = false;

        foreach ($landings as $index => $item) {
            if (($item['landing_id'] ?? '') === $landingId) {
                $landings[$index] = array_merge($item, $landing, ['landing_id' => $landingId]);
                $found = true;
                break;
            }
        }

        if (!$found) {
            $landings[] = array_merge(
                [
                    'created_at' => gmdate('c'),
                    'active' => true,
                ],
                $landing,
                ['landing_id' => $landingId]
            );
        }

        $path = growth_storage_path('landings.json');
        $json = json_encode(['landings' => $landings], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return $json !== false && file_put_contents($path, $json, LOCK_EX) !== false;
    }

    /**
     * @return list<string>
     */
    public static function activeIds(): array
    {
        $ids = [];
        foreach (self::all() as $landing) {
            if (($landing['active'] ?? true) === true) {
                $ids[] = (string) $landing['landing_id'];
            }
        }

        return $ids;
    }
}
