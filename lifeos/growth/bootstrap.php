<?php
declare(strict_types=1);

const GROWTH_ROOT = __DIR__;

require_once dirname(GROWTH_ROOT) . '/bootstrap.php';

spl_autoload_register(static function (string $class): void {
    $prefix = 'LifeOS\\Growth\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }
    $relative = str_replace('\\', DIRECTORY_SEPARATOR, substr($class, strlen($prefix)));
    $path = GROWTH_ROOT . '/core/' . $relative . '.php';
    if (is_readable($path)) {
        require_once $path;
    }
});

/**
 * @return array<string, mixed>
 */
function growth_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $path = GROWTH_ROOT . '/config.php';
    if (!is_readable($path)) {
        $path = GROWTH_ROOT . '/config.sample.php';
    }
    $loaded = require $path;
    $config = is_array($loaded) ? $loaded : [];

    return $config;
}

function growth_storage_path(string $relative = ''): string
{
    $base = GROWTH_ROOT . '/storage';
    if (!is_dir($base)) {
        @mkdir($base, 0755, true);
    }

    return $relative === '' ? $base : $base . '/' . ltrim($relative, '/');
}
