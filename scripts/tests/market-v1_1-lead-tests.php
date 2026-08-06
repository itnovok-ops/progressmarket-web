<?php

declare(strict_types=1);

/**
 * Targeted PHP tests for the V1.1 lead-intake stack (task market-v1.1-production-readiness).
 * Self-contained: does not touch config/market-v1_1.php, does not require a running
 * web server, writes only to a throwaway temp directory. Safe to run repeatedly.
 *
 * Run with: php scripts/tests/market-v1_1-lead-tests.php
 *
 * Covers (see reports/market-v1.1-implementation.md §19 for the full picture,
 * including the scenarios that need a real browser and are NOT covered here):
 *   - lead valid / invalid
 *   - lead persistence (SQLite + JSONL)
 *   - ref=roman capture + invalid referral rejection
 *   - UTM capture
 *   - referral/date/search filters
 *   - CSV formula-injection escaping
 *   - rate limiter allow/deny
 */

$root = dirname(__DIR__, 2);
require $root . '/lib/leads/Config.php';
require $root . '/lib/leads/Lead.php';
require $root . '/lib/leads/LeadRepository.php';
require $root . '/lib/leads/SqliteLeadRepository.php';
require $root . '/lib/leads/JsonlLeadRepository.php';
require $root . '/lib/leads/RateLimiter.php';
require $root . '/lib/leads/Csv.php';

use MarketV11\Csv;
use MarketV11\JsonlLeadRepository;
use MarketV11\Lead;
use MarketV11\RateLimiter;
use MarketV11\SqliteLeadRepository;

$failures = 0;
function check(bool $cond, string $label): void
{
    global $failures;
    if ($cond) {
        echo "OK   $label\n";
    } else {
        echo "FAIL $label\n";
        $failures++;
    }
}

// --- 1/2. lead valid / invalid -----------------------------------------------
$valid = Lead::fromInput(
    ['name' => 'Иван', 'phone' => '+79991234567', 'referral_code' => 'roman', 'utm_source' => 'vk'],
    'iphash1',
    'ua'
);
check($valid['errors'] === [], 'valid lead passes validation');
check($valid['lead']['referral_code'] === 'roman', 'ref=roman captured on valid lead');
check($valid['lead']['utm_source'] === 'vk', 'utm_source captured');

$invalid = Lead::fromInput(['name' => '', 'phone' => '', 'email' => ''], 'iphash2', 'ua');
check(in_array('name_required', $invalid['errors'], true), 'invalid lead: name_required flagged');
check(in_array('contact_required', $invalid['errors'], true), 'invalid lead: contact_required flagged');

// --- 7. invalid referral rejected server-side --------------------------------
$badRef = Lead::fromInput(['name' => 'X', 'phone' => '+79991234567', 'referral_code' => 'bad ref!! <script>'], 'iphash3', 'ua');
check($badRef['lead']['referral_code'] === '', 'malformed referral_code is rejected, not stored');

$longRef = Lead::fromInput(['name' => 'X', 'phone' => '+79991234567', 'referral_code' => str_repeat('a', 65)], 'iphash4', 'ua');
check($longRef['lead']['referral_code'] === '', 'referral_code over 64 chars is rejected');

// --- 3/6. persistence: SQLite ------------------------------------------------
$tmpDir = sys_get_temp_dir() . '/mv11-test-' . bin2hex(random_bytes(4));
mkdir($tmpDir);
$sqlitePath = $tmpDir . '/leads.sqlite';
$sqliteRepo = new SqliteLeadRepository($sqlitePath);
$sqliteRepo->insert($valid['lead']);
$sqliteRepo->insert(Lead::fromInput(['name' => 'Пётр', 'phone' => '+79997654321'], 'iphash5', 'ua')['lead']);
check($sqliteRepo->count([]) === 2, 'sqlite: 2 leads persisted');
check(count($sqliteRepo->query(['referral_code' => 'roman'], 10, 0)) === 1, 'sqlite: referral filter returns 1');
check(count($sqliteRepo->query(['referral_code' => 'nobody'], 10, 0)) === 0, 'sqlite: unknown referral returns 0');
check(count($sqliteRepo->query(['search' => 'Пётр'], 10, 0)) === 1, 'sqlite: search filter matches');

// --- 3/6. persistence: JSONL --------------------------------------------------
$jsonlPath = $tmpDir . '/leads.jsonl';
$jsonlRepo = new JsonlLeadRepository($jsonlPath);
$jsonlRepo->insert($valid['lead']);
check($jsonlRepo->count([]) === 1, 'jsonl: 1 lead persisted');
check(count($jsonlRepo->query(['referral_code' => 'roman'], 10, 0)) === 1, 'jsonl: referral filter returns 1');
check(is_file($jsonlPath), 'jsonl: storage file created');

// --- CSV formula-injection escaping ------------------------------------------
check(Csv::sanitizeField('=cmd|calc') === "'=cmd|calc", 'csv: leading = is escaped');
check(Csv::sanitizeField('+79991234567') === "'+79991234567", 'csv: leading + is escaped');
check(Csv::sanitizeField('-1+1') === "'-1+1", 'csv: leading - is escaped');
check(Csv::sanitizeField('@mention') === "'@mention", 'csv: leading @ is escaped');
check(Csv::sanitizeField('Иван Тестов') === 'Иван Тестов', 'csv: normal text untouched');

// --- Rate limiter ------------------------------------------------------------
$rlDir = $tmpDir . '/ratelimit';
$limiter = new RateLimiter($rlDir);
$allowedCount = 0;
for ($i = 0; $i < 5; $i++) {
    if ($limiter->allow('testip', 3, 60)) {
        $allowedCount++;
    }
}
check($allowedCount === 3, 'rate limiter: allows exactly max_requests within window (got ' . $allowedCount . ')');

// --- cleanup ------------------------------------------------------------------
$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($tmpDir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
foreach ($it as $file) {
    $file->isDir() ? rmdir((string) $file) : unlink((string) $file);
}
rmdir($tmpDir);

echo "\n" . ($failures === 0 ? "ALL TESTS PASSED" : "$failures TEST(S) FAILED") . "\n";
exit($failures === 0 ? 0 : 1);
