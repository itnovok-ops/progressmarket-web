<?php
/**
 * Copy this file to market-v1_1.php (same directory) and fill in real values.
 * market-v1_1.php is gitignored — NEVER commit real credentials.
 *
 * See docs/LEAD_REFERRAL_V1.md for what each key controls.
 */
return [
    // 'auto' tries SQLite (pdo_sqlite) first and falls back to JSONL automatically.
    // Force 'sqlite' or 'jsonl' only if you need to pin the engine.
    'storage_engine' => 'auto',

    // Origin allowed to POST to the lead-intake endpoint (CORS).
    'allowed_origin' => 'https://market.teravox.ru',

    // Basic anti-spam tuning.
    'rate_limit_max_requests' => 8,
    'rate_limit_window_seconds' => 60,
    'min_submit_seconds' => 2,
    'max_request_bytes' => 20000,

    // Low-stakes pseudonymization salt for storing ip_hash instead of raw IPs.
    // Any random string is fine; it does not need to be memorized or rotated.
    'ip_hash_salt' => 'CHANGE_ME_RANDOM_STRING',

    // /admin/leads/ authentication — username + a password_hash() value, never a
    // plaintext password. Generate with: php -r "echo password_hash('yourpassword', PASSWORD_DEFAULT);"
    'admin_username' => 'roman',
    'admin_password_hash' => 'CHANGE_ME_PASSWORD_HASH',
];
