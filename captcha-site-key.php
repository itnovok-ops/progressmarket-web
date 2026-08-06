<?php
declare(strict_types=1);

/**
 * Отдаёт ключ клиента SmartCaptcha для страницы (публичное значение).
 * Ключ хранится в lead-config.php рядом с серверным — не в index.html.
 */

header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: public, max-age=300');

$configPath = __DIR__ . '/lead-config.php';
$siteKey = '';

if (is_readable($configPath)) {
    $config = require $configPath;
    if (is_array($config)) {
        $siteKey = trim((string)($config['smartcaptcha_client_key'] ?? ''));
        $serverKey = trim((string)($config['smartcaptcha_server_key'] ?? ''));
        // На сайт только ключ клиента (ysc1_…), не серверный (ysc2_…).
        if ($siteKey === '' || str_starts_with($siteKey, 'ysc2_') || $siteKey === $serverKey) {
            $siteKey = '';
        }
    }
}

echo 'window.PM_SMARTCAPTCHA_SITE_KEY = ' . json_encode($siteKey, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';';
