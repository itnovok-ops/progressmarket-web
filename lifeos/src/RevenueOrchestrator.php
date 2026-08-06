<?php
declare(strict_types=1);

namespace LifeOS;

final class RevenueOrchestrator
{
    /**
     * @param array<string, mixed> $config
     * @return array{pool: string, sla_hours: int}
     */
    public static function routePreview(string $projectType, array $config): array
    {
        return self::routeByProjectType($projectType, $config);
    }

    /**
     * @param array<string, mixed> $lead
     * @param array<string, mixed> $deal
     * @param array<string, mixed> $config
     * @return array{pool: string, sla_due_at: string, events: list<string>}
     */
    public static function ingestLead(array $lead, array $deal, array $config): array
    {
        $projectType = (string)($lead['project_type'] ?? 'dropshipping');
        $routing = self::routeByProjectType($projectType, $config);
        $pool = $routing['pool'];
        $slaHours = (int)$routing['sla_hours'];
        $slaDueAt = gmdate('c', time() + ($slaHours * 3600));

        self::appendSlaTask([
            'lead_id' => $lead['id'],
            'deal_id' => $deal['id'],
            'project_type' => $projectType,
            'pool' => $pool,
            'sla_due_at' => $slaDueAt,
            'manager_id' => $lead['assigned_manager_id'] ?? '',
            'created_at' => gmdate('c'),
        ]);

        $events = ['LEAD_CREATED', 'LEAD_ROUTED', 'LEAD_ASSIGNED', 'DEAL_CREATED'];

        foreach ($events as $eventName) {
            ObservabilityLogger::log([
                'event' => $eventName,
                'source' => $lead['source'] ?? '',
                'project_type' => $projectType,
                'lead_id' => $lead['id'],
                'deal_id' => $deal['id'],
                'assigned_manager' => $lead['assigned_manager_name'] ?? '',
                'assigned_manager_id' => $lead['assigned_manager_id'] ?? '',
                'nika_score' => $lead['nika_score'] ?? null,
                'routing_decision' => $pool,
                'sla_due_at' => $slaDueAt,
            ]);
        }

        return [
            'pool' => $pool,
            'sla_due_at' => $slaDueAt,
            'events' => $events,
        ];
    }

    /**
     * @param array<string, mixed> $config
     * @return array{pool: string, sla_hours: int}
     */
    private static function routeByProjectType(string $projectType, array $config): array
    {
        $pools = $config['routing_pools'] ?? [];
        if (isset($pools[$projectType]) && is_array($pools[$projectType])) {
            return [
                'pool' => (string)($pools[$projectType]['pool'] ?? 'general'),
                'sla_hours' => (int)($pools[$projectType]['sla_hours'] ?? 24),
            ];
        }

        return ['pool' => 'general', 'sla_hours' => 24];
    }

    /**
     * @param array<string, mixed> $task
     */
    private static function appendSlaTask(array $task): void
    {
        $path = lifeos_storage_path('crm/sla_queue.jsonl');
        file_put_contents(
            $path,
            json_encode($task, JSON_UNESCAPED_UNICODE) . PHP_EOL,
            FILE_APPEND | LOCK_EX
        );
    }
}
