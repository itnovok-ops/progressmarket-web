<?php
declare(strict_types=1);

/** @var array{low: float, medium: float, high: float, low_count?: int, medium_count?: int, high_count?: int} $intent */
function render_intent_widget(array $intent, ?string $title = 'Intent distribution'): void
{
    ?>
<section class="dp-widget dp-intent-widget">
  <header class="dp-widget__head">
    <h2 class="dp-widget__title"><?= dashboard_pro_escape($title) ?></h2>
  </header>
  <?php render_intent_bars($intent, true); ?>
</section>
    <?php
}

/** @var array{low: float, medium: float, high: float, low_count?: int, medium_count?: int, high_count?: int} $intent */
function render_intent_bars(array $intent, bool $showCounts = false): void
{
    $rows = [
        ['key' => 'low', 'label' => 'LOW', 'class' => 'low'],
        ['key' => 'medium', 'label' => 'MEDIUM', 'class' => 'medium'],
        ['key' => 'high', 'label' => 'HIGH', 'class' => 'high'],
    ];
    ?>
<div class="dp-intent-bars">
  <?php foreach ($rows as $row):
    $pct = (float) ($intent[$row['key']] ?? 0);
    $count = (int) ($intent[$row['key'] . '_count'] ?? 0);
    $width = max(2, (int) round($pct * 100));
  ?>
  <div class="dp-intent-row">
    <div class="dp-intent-row__head">
      <span class="dp-intent-tag dp-intent-tag--<?= $row['class'] ?>"><?= $row['label'] ?></span>
      <span><?= dashboard_pro_pct($pct) ?><?= $showCounts ? ' · ' . $count : '' ?></span>
    </div>
    <div class="dp-intent-bar-wrap">
      <div class="dp-intent-bar dp-intent-bar--<?= $row['class'] ?>" style="width: <?= $width ?>%"></div>
    </div>
  </div>
  <?php endforeach; ?>
</div>
    <?php
}
