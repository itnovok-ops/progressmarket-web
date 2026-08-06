<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

use LifeOS\Growth\ConversionEngine;
use LifeOS\Growth\MetricsEngine;

$summary = MetricsEngine::globalSummary();
$funnel = ConversionEngine::funnel();
$top = $summary['top_landing'] ?? null;
$worstStep = $funnel['weakest_step'] ?? 'n/a';

?><!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LifeOS Growth — Summary</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#0b0f17;color:#fff;margin:0;padding:24px}
    h1{margin:0 0 8px;font-size:24px}
    .muted{color:rgba(255,255,255,.65)}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin:24px 0}
    .card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px}
    .value{font-size:28px;font-weight:700;margin-top:8px}
    nav a{color:#4f8cff;margin-right:16px;text-decoration:none}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{padding:10px;border-bottom:1px solid rgba(255,255,255,.08);text-align:left}
  </style>
</head>
<body>
  <nav>
    <a href="summary.php">Summary</a>
    <a href="landing_view.php">Landings</a>
    <a href="traffic_view.php">Traffic</a>
  </nav>
  <h1>Growth Intelligence</h1>
  <p class="muted">LifeOS central landing analytics</p>

  <div class="grid">
    <div class="card">
      <div class="muted">Total sessions</div>
      <div class="value"><?= (int) ($summary['total_sessions'] ?? 0) ?></div>
    </div>
    <div class="card">
      <div class="muted">Conversion rate</div>
      <div class="value"><?= number_format(((float) ($summary['conversion_rate'] ?? 0)) * 100, 2) ?>%</div>
    </div>
    <div class="card">
      <div class="muted">Top landing</div>
      <div class="value" style="font-size:18px"><?= htmlspecialchars((string) ($top['landing_id'] ?? '—')) ?></div>
    </div>
    <div class="card">
      <div class="muted">Worst funnel step</div>
      <div class="value" style="font-size:18px"><?= htmlspecialchars((string) $worstStep) ?></div>
    </div>
    <div class="card">
      <div class="muted">Video engagement</div>
      <div class="value"><?= number_format(((float) ($top['video_rate'] ?? 0)) * 100, 1) ?>%</div>
    </div>
  </div>

  <h2>Landings</h2>
  <table>
    <thead>
      <tr>
        <th>Landing</th>
        <th>Sessions</th>
        <th>CTR</th>
        <th>Video rate</th>
        <th>Conversion</th>
      </tr>
    </thead>
    <tbody>
      <?php foreach (($summary['landings'] ?? []) as $id => $metrics): ?>
      <tr>
        <td><a href="landing_view.php?landing_id=<?= urlencode((string) $id) ?>" style="color:#4f8cff"><?= htmlspecialchars((string) $id) ?></a></td>
        <td><?= (int) ($metrics['sessions'] ?? 0) ?></td>
        <td><?= number_format(((float) ($metrics['ctr'] ?? 0)) * 100, 2) ?>%</td>
        <td><?= number_format(((float) ($metrics['video_rate'] ?? 0)) * 100, 1) ?>%</td>
        <td><?= number_format(((float) ($metrics['conversion_rate'] ?? 0)) * 100, 2) ?>%</td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</body>
</html>
