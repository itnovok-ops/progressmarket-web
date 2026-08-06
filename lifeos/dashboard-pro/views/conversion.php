<?php
declare(strict_types=1);

use LifeOS\Growth\ConversionEngine;

/** @var array<string, mixed> $overview */
require_once dirname(__DIR__) . '/components/FunnelWidget.php';
require_once dirname(__DIR__) . '/components/LandingCard.php';

$funnel = is_array($overview['funnel'] ?? null) ? $overview['funnel'] : [];
?>
<header class="dp-page-head">
  <div>
    <p class="dp-eyebrow">Funnel intelligence</p>
    <h1 class="dp-page-title">Conversion</h1>
    <p class="dp-muted">Drop-offs, bottlenecks, landing comparison</p>
  </div>
</header>

<?php render_funnel_widget($funnel, 'Global conversion funnel'); ?>

<section class="dp-section">
  <header class="dp-section__head">
    <h2 class="dp-section__title">Per-landing conversion</h2>
  </header>
  <div class="dp-landing-grid">
    <?php foreach (($overview['landing_cards'] ?? []) as $card):
      $landingId = (string) ($card['landing_id'] ?? '');
      $landingFunnel = ConversionEngine::funnel($landingId);
    ?>
    <div class="dp-landing-card dp-landing-card--compact">
      <h3><a href="landing.php?id=<?= urlencode($landingId) ?>"><?= dashboard_pro_escape((string) ($card['name'] ?? $landingId)) ?></a></h3>
      <p class="dp-muted">Bottleneck: <strong class="dp-accent"><?= dashboard_pro_escape((string) ($landingFunnel['weakest_step'] ?? 'n/a')) ?></strong></p>
      <p class="dp-muted">Conversion: <?= dashboard_pro_pct((float) ($card['conversion_rate'] ?? 0), 2) ?></p>
      <?php render_funnel_widget($landingFunnel, ''); ?>
    </div>
    <?php endforeach; ?>
  </div>
</section>
