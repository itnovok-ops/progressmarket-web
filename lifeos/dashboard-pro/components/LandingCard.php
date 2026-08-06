<?php
declare(strict_types=1);

require_once __DIR__ . '/IntentWidget.php';

/** @var array<string, mixed> $card */
function render_landing_card(array $card): void
{
    $id = dashboard_pro_escape((string) ($card['landing_id'] ?? ''));
    $name = dashboard_pro_escape((string) ($card['name'] ?? $id));
    $score = (int) ($card['performance_score'] ?? 0);
    $intent = is_array($card['intent'] ?? null) ? $card['intent'] : [];
    ?>
<article class="dp-landing-card" data-landing-id="<?= $id ?>">
  <header class="dp-landing-card__head">
    <div>
      <h3 class="dp-landing-card__title"><a href="landing.php?id=<?= urlencode((string) ($card['landing_id'] ?? '')) ?>"><?= $name ?></a></h3>
      <p class="dp-muted dp-landing-card__id"><?= $id ?></p>
    </div>
    <div class="dp-score dp-score--<?= $score >= 70 ? 'high' : ($score >= 40 ? 'mid' : 'low') ?>" title="Performance score">
      <?= $score ?>
    </div>
  </header>
  <div class="dp-landing-card__metrics">
    <div><span class="dp-muted">Sessions</span><strong><?= (int) ($card['sessions'] ?? 0) ?></strong></div>
    <div><span class="dp-muted">Conversion</span><strong><?= dashboard_pro_pct((float) ($card['conversion_rate'] ?? 0), 2) ?></strong></div>
    <div><span class="dp-muted">Video</span><strong><?= dashboard_pro_pct((float) ($card['video_engagement'] ?? 0), 1) ?></strong></div>
  </div>
  <div class="dp-landing-card__intent">
    <span class="dp-muted">Intent</span>
    <?php render_intent_bars($intent); ?>
  </div>
  <footer class="dp-landing-card__foot">
    <a class="dp-link" href="landing.php?id=<?= urlencode((string) ($card['landing_id'] ?? '')) ?>">Open detail →</a>
  </footer>
</article>
    <?php
}
