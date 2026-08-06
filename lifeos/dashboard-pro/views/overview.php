<?php
declare(strict_types=1);

/** @var array<string, mixed> $overview */
require_once dirname(__DIR__) . '/components/MetricsWidget.php';
require_once dirname(__DIR__) . '/components/LandingCard.php';
require_once dirname(__DIR__) . '/components/FunnelWidget.php';
require_once dirname(__DIR__) . '/components/IntentWidget.php';

$best = is_array($overview['best_landing'] ?? null) ? $overview['best_landing'] : null;
$worst = is_array($overview['worst_landing'] ?? null) ? $overview['worst_landing'] : null;
?>
<header class="dp-page-head">
  <div>
    <p class="dp-eyebrow">Global Growth Control Center</p>
    <h1 class="dp-page-title">Overview</h1>
    <p class="dp-muted">All landings · unified analytics layer</p>
  </div>
  <div class="dp-page-actions">
    <button type="button" class="dp-btn dp-btn--ghost" id="dp-refresh-btn">Refresh</button>
  </div>
</header>

<?php
render_metrics_widget('Global KPIs', [
    ['label' => 'Total sessions', 'value' => (string) (int) ($overview['total_sessions'] ?? 0)],
    ['label' => 'Total conversions', 'value' => (string) (int) ($overview['total_conversions'] ?? 0)],
    ['label' => 'Avg CTR', 'value' => dashboard_pro_pct((float) ($overview['average_ctr'] ?? 0), 2)],
    ['label' => 'Avg video engagement', 'value' => dashboard_pro_pct((float) ($overview['average_video_engagement'] ?? 0), 1)],
    [
        'label' => 'Best landing',
        'value' => $best ? (string) ($best['landing_id'] ?? '—') : '—',
        'hint' => $best ? 'Score ' . (int) ($best['performance_score'] ?? 0) : 'No data',
    ],
    [
        'label' => 'Worst landing',
        'value' => $worst ? (string) ($worst['landing_id'] ?? '—') : '—',
        'hint' => $worst ? 'Score ' . (int) ($worst['performance_score'] ?? 0) : 'No data',
    ],
]);
?>

<div class="dp-grid-2">
  <?php render_funnel_widget(is_array($overview['funnel'] ?? null) ? $overview['funnel'] : [], 'Global funnel'); ?>
  <?php render_intent_widget(is_array($overview['intent'] ?? null) ? $overview['intent'] : []); ?>
</div>

<section class="dp-section">
  <header class="dp-section__head">
    <h2 class="dp-section__title">Landing performance</h2>
    <p class="dp-muted"><?= count($overview['landing_cards'] ?? []) ?> active landings</p>
  </header>
  <div class="dp-landing-grid" id="dp-landing-grid">
    <?php foreach (($overview['landing_cards'] ?? []) as $card): ?>
      <?php render_landing_card($card); ?>
    <?php endforeach; ?>
    <?php if (empty($overview['landing_cards'])): ?>
    <div class="dp-empty">No landing data yet. Events will appear when growth/storage/events.jsonl receives traffic.</div>
    <?php endif; ?>
  </div>
</section>
