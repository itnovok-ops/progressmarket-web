<?php
declare(strict_types=1);

/** @var array<string, mixed> $traffic */
?>
<header class="dp-page-head">
  <div>
    <p class="dp-eyebrow">Traffic analytics</p>
    <h1 class="dp-page-title">Traffic</h1>
    <p class="dp-muted">Sessions and event volume by landing</p>
  </div>
</header>

<section class="dp-widget">
  <header class="dp-widget__head">
    <h2 class="dp-widget__title">Sessions by landing</h2>
  </header>
  <?php if (empty($traffic['traffic'])): ?>
  <p class="dp-muted">No traffic data yet.</p>
  <?php else: ?>
  <table class="dp-table">
    <thead>
      <tr>
        <th>Landing</th>
        <th>Sessions</th>
        <th>Events</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($traffic['traffic'] as $row): ?>
      <tr>
        <td><code><?= dashboard_pro_escape((string) ($row['landing_id'] ?? '')) ?></code></td>
        <td><?= (int) ($row['sessions'] ?? 0) ?></td>
        <td><?= (int) ($row['events'] ?? 0) ?></td>
        <td><a class="dp-link" href="landing.php?id=<?= urlencode((string) ($row['landing_id'] ?? '')) ?>">Detail</a></td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
  <?php endif; ?>
</section>

<section class="dp-widget">
  <header class="dp-widget__head">
    <h2 class="dp-widget__title">Event volume (UTC hours)</h2>
  </header>
  <?php
  $hours = is_array($traffic['events_by_hour'] ?? null) ? $traffic['events_by_hour'] : [];
  if ($hours === []):
  ?>
  <p class="dp-muted">No hourly breakdown available.</p>
  <?php else: ?>
  <div class="dp-hour-bars">
    <?php foreach ($hours as $landingId => $buckets):
      if (!is_array($buckets)) {
          continue;
      }
      $max = max(1, ...array_values($buckets));
    ?>
    <div class="dp-hour-landing">
      <h3 class="dp-hour-landing__title"><?= dashboard_pro_escape((string) $landingId) ?></h3>
      <div class="dp-hour-landing__bars">
        <?php foreach (array_slice($buckets, -24, 24, true) as $hour => $count): ?>
        <div class="dp-hour-bar" title="<?= dashboard_pro_escape((string) $hour) ?>: <?= (int) $count ?>">
          <div class="dp-hour-bar__fill" style="height: <?= max(4, (int) round(((int) $count / $max) * 100)) ?>%"></div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
    <?php endforeach; ?>
  </div>
  <?php endif; ?>
</section>
