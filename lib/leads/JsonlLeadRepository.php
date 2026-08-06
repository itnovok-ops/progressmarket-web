<?php
declare(strict_types=1);

namespace MarketV11;

/**
 * Append-only JSONL storage with file locking. Used automatically when pdo_sqlite
 * isn't available on the host (see LeadRepositoryFactory).
 */
final class JsonlLeadRepository implements LeadRepository
{
    private string $path;

    public function __construct(string $path)
    {
        $this->path = $path;
        if (!is_file($this->path)) {
            touch($this->path);
            chmod($this->path, 0660);
        }
    }

    public function insert(array $lead): void
    {
        $line = json_encode($lead, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($line === false) {
            throw new \RuntimeException('Failed to encode lead as JSON.');
        }

        $handle = fopen($this->path, 'ab');
        if ($handle === false) {
            throw new \RuntimeException('Failed to open lead storage for writing.');
        }
        try {
            if (!flock($handle, LOCK_EX)) {
                throw new \RuntimeException('Failed to lock lead storage for writing.');
            }
            fwrite($handle, $line . "\n");
            fflush($handle);
            flock($handle, LOCK_UN);
        } finally {
            fclose($handle);
        }
    }

    /** @return array<int,array<string,mixed>> */
    private function readAll(): array
    {
        if (!is_file($this->path)) {
            return [];
        }
        $handle = fopen($this->path, 'rb');
        if ($handle === false) {
            return [];
        }
        $rows = [];
        try {
            flock($handle, LOCK_SH);
            while (($line = fgets($handle)) !== false) {
                $line = trim($line);
                if ($line === '') {
                    continue;
                }
                $decoded = json_decode($line, true);
                if (is_array($decoded)) {
                    $rows[] = $decoded;
                }
            }
            flock($handle, LOCK_UN);
        } finally {
            fclose($handle);
        }
        return $rows;
    }

    /** @return array<int,array<string,mixed>> */
    private function filtered(array $filters): array
    {
        $rows = $this->readAll();

        if (!empty($filters['referral_code'])) {
            $ref = (string) $filters['referral_code'];
            $rows = array_values(array_filter($rows, static fn ($r) => ($r['referral_code'] ?? '') === $ref));
        }
        if (!empty($filters['date_from'])) {
            $from = (string) $filters['date_from'];
            $rows = array_values(array_filter($rows, static fn ($r) => ($r['created_at'] ?? '') >= $from));
        }
        if (!empty($filters['date_to'])) {
            $to = (string) $filters['date_to'];
            $rows = array_values(array_filter($rows, static fn ($r) => ($r['created_at'] ?? '') <= $to));
        }
        if (!empty($filters['search'])) {
            $lower = function_exists('mb_strtolower')
                ? static fn (string $s) => mb_strtolower($s)
                : static fn (string $s) => strtolower($s);
            $needle = $lower((string) $filters['search']);
            $rows = array_values(array_filter($rows, static function ($r) use ($needle, $lower) {
                $haystack = $lower(($r['name'] ?? '') . ' ' . ($r['phone'] ?? '') . ' ' . ($r['email'] ?? ''));
                return $needle !== '' && str_contains($haystack, $needle);
            }));
        }

        usort($rows, static fn ($a, $b) => strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? '')));

        return $rows;
    }

    public function query(array $filters, int $limit, int $offset): array
    {
        $rows = $this->filtered($filters);
        return array_slice($rows, $offset, $limit);
    }

    public function count(array $filters): int
    {
        return count($this->filtered($filters));
    }
}
