<?php
declare(strict_types=1);

const LIFEOS_ROOT = __DIR__;

spl_autoload_register(static function (string $class): void {
    $prefix = 'LifeOS\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }
    $relative = str_replace('\\', DIRECTORY_SEPARATOR, substr($class, strlen($prefix)));
    $path = LIFEOS_ROOT . '/src/' . $relative . '.php';
    if (is_readable($path)) {
        require_once $path;
    }
});

/**
 * @return array<string, mixed>
 */
function lifeos_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $path = LIFEOS_ROOT . '/config.php';
    if (!is_readable($path)) {
        $path = LIFEOS_ROOT . '/config.sample.php';
    }
    $loaded = require $path;
    $config = is_array($loaded) ? $loaded : [];

    return $config;
}

function lifeos_storage_path(string $relative = ''): string
{
    $base = LIFEOS_ROOT . '/storage';
    if (!is_dir($base)) {
        @mkdir($base, 0755, true);
    }
    foreach (['crm', 'logs', 'state'] as $dir) {
        $full = $base . '/' . $dir;
        if (!is_dir($full)) {
            @mkdir($full, 0755, true);
        }
    }

    return $relative === '' ? $base : $base . '/' . ltrim($relative, '/');
}
