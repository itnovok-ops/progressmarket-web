<?php
declare(strict_types=1);

return [
    'allowed_origins' => [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
    ],
    'default_landing_id' => 'wb-fbs-v1',
    'max_events_per_request' => 50,
    'max_payload_bytes' => 65536,
];
