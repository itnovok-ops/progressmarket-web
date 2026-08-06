<?php
declare(strict_types=1);

namespace LifeOS;

final class LeadIngestionService
{
    /**
     * @param array<string, mixed> $body
     * @return array{status: int, body: array<string, mixed>}
     */
    public static function ingest(array $body): array
    {
        $config = lifeos_config();
        $validated = LeadPayloadValidator::validate($body, $config);

        if (!$validated['ok']) {
            return [
                'status' => 400,
                'body' => [
                    'ok' => false,
                    'error' => $validated['error'],
                    'message' => $validated['message'],
                ],
            ];
        }

        if (isset($validated['payload']['_honeypot'])) {
            return [
                'status' => 200,
                'body' => ['ok' => true, 'id' => 'hp'],
            ];
        }

        /** @var array<string, string> $payload */
        $payload = $validated['payload'];

        $nika = NikaScoring::score($payload);
        $routingPreview = RevenueOrchestrator::routePreview($payload['project_type'], $config);
        $manager = ManagerPool::assignNext($config, $routingPreview['pool']);

        $created = CrmCore::createLeadAndDeal($payload, $nika, $manager);
        $lead = $created['lead'];
        $deal = $created['deal'];

        $orchestration = RevenueOrchestrator::ingestLead($lead, $deal, $config);

        ObservabilityLogger::log([
            'event' => 'LEAD_INGESTION_COMPLETE',
            'source' => $payload['source'],
            'project_type' => $payload['project_type'],
            'lead_id' => $lead['id'],
            'deal_id' => $deal['id'],
            'assigned_manager' => $manager['name'],
            'assigned_manager_id' => $manager['id'],
            'nika_score' => $nika['score'],
            'routing_decision' => $orchestration['pool'],
            'recommendation' => $nika['recommendation'],
        ]);

        return [
            'status' => 201,
            'body' => [
                'ok' => true,
                'lead_id' => $lead['id'],
                'deal_id' => $deal['id'],
                'status' => 'new',
                'manager' => [
                    'id' => $manager['id'],
                    'name' => $manager['name'],
                ],
                'nika_score' => $nika['score'],
                'recommendation' => $nika['recommendation'],
                'routing' => [
                    'pool' => $orchestration['pool'],
                    'sla_due_at' => $orchestration['sla_due_at'],
                ],
                'events' => $orchestration['events'],
                'message' => 'Lead ingested into LifeOS CRM.',
            ],
        ];
    }
}
