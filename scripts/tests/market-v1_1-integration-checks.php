<?php
/**
 * Market V1.1 integration checks (non-network).
 * Run: php scripts/tests/market-v1_1-integration-checks.php
 */
declare(strict_types=1);

$root = dirname(__DIR__, 2);
$failed = 0;
$passed = 0;

function assert_true(bool $cond, string $label): void
{
    global $failed, $passed;
    if ($cond) {
        echo "OK  {$label}\n";
        $passed++;
    } else {
        echo "FAIL {$label}\n";
        $failed++;
    }
}

function assert_contains(string $haystack, string $needle, string $label): void
{
    assert_true(str_contains($haystack, $needle), $label);
}

function assert_not_contains(string $haystack, string $needle, string $label): void
{
    assert_true(!str_contains($haystack, $needle), $label);
}

// ── productionLock presence ──
$lock = $root . '/landing/runtime/productionLock.js';
assert_true(is_file($lock), 'landing/runtime/productionLock.js exists');
$lockSrc = (string) file_get_contents($lock);
assert_contains($lockSrc, 'export function assertBootPass', 'productionLock exports assertBootPass');

$importers = [
    'landing/components/leads.js',
    'landing/components/conversion.js',
    'landing/components/seo.js',
    'landing/components/tracking.js',
];
foreach ($importers as $rel) {
    $src = (string) file_get_contents($root . '/' . $rel);
    assert_contains($src, '../runtime/productionLock.js', "{$rel} imports tracked runtime lock");
    assert_not_contains($src, '../build/productionLock.js', "{$rel} does not import gitignored build lock");
}

// ── lifeos/index.html metadata ──
$lifeos = (string) file_get_contents($root . '/lifeos/index.html');
assert_contains($lifeos, '<title>', 'lifeos has title');
assert_contains($lifeos, 'name="description"', 'lifeos has meta description');
assert_contains($lifeos, 'rel="canonical" href="https://market.teravox.ru/lifeos/"', 'lifeos canonical');
assert_contains($lifeos, 'property="og:title"', 'lifeos og:title');
assert_contains($lifeos, 'property="og:description"', 'lifeos og:description');
assert_contains($lifeos, 'property="og:url"', 'lifeos og:url');
assert_contains($lifeos, 'property="og:type"', 'lifeos og:type');
assert_contains($lifeos, 'property="og:image"', 'lifeos og:image');
assert_contains($lifeos, 'name="twitter:card"', 'lifeos twitter:card');
assert_contains($lifeos, 'name="twitter:title"', 'lifeos twitter:title');
assert_contains($lifeos, 'name="twitter:description"', 'lifeos twitter:description');
assert_contains($lifeos, 'name="twitter:image"', 'lifeos twitter:image');
assert_contains($lifeos, '?v=2026.08.07.01', 'lifeos cache-bust query present');
assert_not_contains($lifeos, 'AggregateRating', 'lifeos has no fake AggregateRating');

$ogImageRel = 'landing/assets/images/03_system/13_system_wb_assortment_model-0373a402-c3c8-43b0-ad29-c8538af6d658.png';
assert_true(is_file($root . '/' . $ogImageRel), 'OG image asset exists on disk');

// ── legal URL path consistency ──
$legalFiles = [
    'offer.html',
    'privacy-policy.html',
    'personal-data-consent.html',
    'marketing-consent.html',
];
foreach ($legalFiles as $file) {
    $path = $root . '/' . $file;
    assert_true(is_file($path), "{$file} exists");
    $html = (string) file_get_contents($path);
    assert_contains($html, 'market.teravox.ru', "{$file} frames market.teravox.ru");
    assert_contains($html, 'rel="canonical" href="https://market.teravox.ru/' . $file . '"', "{$file} canonical self-URL");
    assert_not_contains($html, 'https://progress-market.ru', "{$file} has no https://progress-market.ru product URL");
    assert_not_contains($html, 'Progress Market', "{$file} has no Progress Market product framing");
    assert_not_contains($html, 'личный кабинет', "{$file} has no subscription-cabinet framing");
}

// ── robots.txt ──
$robots = (string) file_get_contents($root . '/robots.txt');
assert_contains($robots, 'Sitemap: https://market.teravox.ru/sitemap.xml', 'robots sitemap URL');
assert_contains($robots, 'Allow: /lifeos/', 'robots allows /lifeos/');
assert_contains($robots, 'Disallow: /admin/', 'robots disallows /admin/');
assert_contains($robots, 'Disallow: /api/', 'robots disallows /api/');
assert_contains($robots, 'Disallow: /storage/', 'robots disallows /storage/');
assert_not_contains($robots, 'progressmarket.ru', 'robots has no progressmarket.ru');
assert_not_contains($robots, 'progress-market.ru', 'robots has no progress-market.ru');

// ── sitemap.xml ──
$sitemap = (string) file_get_contents($root . '/sitemap.xml');
assert_true(@simplexml_load_string($sitemap) !== false, 'sitemap.xml parses as XML');
foreach ([
    'https://market.teravox.ru/lifeos/',
    'https://market.teravox.ru/offer.html',
    'https://market.teravox.ru/privacy-policy.html',
    'https://market.teravox.ru/personal-data-consent.html',
    'https://market.teravox.ru/marketing-consent.html',
] as $url) {
    assert_contains($sitemap, '<loc>' . $url . '</loc>', "sitemap includes {$url}");
}
assert_not_contains($sitemap, '/admin/', 'sitemap excludes /admin/');
assert_not_contains($sitemap, '/api/', 'sitemap excludes /api/');
assert_not_contains($sitemap, '/storage/', 'sitemap excludes /storage/');

// ── sticky CTA label ──
$content = (string) file_get_contents($root . '/landing/assets/data/content.js');
assert_contains($content, 'stickyCtaLabel: "Оставить заявку"', 'sticky CTA label matches form CTA');

$css = (string) file_get_contents($root . '/landing/styles/styles.css');
assert_contains($css, '.sticky-cta.is-visible', 'sticky CTA visibility rule present');
assert_contains($css, 'display: block !important', 'sticky CTA visible rule wins over later resets');

// ── sample config contract ──
$sample = (string) file_get_contents($root . '/config/market-v1_1.sample.php');
foreach ([
    'admin_password_hash',
    'ip_hash_salt',
    'storage_path',
    'allowed_origin',
    'environment',
    'rate_limit_max_requests',
    'password_hash(',
] as $needle) {
    assert_contains($sample, $needle, "sample config documents {$needle}");
}
assert_true(!is_file($root . '/config/market-v1_1.php'), 'real config/market-v1_1.php is not committed');

assert_true(is_file($root . '/config/.htaccess'), 'config/.htaccess exists');
assert_true(is_file($root . '/storage/leads/.htaccess'), 'storage/leads/.htaccess exists');
assert_true(is_file($root . '/lib/.htaccess'), 'lib/.htaccess exists');
assert_true(is_file($root . '/docs/MARKET_V1_1_DEPLOY.md'), 'deploy checklist exists');

echo "\nPassed: {$passed}\nFailed: {$failed}\n";
if ($failed > 0) {
    echo "INTEGRATION CHECKS FAILED\n";
    exit(1);
}
echo "ALL INTEGRATION CHECKS PASSED\n";
exit(0);
