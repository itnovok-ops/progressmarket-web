<?php
declare(strict_types=1);

function render_dashboard_layout_start(string $title, string $active = 'overview'): void
{
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= dashboard_pro_escape($title) ?> · LifeOS Dashboard PRO</title>
  <link rel="stylesheet" href="<?= dashboard_pro_escape(dashboard_pro_asset('dashboard.css')) ?>?v=1">
  <script type="module" src="../session/init.js"></script>
</head>
<body class="dp-body">
  <div class="dp-shell">
    <aside class="dp-sidebar">
      <div class="dp-brand">
        <span class="dp-brand__mark">◆</span>
        <div>
          <strong>LifeOS</strong>
          <span class="dp-muted">Dashboard PRO</span>
        </div>
      </div>
      <nav class="dp-nav">
        <a class="dp-nav__link<?= $active === 'overview' ? ' is-active' : '' ?>" href="index.php">Overview</a>
        <a class="dp-nav__link<?= $active === 'traffic' ? ' is-active' : '' ?>" href="traffic.php">Traffic</a>
        <a class="dp-nav__link<?= $active === 'conversion' ? ' is-active' : '' ?>" href="conversion.php">Conversion</a>
      </nav>
      <p class="dp-sidebar__note dp-muted">Read-only · events.jsonl</p>
    </aside>
    <main class="dp-main">
    <?php
}

function render_dashboard_layout_end(): void
{
    ?>
    </main>
  </div>
  <script src="<?= dashboard_pro_escape(dashboard_pro_asset('dashboard.js')) ?>?v=1" defer></script>
</body>
</html>
    <?php
}
