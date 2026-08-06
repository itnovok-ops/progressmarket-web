<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/components/layout.php';

$overview = DashboardData::globalOverview();

render_dashboard_layout_start('Overview', 'overview');
require __DIR__ . '/views/overview.php';
render_dashboard_layout_end();
