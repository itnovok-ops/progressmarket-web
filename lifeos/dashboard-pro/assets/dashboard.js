(function () {
  'use strict';

  var refreshBtn = document.getElementById('dp-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Refreshing…';
      window.location.reload();
    });
  }

  var grid = document.getElementById('dp-landing-grid');
  if (!grid || !window.fetch) {
    return;
  }

  var statsUrl = 'api/dashboardStats.php';

  function pct(value, decimals) {
    var n = Number(value) || 0;
    return (n * 100).toFixed(decimals == null ? 1 : decimals) + '%';
  }

  function scoreClass(score) {
    if (score >= 70) return 'high';
    if (score >= 40) return 'mid';
    return 'low';
  }

  function intentBars(intent) {
    var rows = [
      { key: 'low', cls: 'low' },
      { key: 'medium', cls: 'medium' },
      { key: 'high', cls: 'high' }
    ];
    return rows.map(function (row) {
      var p = Number(intent[row.key]) || 0;
      var w = Math.max(2, Math.round(p * 100));
      return (
        '<div class="dp-intent-row">' +
        '<div class="dp-intent-row__head">' +
        '<span class="dp-intent-tag dp-intent-tag--' + row.cls + '">' + row.key.toUpperCase() + '</span>' +
        '<span>' + pct(p) + '</span></div>' +
        '<div class="dp-intent-bar-wrap"><div class="dp-intent-bar dp-intent-bar--' + row.cls + '" style="width:' + w + '%"></div></div>' +
        '</div>'
      );
    }).join('');
  }

  function renderCard(card) {
    var id = card.landing_id || '';
    var score = Number(card.performance_score) || 0;
    return (
      '<article class="dp-landing-card" data-landing-id="' + id + '">' +
      '<header class="dp-landing-card__head">' +
      '<div><h3 class="dp-landing-card__title"><a href="landing.php?id=' + encodeURIComponent(id) + '">' + (card.name || id) + '</a></h3>' +
      '<p class="dp-muted dp-landing-card__id">' + id + '</p></div>' +
      '<div class="dp-score dp-score--' + scoreClass(score) + '">' + score + '</div></header>' +
      '<div class="dp-landing-card__metrics">' +
      '<div><span class="dp-muted">Sessions</span><strong>' + (card.sessions || 0) + '</strong></div>' +
      '<div><span class="dp-muted">Conversion</span><strong>' + pct(card.conversion_rate, 2) + '</strong></div>' +
      '<div><span class="dp-muted">Video</span><strong>' + pct(card.video_engagement, 1) + '</strong></div></div>' +
      '<div class="dp-landing-card__intent"><span class="dp-muted">Intent</span>' +
      '<div class="dp-intent-bars">' + intentBars(card.intent || {}) + '</div></div>' +
      '<footer class="dp-landing-card__foot"><a class="dp-link" href="landing.php?id=' + encodeURIComponent(id) + '">Open detail →</a></footer>' +
      '</article>'
    );
  }

  function applyStats(data) {
    if (!data || !Array.isArray(data.landing_cards)) return;
    if (!data.landing_cards.length) return;
    grid.innerHTML = data.landing_cards.map(renderCard).join('');
  }

  function pollStats() {
    var lifeosFetch = window.__LIFEOS_SESSION_API__ && window.__LIFEOS_SESSION_API__.fetch;

    if (typeof lifeosFetch === 'function') {
      lifeosFetch(statsUrl, { credentials: 'same-origin', cache: 'no-store' })
        .then(function (result) {
          if (!result || result.mode === 'guest') {
            return fetch(statsUrl, { credentials: 'same-origin', cache: 'no-store' })
              .then(function (res) { return res.ok ? res.json() : null; })
              .then(applyStats);
          }
          if (result.mode === 'ok') {
            applyStats(result.data);
          }
        })
        .catch(function () { /* fail silently */ });
      return;
    }

    fetch(statsUrl, { credentials: 'same-origin', cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(applyStats)
      .catch(function () { /* fail silently */ });
  }

  document.addEventListener('lifeos:session:update', function () {
    pollStats();
  });

  if (document.visibilityState === 'visible') {
    window.setTimeout(pollStats, 30000);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      pollStats();
    }
  });
})();
