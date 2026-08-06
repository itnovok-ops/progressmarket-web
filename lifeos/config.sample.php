<?php
declare(strict_types=1);

/**
 * Copy to lifeos/config.php on the server (do not commit secrets).
 */
return [
    'allowed_origins' => [
        'https://market.teravox.ru',
        'https://www.market.teravox.ru',
        'http://market.teravox.ru',
        'http://www.market.teravox.ru',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
    ],

    'managers' => [
        ['id' => 'mgr_01', 'name' => 'Manager Alpha', 'pool' => 'dropshipping'],
        ['id' => 'mgr_02', 'name' => 'Manager Beta', 'pool' => 'dropshipping'],
        ['id' => 'mgr_03', 'name' => 'Manager Gamma', 'pool' => 'general'],
    ],

    'routing_pools' => [
        'dropshipping' => ['pool' => 'dropshipping', 'sla_hours' => 24],
        'nika_audit' => ['pool' => 'general', 'sla_hours' => 12],
        'abc_photo' => ['pool' => 'general', 'sla_hours' => 24],
    ],

    'allowed_project_types' => ['dropshipping', 'nika_audit', 'abc_photo'],
    'allowed_sources' => ['landing', 'telegram', 'vk', 'ads'],
];
