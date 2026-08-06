<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/filters.php';
require_once dirname(__DIR__, 2) . '/lib/leads/Config.php';
require_once dirname(__DIR__, 2) . '/lib/leads/LeadRepository.php';
require_once dirname(__DIR__, 2) . '/lib/leads/SqliteLeadRepository.php';
require_once dirname(__DIR__, 2) . '/lib/leads/JsonlLeadRepository.php';
require_once dirname(__DIR__, 2) . '/lib/leads/LeadRepositoryFactory.php';

use MarketV11\LeadRepositoryFactory;
use function MarketV11Admin\filtersFromQuery;
use function MarketV11Admin\requireAuth;

requireAuth();

$filters = filtersFromQuery($_GET);
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 50;
$offset = ($page - 1) * $perPage;

$repository = LeadRepositoryFactory::make();
$leads = $repository->query($filters, $perPage, $offset);
$total = $repository->count($filters);
$totalPages = max(1, (int) ceil($total / $perPage));

function h(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function qs(array $overrides = []): string
{
    $params = array_merge($_GET, $overrides);
    $params = array_filter($params, static fn ($v) => $v !== '' && $v !== null);
    return http_build_query($params);
}

?><!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>Заявки — market.teravox.ru</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0b0f17; color: #f4f7fc; margin: 0; padding: 24px; }
    h1 { font-size: 1.4rem; margin: 0 0 4px; }
    .sub { color: rgba(244,247,252,.6); font-size: .85rem; margin: 0 0 20px; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; margin-bottom: 20px; background: #151c2b; border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: .75rem; color: rgba(244,247,252,.6); }
    .field input { padding: 9px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,.14); background: #0b0f17; color: #f4f7fc; min-height: 40px; font-size: .9rem; }
    .toolbar button, .toolbar a.btn { padding: 9px 16px; border-radius: 8px; border: 0; background: #4f8cff; color: #fff; font-weight: 600; cursor: pointer; text-decoration: none; font-size: .9rem; min-height: 40px; display: inline-flex; align-items: center; }
    .toolbar a.btn--ghost { background: transparent; border: 1px solid rgba(255,255,255,.18); color: #f4f7fc; }
    table { width: 100%; border-collapse: collapse; font-size: .85rem; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.08); vertical-align: top; }
    th { color: rgba(244,247,252,.6); font-weight: 600; position: sticky; top: 0; background: #0b0f17; }
    tr:hover td { background: rgba(255,255,255,.02); }
    .status { display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(79,140,255,.16); color: #4f8cff; font-size: .75rem; font-weight: 700; }
    .muted { color: rgba(244,247,252,.5); }
    .table-wrap { overflow-x: auto; border: 1px solid rgba(255,255,255,.08); border-radius: 12px; }
    .pagination { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
    .pagination a { color: #4f8cff; text-decoration: none; padding: 6px 10px; border: 1px solid rgba(255,255,255,.14); border-radius: 8px; font-size: .85rem; }
    .pagination .current { background: #4f8cff; color: #fff; }
    .top-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .top-actions a { color: rgba(244,247,252,.6); font-size: .85rem; text-decoration: none; }
  </style>
</head>
<body>
  <div class="top-actions">
    <div>
      <h1>Заявки</h1>
      <p class="sub">Всего: <?= (int) $total ?> · страница <?= (int) $page ?> из <?= (int) $totalPages ?></p>
    </div>
    <a href="/admin/leads/logout.php">Выйти</a>
  </div>

  <form class="toolbar" method="get" action="/admin/leads/">
    <div class="field">
      <label for="referral_code">Referral code</label>
      <input id="referral_code" name="referral_code" type="text" value="<?= h($_GET['referral_code'] ?? '') ?>" placeholder="roman">
    </div>
    <div class="field">
      <label for="date_from">С даты</label>
      <input id="date_from" name="date_from" type="date" value="<?= h($_GET['date_from'] ?? '') ?>">
    </div>
    <div class="field">
      <label for="date_to">По дату</label>
      <input id="date_to" name="date_to" type="date" value="<?= h($_GET['date_to'] ?? '') ?>">
    </div>
    <div class="field">
      <label for="search">Поиск (имя/телефон/email)</label>
      <input id="search" name="search" type="text" value="<?= h($_GET['search'] ?? '') ?>">
    </div>
    <button type="submit">Применить</button>
    <a class="btn btn--ghost" href="/admin/leads/">Сбросить</a>
    <a class="btn" href="/admin/leads/export.php?<?= h(qs()) ?>">Экспорт CSV</a>
  </form>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Дата</th>
          <th>Имя</th>
          <th>Телефон</th>
          <th>Email</th>
          <th>Referral</th>
          <th>UTM source</th>
          <th>Статус</th>
          <th>Страница</th>
        </tr>
      </thead>
      <tbody>
        <?php if ($leads === []): ?>
          <tr><td colspan="8" class="muted">Заявок не найдено.</td></tr>
        <?php endif; ?>
        <?php foreach ($leads as $lead): ?>
          <tr>
            <td><?= h($lead['created_at'] ?? '') ?></td>
            <td><?= h($lead['name'] ?? '') ?></td>
            <td><?= h($lead['phone'] ?? '') ?></td>
            <td><?= h($lead['email'] ?? '') ?></td>
            <td><?= $lead['referral_code'] !== '' ? h($lead['referral_code']) : '<span class="muted">—</span>' ?></td>
            <td><?= $lead['utm_source'] !== '' ? h($lead['utm_source']) : '<span class="muted">—</span>' ?></td>
            <td><span class="status"><?= h($lead['status'] ?? 'NEW') ?></span></td>
            <td class="muted"><?= h($lead['landing_url'] ?? '') ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>

  <?php if ($totalPages > 1): ?>
  <div class="pagination">
    <?php for ($p = 1; $p <= $totalPages; $p++): ?>
      <a class="<?= $p === $page ? 'current' : '' ?>" href="/admin/leads/?<?= h(qs(['page' => $p])) ?>"><?= (int) $p ?></a>
    <?php endfor; ?>
  </div>
  <?php endif; ?>
</body>
</html>
