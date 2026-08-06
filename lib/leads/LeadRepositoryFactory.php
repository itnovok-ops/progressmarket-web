<?php
declare(strict_types=1);

namespace MarketV11;

final class LeadRepositoryFactory
{
    public static function make(): LeadRepository
    {
        $storageDir = self::storageDir();
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0770, true);
        }
        self::ensureProtected($storageDir);

        $engine = (string) Config::get('storage_engine', 'auto');

        if ($engine === 'jsonl') {
            return new JsonlLeadRepository($storageDir . '/leads.jsonl');
        }

        $sqliteAvailable = extension_loaded('pdo_sqlite') && in_array('sqlite', \PDO::getAvailableDrivers(), true);

        if (($engine === 'sqlite' || $engine === 'auto') && $sqliteAvailable) {
            try {
                return new SqliteLeadRepository($storageDir . '/leads.sqlite');
            } catch (\Throwable $e) {
                // Fall through to JSONL — a working fallback beats a hard failure on demo day.
                error_log('[market-v1.1] SQLite repository unavailable, falling back to JSONL: ' . $e->getMessage());
            }
        }

        return new JsonlLeadRepository($storageDir . '/leads.jsonl');
    }

    public static function storageDir(): string
    {
        return dirname(__DIR__, 2) . '/storage/leads';
    }

    private static function ensureProtected(string $dir): void
    {
        $htaccess = $dir . '/.htaccess';
        if (!is_file($htaccess)) {
            file_put_contents($htaccess, "Require all denied\nDeny from all\n");
        }
    }
}
