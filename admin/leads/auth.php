<?php

declare(strict_types=1);

namespace MarketV11Admin;

require_once dirname(__DIR__, 2) . '/lib/leads/Config.php';

use MarketV11\Config;

function startSecureSession(): void
{
    if (session_status() === \PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/admin/leads/',
            'secure' => (($_SERVER['HTTPS'] ?? '') !== '' && ($_SERVER['HTTPS'] ?? '') !== 'off'),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_name('pm_admin_sess');
        session_start();
    }
}

function isAuthenticated(): bool
{
    startSecureSession();
    return !empty($_SESSION['admin_authenticated']) && $_SESSION['admin_authenticated'] === true;
}

function attemptLogin(string $username, string $password): bool
{
    $expectedUser = (string) Config::get('admin_username', '');
    $expectedHash = (string) Config::get('admin_password_hash', '');

    if ($expectedUser === '' || $expectedHash === '' || $username === '' || $password === '') {
        return false;
    }
    if (!hash_equals($expectedUser, $username)) {
        // Still run password_verify against something to reduce username-enumeration timing signal.
        password_verify($password, '$2y$10$abcdefghijklmnopqrstuuOZJlZ8N8x0V1v6b1b1b1b1b1b1b1b1b');
        return false;
    }
    if (!password_verify($password, $expectedHash)) {
        return false;
    }

    startSecureSession();
    session_regenerate_id(true);
    $_SESSION['admin_authenticated'] = true;
    $_SESSION['admin_username'] = $username;
    return true;
}

function requireAuth(): void
{
    if (!isAuthenticated()) {
        header('Location: /admin/leads/login.php');
        exit;
    }
}

function logoutAdmin(): void
{
    startSecureSession();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
}
