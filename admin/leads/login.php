<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once dirname(__DIR__, 2) . '/lib/leads/LeadRepositoryFactory.php';
require_once dirname(__DIR__, 2) . '/lib/leads/RateLimiter.php';

use MarketV11\RateLimiter;
use function MarketV11Admin\attemptLogin;
use function MarketV11Admin\isAuthenticated;
use function MarketV11Admin\startSecureSession;

startSecureSession();

$error = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $limiterKey = substr(hash('sha256', $ip), 0, 16);
    $limiter = new RateLimiter();
    if (!$limiter->allow($limiterKey, 5, 60)) {
        $error = 'Слишком много попыток входа. Подождите минуту.';
    } else {
        $username = (string) ($_POST['username'] ?? '');
        $password = (string) ($_POST['password'] ?? '');
        if (attemptLogin($username, $password)) {
            header('Location: /admin/leads/');
            exit;
        }
        $error = 'Неверный логин или пароль.';
    }
}

if (isAuthenticated()) {
    header('Location: /admin/leads/');
    exit;
}

?><!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>Вход — Заявки</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0b0f17; color: #f4f7fc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    form { background: #151c2b; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 32px; width: min(100%, 360px); }
    h1 { font-size: 1.25rem; margin: 0 0 20px; }
    label { display: block; font-size: .85rem; margin-bottom: 6px; color: rgba(244,247,252,.75); }
    input { width: 100%; box-sizing: border-box; padding: 12px; margin-bottom: 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,.14); background: #0b0f17; color: #f4f7fc; font-size: 1rem; min-height: 44px; }
    button { width: 100%; padding: 12px; border-radius: 10px; border: 0; background: #4f8cff; color: #fff; font-weight: 700; font-size: 1rem; cursor: pointer; min-height: 44px; }
    .error { color: #ff6b6b; font-size: .875rem; margin: -8px 0 16px; }
  </style>
</head>
<body>
  <form method="post" action="/admin/leads/login.php">
    <h1>Вход в заявки</h1>
    <?php if ($error !== ''): ?><p class="error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p><?php endif; ?>
    <label for="username">Логин</label>
    <input id="username" name="username" type="text" autocomplete="username" required autofocus>
    <label for="password">Пароль</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Войти</button>
  </form>
</body>
</html>
