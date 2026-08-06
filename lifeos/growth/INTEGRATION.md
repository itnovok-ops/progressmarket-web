# LifeOS Growth — Frontend Integration Contract

Landings send analytics events asynchronously. Failures must be silent (never block UI).

## Storage files

- `storage/events.jsonl` — append-only event log
- `storage/sessions.jsonl` — session touch records
- `storage/conversions.jsonl` — funnel stage progression per session

## Client globals (landing)

After `initGrowth()`:

- `window.__LIFEOS_FUNNEL_METRICS__`
- `window.__LIFEOS_LANDING_STATS__`
- `window.__LIFEOS_INTENT_MAP__`
- `window.__LIFEOS_GROWTH_REPORT__`

## Primary receiver endpoint

```
POST /lifeos/growth/api/events.php
Content-Type: application/json
```

### Client payload (SuperSite bridge)

```json
{
  "event": "cta_click",
  "timestamp": 1718380800000,
  "session": { "id": "uuid", "mode": "guest", "context": { "source": "landing" } },
  "page": "/landing/",
  "metadata": { "label": "Получить расчёт" }
}
```

`page` may also be an object: `{ "path": "/landing/", "landing_id": "wb-fbs-v1" }`.

Response (always `status: "ok"`):

```json
{
  "status": "ok",
  "accepted": 1,
  "batch": [{ "stored": true, "landing_id": "wb-fbs-v1" }],
  "analytics": {
    "landing_stats": {},
    "funnel_metrics": {},
    "intent_distribution": {}
  }
}
```

Legacy alias: `POST /api/growth/event` and `/api/growth/batch`.

## Endpoint (normalized storage)

```
POST /lifeos/growth/api/events.php
Content-Type: application/json
```

## Payload (single event)

```json
{
  "landing_id": "wb-fbs-v1",
  "session_id": "uuid-v4",
  "event_type": "video_click",
  "timestamp": 1718380800,
  "data": {}
}
```

Batch: send JSON array of events (max 50 per request).

## Event types

| event_type   | When to fire              | data hints                          |
|-------------|---------------------------|-------------------------------------|
| `visit`     | Page ready after boot     | `{ "path": "/landing/" }`           |
| `scroll`    | Scroll depth milestones   | `{ "depth": 0.5, "fast_scroll": false }` |
| `video_view`| Video in viewport         | `{ "seconds": 4 }`                  |
| `video_play`  | Video started playing     | `{ "source": "heroVideo" }`         |
| `video_click` | Play overlay clicked      | `{ "source": "play_overlay" }`      |
| `cta_click` | Primary/secondary CTA     | `{ "label": "...", "href": "#cta" }`|
| `form_start`| First form focus          | `{ "field": "name" }`               |
| `form_submit`| Lead form submit         | `{ "success": true }`               |
| `intent`    | Intent engine update      | `{ "score": 72, "level": "HIGH" }`  |

## Example (fetch, fire-and-forget)

```javascript
function growthTrack(eventType, data) {
  try {
    const payload = {
      landing_id: "wb-fbs-v1",
      session_id: sessionStorage.getItem("lifeos_sid") || crypto.randomUUID(),
      event_type: eventType,
      timestamp: Math.floor(Date.now() / 1000),
      data: data || {}
    };
    fetch("/lifeos/growth/api/events.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () {});
  } catch (e) {}
}
```

## Stats API

```
GET /lifeos/growth/api/stats.php?landing_id=wb-fbs-v1
```

## Notes

- File storage only (`storage/events.jsonl`, `storage/sessions.jsonl`)
- CORS allowed origins in `lifeos/growth/config.php`
- Dashboard: `/lifeos/growth/dashboard/summary.php`
