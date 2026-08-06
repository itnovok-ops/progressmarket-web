<?php
declare(strict_types=1);

namespace MarketV11;

/**
 * Storage abstraction — the frontend/endpoint never knows how/where leads are
 * physically stored. Extension point for a future GoogleSheetsLeadRepository /
 * PostgresLeadRepository (see docs/LEAD_REFERRAL_V1.md §migration).
 */
interface LeadRepository
{
    /** @param array<string,mixed> $lead */
    public function insert(array $lead): void;

    /**
     * @param array{referral_code?:string,date_from?:string,date_to?:string,search?:string} $filters
     * @return array<int,array<string,mixed>>
     */
    public function query(array $filters, int $limit, int $offset): array;

    /** @param array{referral_code?:string,date_from?:string,date_to?:string,search?:string} $filters */
    public function count(array $filters): int;
}
