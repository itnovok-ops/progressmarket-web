<?php
/**
 * Market V1.1 production config SAMPLE.
 *
 * SETUP ON SERVER (never commit the real file):
 *   1. cp config/market-v1_1.sample.php config/market-v1_1.php
 *   2. Edit config/market-v1_1.php — replace every CHANGE_ME_* value
 *   3. Restrict file permissions: chmod 640 config/market-v1_1.php
 *
 * Generate admin password hash (run locally or on the server):
 *   php -r "echo password_hash('YOUR_STRONG_PASSWORD_HERE', PASSWORD_DEFAULT), PHP_EOL;"
 *
 * Generate ip_hash_salt (any long random string):
 *   php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
 *
 * Real config/market-v1_1.php is gitignored. NEVER commit secrets.
 *
 * Access controls (must remain in place after deploy):
 *   - config/.htaccess          → Deny from all
 *   - storage/leads/.htaccess   → Deny from all
 *   - lib/.htaccess             → Deny from all
 *
 * Default on-disk storage root (created at runtime, not configured as a secret):
 *   <docroot>/storage/leads/
 *     leads.sqlite   (preferred when pdo_sqlite is available)
 *     leads.jsonl    (automatic fallback)
 *     rate_limit.json
 *
 * See also: docs/LEAD_REFERRAL_V1.md, docs/MARKET_V1_1_DEPLOY.md
 */
return [
    // Environment indicator for ops/smoke checks. Does not enable debug output by itself.
    // Allowed values: 'production' | 'staging' | 'local'
    'environment' => 'production',

    // 'auto' tries SQLite (pdo_sqlite) first and falls back to JSONL automatically.
    // Force 'sqlite' or 'jsonl' only if you need to pin the engine.
    'storage_engine' => 'auto',

    // Absolute or docroot-relative storage directory for lead DB / JSONL.
    // Leave empty to use the default: <repo>/storage/leads
    // Example absolute path on Beget (adjust to your account):
    // '/home/USER/market.teravox.ru/storage/leads'
    'storage_path' => '',

    // Origin allowed to POST to /api/v1/lead-intake.php (CORS). Exact match only.
    'allowed_origin' => 'https://market.teravox.ru',

    // Basic anti-spam / abuse tuning for lead intake.
    'rate_limit_max_requests' => 8,
    'rate_limit_window_seconds' => 60,
    'min_submit_seconds' => 2,
    'max_request_bytes' => 20000,

    // Pseudonymization salt for storing ip_hash instead of raw IPs.
    // Required in production. Generate with the php -r command above.
    'ip_hash_salt' => 'CHANGE_ME_RANDOM_STRING',

    // /admin/leads/ authentication — username + password_hash() value, never plaintext.
    'admin_username' => 'roman',
    'admin_password_hash' => 'CHANGE_ME_PASSWORD_HASH',
];
