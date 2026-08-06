<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

use LifeOS\Growth\EventCollector;

$config = growth_config();
$landingId = trim((string) ($_GET['landing_id'] ?? ''));
$events = EventCollector::readEvents($landingId !== '' ? $landingId : null);

$byHour = [];
$byType = [];

foreach ($events as $event) {
    $ts = (int) ($event['timestamp'] ?? $event['received_at'] ?? time());
    $hour = gmdate('Y-m-d H:00', $ts);
    $byHour[$hour] = ($byHour[$hour] ?? 0) + 1;
    $type = (string) ($event['event_type'] ?? 'unknown');
    $byType[$type] = ($byType[$type] ?? 0) + 1;
}

ksort($byHour);
arsort($byType);

?><!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LifeOS Growth — Traffic</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#0b0f17;color:#fff;margin:0;padding:24px}
    h1{margin:0 0 8px;font-size:24px}
    .muted{color:rgba(255,255,255,.65)}
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
  <h1>Traffic</h1>
  <p class="muted">Events by hour<?= $landingId !== '' ? ' · ' . htmlspecialchars($landingId) : ' · all landings' ?></p>

  <h2>Events by type</h2>
  <table>
    <thead><tr><th>Type</th><th>Count</th></tr></thead>
    <tbody>
      <?php foreach ($byType as $type => $count): ?>
      <tr><td><?= htmlspecialchars((string) $type) ?></td><td><?= (int) $count ?></td></tr>
      <?php endforeach; ?>
    </tbody>
  </table>

  <h2>Events by hour (UTC)</h2>
  <table>
    <thead><tr><th>Hour</th><th>Events</th></tr></thead>
    <tbody>
      <?php foreach ($byHour as $hour => $count): ?>
      <tr><td><?= htmlspecialchars((string) $hour) ?></td><td><?= (int) $count ?></td></tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</body>
</html>
