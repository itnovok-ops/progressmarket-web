<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/filters.php';
require_once dirname(__DIR__, 2) . '/lib/leads/Config.php';
require_once dirname(__DIR__, 2) . '/lib/leads/LeadRepository.php';
require_once dirname(__DIR__, 2) . '/lib/leads/SqliteLeadRepository.php';
require_once dirname(__DIR__, 2) . '/lib/leads/JsonlLeadRepository.php';
require_once dirname(__DIR__, 2) . '/lib/leads/LeadRepositoryFactory.php';
require_once dirname(__DIR__, 2) . '/lib/leads/Csv.php';

use MarketV11\Csv;
use MarketV11\LeadRepositoryFactory;
use function MarketV11Admin\filtersFromQuery;
use function MarketV11Admin\requireAuth;

requireAuth();

$filters = filtersFromQuery($_GET);
$repository = LeadRepositoryFactory::make();
$leads = $repository->query($filters, 5000, 0);

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="leads-' . gmdate('Ymd-His') . '.csv"');

$out = fopen('php://output', 'w');
// UTF-8 BOM so Excel opens Cyrillic correctly.
fwrite($out, "\xEF\xBB\xBF");

Csv::writeRow($out, [
    'lead_id', 'created_at', 'name', 'phone', 'email', 'comment', 'referral_code',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'landing_url', 'status',
]);

foreach ($leads as $lead) {
    Csv::writeRow($out, [
        (string) ($lead['lead_id'] ?? ''),
        (string) ($lead['created_at'] ?? ''),
        (string) ($lead['name'] ?? ''),
        (string) ($lead['phone'] ?? ''),
        (string) ($lead['email'] ?? ''),
        (string) ($lead['comment'] ?? ''),
        (string) ($lead['referral_code'] ?? ''),
        (string) ($lead['utm_source'] ?? ''),
        (string) ($lead['utm_medium'] ?? ''),
        (string) ($lead['utm_campaign'] ?? ''),
        (string) ($lead['utm_content'] ?? ''),
        (string) ($lead['utm_term'] ?? ''),
        (string) ($lead['landing_url'] ?? ''),
        (string) ($lead['status'] ?? ''),
    ]);
}

fclose($out);
exit;
