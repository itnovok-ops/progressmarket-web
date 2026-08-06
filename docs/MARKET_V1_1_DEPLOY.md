# Market V1.1 — Beget deploy checklist

Canonical branch: `cloud/market-v1.1`  
Production host: `https://market.teravox.ru`  
Deploy method: **manual file upload** into Beget docroot (no CI build pipeline).

**Do not** merge to `main` from this checklist. **Do not** dual-submit leads to the old Nika/amoCRM `/api/v1/leads` pipeline.

---

## 0. Preflight

- [ ] Working tree on `cloud/market-v1.1` is clean and pushed
- [ ] Local checks green: `scripts/tests/market-v1_1-lead-tests.php` + `scripts/tests/market-v1_1-integration-checks.php`
- [ ] Confirm live backup target (full docroot zip or equivalent)

---

## 1. Backup live

1. On Beget: archive current docroot (at least `lifeos/`, `landing/`, root legal HTML, `robots.txt`, `sitemap.xml`, existing `api/`, `config/`, `storage/`).
2. Store the archive outside the public docroot.
3. Note the backup filename and timestamp.

---

## 2. Upload code / assets

Upload **these paths** (overwrite matching files; preserve server-only `config/market-v1_1.php` if already present):

| Path | Notes |
|------|--------|
| `lifeos/index.html` | Production HTML shell + SEO head |
| `lifeos/app.js` | Boot entry → `/landing/simpleBoot.js` |
| `landing/**` | Full SPA source (styles, components, runtime, assets) |
| `api/v1/lead-intake.php` | Canonical V1.1 lead endpoint |
| `lib/**` | Includes `lib/leads/**` + `lib/.htaccess` |
| `admin/leads/**` | Admin UI + auth |
| `storage/leads/.htaccess` | Deny public access |
| `storage/leads/.gitkeep` | Ensures directory exists in git |
| `config/.htaccess` | Deny public access |
| `config/market-v1_1.sample.php` | Sample only — reference on server |
| `offer.html` | Legal |
| `privacy-policy.html` | Legal |
| `personal-data-consent.html` | Legal |
| `marketing-consent.html` | Legal |
| `legal.css` | Legal styles |
| `robots.txt` | market.teravox.ru |
| `sitemap.xml` | market.teravox.ru |

Optional but recommended if referenced by pages:

| Path | Notes |
|------|--------|
| `ym-goals.js` | Only if still linked from any page |

**Never upload from git:**

- `config/market-v1_1.php` (create on server only)
- `storage/leads/leads.sqlite`
- `storage/leads/leads.jsonl`
- `storage/leads/ratelimit/*`
- Any `.env` / credential dumps

---

## 3. Create server config

On the server (SSH or file manager), in docroot:

```bash
cp config/market-v1_1.sample.php config/market-v1_1.php
```

Edit `config/market-v1_1.php`:

1. Set `'environment' => 'production'`
2. Confirm `'allowed_origin' => 'https://market.teravox.ru'`
3. Set a strong `'ip_hash_salt'` (never reuse sample placeholder)
4. Set `'admin_username'` and `'admin_password_hash'`
5. Leave `'storage_path' => ''` unless you intentionally relocate storage outside default `storage/leads`
6. Keep rate-limit keys unless ops requires tuning

Generate password hash:

```bash
php -r "echo password_hash('YOUR_STRONG_PASSWORD_HERE', PASSWORD_DEFAULT), PHP_EOL;"
```

Generate salt:

```bash
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
```

Lock down permissions:

```bash
chmod 640 config/market-v1_1.php
chmod 750 storage/leads
```

Confirm deny rules exist:

- `config/.htaccess`
- `storage/leads/.htaccess`
- `lib/.htaccess`

---

## 4. Verify permissions

- [ ] `config/market-v1_1.php` is **not** world-readable via HTTP (`https://market.teravox.ru/config/market-v1_1.php` → 403/404)
- [ ] `storage/leads/` is not listable / downloadable
- [ ] PHP process can write to `storage/leads/` (create file test, then delete)

---

## 5. Verify PHP SQLite availability

On server:

```bash
php -m | grep -i pdo_sqlite
```

- If present: `storage_engine=auto` will use SQLite (`storage/leads/leads.sqlite`)
- If absent: automatic JSONL fallback (`storage/leads/leads.jsonl`) — acceptable for V1.1

---

## 6. Smoke test — legal pages

Open (expect HTTP 200, market.teravox.ru framing, no progress-market.ru product framing):

- https://market.teravox.ru/offer.html
- https://market.teravox.ru/privacy-policy.html
- https://market.teravox.ru/personal-data-consent.html
- https://market.teravox.ru/marketing-consent.html

Also:

- https://market.teravox.ru/robots.txt
- https://market.teravox.ru/sitemap.xml

---

## 7. Smoke test — lead intake

`POST https://market.teravox.ru/api/v1/lead-intake.php`

- Valid payload from origin `https://market.teravox.ru` → success, status `NEW`
- Honeypot filled → rejected
- Too-fast submit → rejected
- Oversized body → rejected
- Wrong Origin → CORS / reject per implementation

---

## 8. Test `?ref=roman`

1. Open `https://market.teravox.ru/lifeos/?ref=roman`
2. Submit a test lead
3. Confirm admin shows referral `roman` (first-touch, 30-day cookie rules per `docs/LEAD_REFERRAL_V1.md`)
4. Confirm invalid `?ref=` is rejected server-side
5. Confirm UTM fields remain separate from referral

---

## 9. Test admin login

1. Open `https://market.teravox.ru/admin/leads/`
2. Login with server credentials
3. Check referral filter, date filter, search
4. Export CSV — verify formula-injection escaping on cells starting with `=`, `+`, `-`, `@`

---

## 10. Check mobile sticky CTA

On a phone / DevTools mobile:

1. Scroll past hero → sticky CTA label **«Оставить заявку»** appears
2. Tap → scrolls/anchors to `#cta` form
3. Near form / form in view → sticky hides
4. Does not cover form controls or footer links
5. Touch target ≥ 44px
6. Hard refresh if CSS was cached (`?v=2026.08.07.01`)

---

## 11. Hard refresh / cache bust

- Confirm `lifeos/index.html` links CSS/JS with new `?v=` query
- Hard refresh `/lifeos/`
- Confirm title / description / canonical / OG tags in View Source match production head

---

## 12. Rollback procedure

1. Stop accepting traffic changes if needed (optional maintenance note).
2. Restore the backup archive over docroot.
3. Restore previous `config/market-v1_1.php` if it was overwritten (it should not be in git uploads).
4. Keep or restore `storage/leads/*` depending on whether new leads must be preserved.
5. Smoke-test `/lifeos/`, one legal URL, lead POST, admin login.
6. Record rollback time and reason.

---

## Estimated time

| Step | Estimate |
|------|----------|
| Backup | 10–15 min |
| Upload | 15–25 min |
| Server config + permissions | 10–15 min |
| Smoke tests (legal, lead, ref, admin, sticky) | 20–30 min |
| **Total** | **~60–85 min** |

---

## Out of scope for this deploy

- Merging `cloud/market-v1.1` → `main`
- Changing old `/api/v1/leads` / Nika / amoCRM wiring
- Dual-submit of leads to both pipelines
