<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/components/layout.php';

$traffic = DashboardData::trafficStats();

render_dashboard_layout_start('Traffic', 'traffic');
require __DIR__ . '/views/traffic.php';
render_dashboard_layout_end();
