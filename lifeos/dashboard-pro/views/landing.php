<?php
declare(strict_types=1);

/** @var array<string, mixed> $detail */
require_once dirname(__DIR__) . '/components/MetricsWidget.php';
require_once dirname(__DIR__) . '/components/FunnelWidget.php';
require_once dirname(__DIR__) . '/components/IntentWidget.php';

if (empty($detail['ok'])) {
    echo '<div class="dp-empty">Landing not found.</div>';
    return;
}

$landingId = (string) ($detail['landing_id'] ?? '');
$landing = is_array($detail['landing'] ?? null) ? $detail['landing'] : [];
$metrics = is_array($detail['metrics'] ?? null) ? $detail['metrics'] : [];
$card = is_array($detail['card'] ?? null) ? $detail['card'] : [];
$heatmap = is_array($detail['heatmap_summary'] ?? null) ? $detail['heatmap_summary'] : [];
?>
<header class="dp-page-head">
  <div>
    <p class="dp-eyebrow"><a class="dp-link" href="index.php">← Overview</a></p>
    <h1 class="dp-page-title"><?= dashboard_pro_escape((string) ($landing['name'] ?? $landingId)) ?></h1>
    <p class="dp-muted"><?= dashboard_pro_escape($landingId) ?> · v<?= dashboard_pro_escape((string) ($landing['version'] ?? '—')) ?></p>
  </div>
  <div class="dp-score dp-score--<?= ((int) ($card['performance_score'] ?? 0)) >= 70 ? 'high' : 'mid' ?>">
    <?= (int) ($card['performance_score'] ?? 0) ?>
  </div>
</header>

<?php
render_metrics_widget('Landing metrics', [
    ['label' => 'Sessions', 'value' => (string) (int) ($metrics['sessions'] ?? 0)],
    ['label' => 'CTR', 'value' => dashboard_pro_pct((float) ($metrics['ctr'] ?? 0), 2)],
    ['label' => 'Video engagement', 'value' => dashboard_pro_pct((float) ($metrics['video_rate'] ?? 0), 1)],
    ['label' => 'Conversion rate', 'value' => dashboard_pro_pct((float) ($metrics['conversion_rate'] ?? 0), 2)],
    ['label' => 'Scroll depth avg', 'value' => dashboard_pro_pct((float) ($metrics['scroll_depth_avg'] ?? 0), 1)],
    ['label' => 'Drop-off rate', 'value' => dashboard_pro_pct((float) ($metrics['drop_off_rate'] ?? 0), 1)],
]);
?>

<div class="dp-grid-2">
  <?php render_funnel_widget(is_array($detail['funnel'] ?? null) ? $detail['funnel'] : []); ?>
  <?php render_intent_widget(is_array($detail['intent'] ?? null) ? $detail['intent'] : []); ?>
</div>

<section class="dp-widget">
  <header class="dp-widget__head">
    <h2 class="dp-widget__title">Heatmap summary</h2>
    <p class="dp-muted"><?= dashboard_pro_escape((string) ($heatmap['summary'] ?? 'No scroll data yet.')) ?></p>
  </header>
  <?php if (!empty($heatmap['zone_percent'])): ?>
  <div class="dp-heatmap-zones">
    <?php foreach (($heatmap['zone_percent'] ?? []) as $zone => $pct): ?>
    <div class="dp-heatmap-zone">
      <span class="dp-muted"><?= dashboard_pro_escape((string) $zone) ?></span>
      <div class="dp-intent-bar-wrap"><div class="dp-intent-bar dp-intent-bar--medium" style="width: <?= max(2, (int) round((float) $pct * 100)) ?>%"></div></div>
      <span><?= dashboard_pro_pct((float) $pct) ?></span>
    </div>
    <?php endforeach; ?>
  </div>
  <?php endif; ?>
</section>

<section class="dp-widget">
  <header class="dp-widget__head">
    <h2 class="dp-widget__title">Conversion timeline</h2>
  </header>
  <?php if (empty($detail['conversion_timeline'])): ?>
  <p class="dp-muted">No conversions recorded yet.</p>
  <?php else: ?>
  <table class="dp-table">
    <thead><tr><th>Date</th><th>Conversions</th></tr></thead>
    <tbody>
      <?php foreach ($detail['conversion_timeline'] as $row): ?>
      <tr>
        <td><?= dashboard_pro_escape((string) ($row['date'] ?? '')) ?></td>
        <td><?= (int) ($row['conversions'] ?? 0) ?></td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
  <?php endif; ?>
</section>

<section class="dp-widget">
  <header class="dp-widget__head">
    <h2 class="dp-widget__title">Event timeline</h2>
    <p class="dp-muted">Latest 200 events</p>
  </header>
  <div class="dp-timeline" id="dp-event-timeline">
    <?php foreach (($detail['timeline'] ?? []) as $event): ?>
    <div class="dp-timeline__item">
      <time><?= dashboard_pro_escape((string) ($event['time'] ?? '')) ?></time>
      <span class="dp-timeline__type"><?= dashboard_pro_escape((string) ($event['event_type'] ?? '')) ?></span>
      <span class="dp-muted"><?= dashboard_pro_escape(substr((string) ($event['session_id'] ?? ''), 0, 12)) ?></span>
    </div>
    <?php endforeach; ?>
    <?php if (empty($detail['timeline'])): ?>
    <p class="dp-muted">No events yet.</p>
    <?php endif; ?>
  </div>
</section>

<section class="dp-widget">
  <header class="dp-widget__head">
    <h2 class="dp-widget__title">Session behavior</h2>
  </header>
  <div class="dp-session-list">
    <?php foreach (($detail['session_behaviors'] ?? []) as $session): ?>
    <?php
      $intent = is_array($session['intent'] ?? null) ? $session['intent'] : [];
      $level = strtolower((string) ($intent['level'] ?? 'low'));
    ?>
    <details class="dp-session">
      <summary>
        <span class="dp-intent-tag dp-intent-tag--<?= dashboard_pro_escape($level) ?>"><?= dashboard_pro_escape(strtoupper($level)) ?></span>
        <span><?= dashboard_pro_escape(substr((string) ($session['session_id'] ?? ''), 0, 16)) ?></span>
        <span class="dp-muted">score <?= (int) ($intent['intent_score'] ?? 0) ?> · <?= count($session['events'] ?? []) ?> events</span>
      </summary>
      <ul class="dp-session-events">
        <?php foreach (($session['events'] ?? []) as $ev): ?>
        <li><code><?= dashboard_pro_escape((string) ($ev['event_type'] ?? '')) ?></code></li>
        <?php endforeach; ?>
      </ul>
    </details>
    <?php endforeach; ?>
  </div>
</section>
