<?php
declare(strict_types=1);

namespace LifeOS;

final class CrmCore
{
    /**
     * @param array<string, string> $payload
     * @param array{score: int, recommendation: string, tags: list<string>} $nika
     * @param array{id: string, name: string, pool: string} $manager
     * @return array{lead: array<string, mixed>, deal: array<string, mixed>}
     */
    public static function createLeadAndDeal(array $payload, array $nika, array $manager): array
    {
        $now = gmdate('c');
        $leadId = 'lead_' . bin2hex(random_bytes(8));
        $dealId = 'deal_' . bin2hex(random_bytes(8));

        $lead = [
            'id' => $leadId,
            'status' => 'new',
            'name' => $payload['name'],
            'phone' => $payload['phone'],
            'email' => $payload['email'],
            'comment' => $payload['comment'],
            'project_type' => $payload['project_type'],
            'source' => $payload['source'],
            'nika_score' => $nika['score'],
            'nika_recommendation' => $nika['recommendation'],
            'nika_tags' => $nika['tags'],
            'assigned_manager_id' => $manager['id'],
            'assigned_manager_name' => $manager['name'],
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $deal = [
            'id' => $dealId,
            'lead_id' => $leadId,
            'status' => 'open',
            'title' => self::dealTitle($payload),
            'project_type' => $payload['project_type'],
            'assigned_manager_id' => $manager['id'],
            'assigned_manager_name' => $manager['name'],
            'nika_score' => $nika['score'],
            'created_at' => $now,
            'updated_at' => $now,
        ];

        self::appendJsonl('crm/leads.jsonl', $lead);
        self::appendJsonl('crm/deals.jsonl', $deal);

        return ['lead' => $lead, 'deal' => $deal];
    }

    /**
     * @param array<string, string> $payload
     */
    private static function dealTitle(array $payload): string
    {
        return 'LifeOS: ' . $payload['project_type'] . ' — ' . $payload['name'];
    }

    /**
     * @param array<string, mixed> $record
     */
    private static function appendJsonl(string $relativePath, array $record): void
    {
        $path = lifeos_storage_path($relativePath);
        file_put_contents(
            $path,
            json_encode($record, JSON_UNESCAPED_UNICODE) . PHP_EOL,
            FILE_APPEND | LOCK_EX
        );
    }
}
