<?php

declare(strict_types=1);

namespace MarketV11Admin;

/** @return array{referral_code?:string,date_from?:string,date_to?:string,search?:string} */
function filtersFromQuery(array $query): array
{
    $filters = [];

    $referral = trim((string) ($query['referral_code'] ?? ''));
    if ($referral !== '' && preg_match('/^[a-zA-Z0-9_-]{1,64}$/', $referral) === 1) {
        $filters['referral_code'] = $referral;
    }

    $dateFrom = trim((string) ($query['date_from'] ?? ''));
    if ($dateFrom !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom) === 1) {
        $filters['date_from'] = $dateFrom . 'T00:00:00+00:00';
    }

    $dateTo = trim((string) ($query['date_to'] ?? ''));
    if ($dateTo !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo) === 1) {
        $filters['date_to'] = $dateTo . 'T23:59:59+00:00';
    }

    $search = trim((string) ($query['search'] ?? ''));
    if ($search !== '') {
        $filters['search'] = substr($search, 0, 120);
    }

    return $filters;
}
