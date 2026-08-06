<?php
declare(strict_types=1);

/** @var array<string, mixed> $funnel */
function render_funnel_widget(array $funnel, ?string $title = 'Conversion funnel'): void
{
    $stages = is_array($funnel['stages'] ?? null) ? $funnel['stages'] : [];
    $rates = is_array($funnel['rates'] ?? null) ? $funnel['rates'] : [];
    $drops = is_array($funnel['drop_offs'] ?? null) ? $funnel['drop_offs'] : [];
    $weakest = (string) ($funnel['weakest_step'] ?? 'n/a');
    $order = ['visit', 'scroll', 'video_view', 'video_click', 'cta_click', 'form_start', 'form_submit'];
    $labels = [
        'visit' => 'Visit',
        'scroll' => 'Scroll',
        'video_view' => 'Video view',
        'video_click' => 'Video click',
        'cta_click' => 'CTA click',
        'form_start' => 'Form start',
        'form_submit' => 'Form submit',
    ];
    ?>
<section class="dp-widget dp-funnel-widget">
  <?php if ($title !== ''): ?>
  <header class="dp-widget__head">
    <h2 class="dp-widget__title"><?= dashboard_pro_escape($title) ?></h2>
    <p class="dp-muted">Weakest step: <strong class="dp-accent"><?= dashboard_pro_escape($weakest) ?></strong></p>
  </header>
  <?php else: ?>
  <p class="dp-muted dp-funnel-widget__weak">Weakest: <strong class="dp-accent"><?= dashboard_pro_escape($weakest) ?></strong></p>
  <?php endif; ?>
  <div class="dp-funnel">
    <?php foreach ($order as $stage):
        $count = (int) ($stages[$stage] ?? 0);
        $rate = (float) ($rates[$stage] ?? 0);
        $drop = (float) ($drops[$stage] ?? 0);
        $width = max(4, (int) round($rate * 100));
        $isWeak = $stage === $weakest;
    ?>
    <div class="dp-funnel__row<?= $isWeak ? ' dp-funnel__row--weak' : '' ?>">
      <div class="dp-funnel__label">
        <span><?= dashboard_pro_escape($labels[$stage] ?? $stage) ?></span>
        <span class="dp-muted"><?= $count ?> · <?= dashboard_pro_pct($rate) ?></span>
      </div>
      <div class="dp-funnel__bar-wrap">
        <div class="dp-funnel__bar" style="width: <?= $width ?>%"></div>
      </div>
      <?php if ($stage !== 'visit'): ?>
      <div class="dp-funnel__drop dp-muted">−<?= dashboard_pro_pct($drop) ?> drop</div>
      <?php else: ?>
      <div class="dp-funnel__drop dp-muted">entry</div>
      <?php endif; ?>
    </div>
    <?php endforeach; ?>
  </div>
</section>
    <?php
}
