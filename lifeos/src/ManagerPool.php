<?php
declare(strict_types=1);

namespace LifeOS;

final class ManagerPool
{
    /**
     * @param array<string, mixed> $config
     * @return array{id: string, name: string, pool: string}
     */
    public static function assignNext(array $config, string $targetPool): array
    {
        $managers = $config['managers'] ?? [];
        $eligible = array_values(array_filter($managers, static function (array $manager) use ($targetPool): bool {
            $pool = (string)($manager['pool'] ?? 'general');
            return $pool === $targetPool || $pool === 'general';
        }));

        if ($eligible === []) {
            $eligible = $managers;
        }
        if ($eligible === []) {
            return ['id' => 'unassigned', 'name' => 'Unassigned', 'pool' => $targetPool];
        }

        $stateFile = lifeos_storage_path('state/round_robin.json');
        $state = ['index' => 0];
        if (is_readable($stateFile)) {
            $decoded = json_decode((string)file_get_contents($stateFile), true);
            if (is_array($decoded) && isset($decoded['index'])) {
                $state['index'] = (int)$decoded['index'];
            }
        }

        $idx = $state['index'] % count($eligible);
        $manager = $eligible[$idx];
        $state['index'] = $idx + 1;

        file_put_contents(
            $stateFile,
            json_encode($state, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            LOCK_EX
        );

        return [
            'id' => (string)($manager['id'] ?? 'mgr_unknown'),
            'name' => (string)($manager['name'] ?? 'Manager'),
            'pool' => (string)($manager['pool'] ?? $targetPool),
        ];
    }
}
