<?php
declare(strict_types=1);

const DASHBOARD_PRO_ROOT = __DIR__;

require_once dirname(DASHBOARD_PRO_ROOT) . '/growth/bootstrap.php';

require_once DASHBOARD_PRO_ROOT . '/lib/DashboardData.php';

function dashboard_pro_asset(string $file): string
{
    return 'assets/' . ltrim($file, '/');
}

function dashboard_pro_escape(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function dashboard_pro_pct(float $ratio, int $decimals = 1): string
{
    return number_format($ratio * 100, $decimals) . '%';
}
