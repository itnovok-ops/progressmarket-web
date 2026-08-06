<?php
declare(strict_types=1);

/**
 * @param array<string, mixed> $items key => {label, value, format?}
 */
function render_metrics_widget(string $title, array $items, ?string $subtitle = null): void
{
    ?>
<section class="dp-widget dp-metrics-widget">
  <header class="dp-widget__head">
    <h2 class="dp-widget__title"><?= dashboard_pro_escape($title) ?></h2>
    <?php if ($subtitle): ?>
    <p class="dp-muted"><?= dashboard_pro_escape($subtitle) ?></p>
    <?php endif; ?>
  </header>
  <div class="dp-metrics-grid">
    <?php foreach ($items as $item): ?>
    <div class="dp-metric">
      <span class="dp-muted"><?= dashboard_pro_escape((string) ($item['label'] ?? '')) ?></span>
      <span class="dp-metric__value"><?= dashboard_pro_escape((string) ($item['value'] ?? '—')) ?></span>
      <?php if (!empty($item['hint'])): ?>
      <span class="dp-metric__hint dp-muted"><?= dashboard_pro_escape((string) $item['hint']) ?></span>
      <?php endif; ?>
    </div>
    <?php endforeach; ?>
  </div>
</section>
    <?php
}
