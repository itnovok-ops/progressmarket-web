<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';

use function MarketV11Admin\logoutAdmin;

logoutAdmin();
header('Location: /admin/leads/login.php');
exit;
