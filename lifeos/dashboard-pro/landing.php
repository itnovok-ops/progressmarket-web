<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/components/layout.php';

$landingId = trim((string) ($_GET['id'] ?? $_GET['landing_id'] ?? ''));
if ($landingId === '') {
    $config = growth_config();
    $landingId = (string) ($config['default_landing_id'] ?? 'wb-fbs-v1');
}

$detail = DashboardData::landingDetail($landingId);

render_dashboard_layout_start('Landing · ' . $landingId, 'overview');
require __DIR__ . '/views/landing.php';
render_dashboard_layout_end();
