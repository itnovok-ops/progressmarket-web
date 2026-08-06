<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

use LifeOS\Growth\ConversionEngine;
use LifeOS\Growth\EventCollector;
use LifeOS\Growth\IntentEngine;
use LifeOS\Growth\LandingRegistry;
use LifeOS\Growth\MetricsEngine;

$config = growth_config();
$landingId = trim((string) ($_GET['landing_id'] ?? ($config['default_landing_id'] ?? 'wb-fbs-v1')));
$landing = LandingRegistry::find($landingId);
$metrics = MetricsEngine::forLanding($landingId);
$intent = IntentEngine::summarize(EventCollector::readEvents($landingId), $landingId);
$funnel = ConversionEngine::funnel($landingId);

?><!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LifeOS Growth — <?= htmlspecialchars($landingId) ?></title>
  <style>
    body{font-family:system-ui,sans-serif;background:#0b0f17;color:#fff;margin:0;padding:24px}
    h1{margin:0 0 8px;font-size:24px}
    .muted{color:rgba(255,255,255,.65)}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin:20px 0}
    .card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px}
    .value{font-size:24px;font-weight:700;margin-top:8px}
    nav a{color:#4f8cff;margin-right:16px;text-decoration:none}
    ul{line-height:1.8}
  </style>
</head>
<body>
  <nav>
    <a href="summary.php">Summary</a>
    <a href="landing_view.php">Landings</a>
    <a href="traffic_view.php">Traffic</a>
  </nav>
  <h1><?= htmlspecialchars((string) ($landing['name'] ?? $landingId)) ?></h1>
  <p class="muted">landing_id: <?= htmlspecialchars($landingId) ?> · version <?= htmlspecialchars((string) ($landing['version'] ?? '—')) ?></p>

  <div class="grid">
    <div class="card"><div class="muted">Sessions</div><div class="value"><?= (int) ($metrics['sessions'] ?? 0) ?></div></div>
    <div class="card"><div class="muted">CTR</div><div class="value"><?= number_format(((float) ($metrics['ctr'] ?? 0)) * 100, 2) ?>%</div></div>
    <div class="card"><div class="muted">Video rate</div><div class="value"><?= number_format(((float) ($metrics['video_rate'] ?? 0)) * 100, 1) ?>%</div></div>
    <div class="card"><div class="muted">Conversion</div><div class="value"><?= number_format(((float) ($metrics['conversion_rate'] ?? 0)) * 100, 2) ?>%</div></div>
    <div class="card"><div class="muted">Scroll depth avg</div><div class="value"><?= number_format(((float) ($metrics['scroll_depth_avg'] ?? 0)) * 100, 1) ?>%</div></div>
    <div class="card"><div class="muted">Drop-off</div><div class="value"><?= number_format(((float) ($metrics['drop_off_rate'] ?? 0)) * 100, 1) ?>%</div></div>
  </div>

  <h2>Intent summary</h2>
  <ul>
    <li>LOW: <?= (int) ($intent['low'] ?? 0) ?></li>
    <li>MEDIUM: <?= (int) ($intent['medium'] ?? 0) ?></li>
    <li>HIGH: <?= (int) ($intent['high'] ?? 0) ?></li>
    <li>Average score: <?= number_format((float) ($intent['average_score'] ?? 0), 1) ?></li>
  </ul>

  <h2>Conversion funnel</h2>
  <ul>
    <?php foreach (($funnel['stages'] ?? []) as $stage => $count): ?>
    <li><?= htmlspecialchars((string) $stage) ?>: <?= (int) $count ?> (<?= number_format(((float) (($funnel['rates'][$stage] ?? 0))) * 100, 1) ?>%)</li>
    <?php endforeach; ?>
  </ul>
  <p class="muted">Weakest step: <strong><?= htmlspecialchars((string) ($funnel['weakest_step'] ?? 'n/a')) ?></strong></p>
</body>
</html>
