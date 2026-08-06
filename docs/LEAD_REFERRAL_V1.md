# Lead + Referral System — V1.1

Reference doc for the lead-capture, referral-attribution, and admin-viewing system
shipped on `cloud/market-v1.1`. Companion to `reports/market-v1.1-implementation.md`
(which has the full task-by-task implementation report and known limitations).

## Why a new endpoint exists

The pre-existing `/api/v1/leads` (→ `api/v1/leads.php` → `lifeos/bootstrap.php` →
`LifeOS\LeadIngestionService`) depends on the top-level `lifeos/` directory — a large,
separate ops platform (`nika/`, `autopilot/`, `revenue-routing/`, etc.) that this
agent is explicitly forbidden to access or modify. It could not be audited, safely
extended, or safely left as the canonical target without understanding what it does.

**V1.1 ships a new, fully self-contained endpoint**, `POST /api/v1/lead-intake.php`,
that depends on nothing outside `lib/leads/`, `config/`, and `storage/leads/` — all
new, all reviewable, none of it touching `lifeos/` or the old `api/v1/leads.php`
(which is left completely untouched and still exists, unmodified, in the repo).

**This is a real decision Roman must confirm before deploy**: which pipeline should
receive real leads going forward — the new lightweight one (transparent, admin-panel
visible, but not integrated with amoCRM/whatever `LifeOS\LeadIngestionService` does
today), the old one, or both (e.g. this endpoint as primary + a later webhook forward
into the old pipeline). Nothing about this decision is technical — it's what the
business wants to happen to a submitted lead.

## Lead fields

| Field | Source | Notes |
|---|---|---|
| `lead_id` | server-generated | `YYYYMMDD-<12 hex chars>`, not a DB autoincrement — storage-engine independent |
| `created_at` | server-generated | ISO-8601 UTC |
| `name` | form | required |
| `phone` | form | required unless `email` present |
| `email` | form | required unless `phone` present |
| `comment` | form | optional, free text |
| `referral_code` | cookie → payload → **server re-validated** | `^[a-zA-Z0-9_-]{1,64}$` or stored empty |
| `utm_source/medium/campaign/content/term` | cookie → payload → server-capped at 128 chars | first-touch, see below |
| `landing_url` | `window.location.href` at submit time | must start with `http(s)://` or stored empty |
| `status` | server-set | always `NEW` on insert; the field exists for future admin/CRM workflows, nothing currently transitions it |
| `ip_hash` | server-derived | `sha256(salt|ip)` truncated to 24 chars — pseudonymized, not reversible without the salt |
| `user_agent_short` | server-derived | first 140 chars of `User-Agent` |

No account/password/CRM record is created — this is lead capture only, per the task's
explicit scope (§9 of the task brief).

## Server-side validation

`lib/leads/Lead.php::fromInput()` is the single source of truth and is **never**
bypassed — the client-side form validation (`landing/components/CTASection.js` HTML
`required`/`type=` attributes) is a UX convenience only. Rejected inputs return
`{"ok": false, "message": "<human Russian sentence>"}` with an HTTP 4xx status —
never a stack trace, never raw exception text (verified in
`api/v1/lead-intake.php`'s catch blocks).

## Referral (`?ref=`) — first-touch attribution

- `landing/components/referral.js::captureAttribution()` runs as early as possible
  (called from `landing/simpleBoot.js`, before the page even finishes rendering).
- Reads `?ref=` from the query string, validates `^[a-zA-Z0-9_-]{1,64}$` client-side
  (a cheap early filter — the server does its own independent validation again at
  submit time and never trusts the cookie value blindly).
- Writes a `pm_ref` cookie **only if one doesn't already exist** — this is the
  first-touch rule: a visitor's *first* valid `ref` wins for 30 days, later `ref`
  values in the URL during that window are ignored.
- Cookie attributes: `Path=/; SameSite=Lax` + `Secure` when served over HTTPS. Not
  `HttpOnly` — the frontend genuinely needs to read it (to display/attach to the lead
  payload), and there is currently no server-side page-rendering layer for the
  landing page itself (see "Why client-side, not server-side" below).
- At submit time, `leads.js` reads the cookie via `getReferralCode()` and includes it
  in the POST payload. The server (`Lead::cleanReferralCode()`) re-validates the
  format independently — a tampered or malformed cookie value is silently dropped to
  an empty string, never stored as-is.

**Test:** visiting `/lifeos/?ref=roman` and submitting the form produces a lead with
`referral_code = "roman"`. Verified via `scripts/tests/market-v1_1-lead-tests.php`
at the validation-layer level (server independently accepts/rejects `ref` values);
the cookie-write/first-touch behavior itself is JS-only and needs a real browser to
runtime-verify — see reports/market-v1.1-implementation.md §20 (Browser QA).

### Why client-side, not server-side

The brief prefers server-side reading of the referral value "если текущая
архитектура позволяет." It doesn't, currently: `/lifeos/` and `/landing/` are static
HTML served directly by Apache (confirmed via `.htaccess: DirectoryIndex index.html`)
with no PHP templating layer in front of the landing page itself — only the API
endpoints under `/api/v1/` are PHP. Adding server-side cookie-setting would require
either (a) making the landing page itself PHP-rendered (a real architecture change,
out of scope for a stabilization release) or (b) an edge/reverse-proxy layer (not
available on this shared-hosting deployment). Client-side capture + independent
server-side re-validation at submit time is the standard, safe pattern for this
constraint and is what's shipped.

## UTM attribution

Same first-touch model, deliberately kept in a **separate** cookie (`pm_utm`, JSON) —
never mixed with `pm_ref`, per the brief's explicit instruction. `utm_source`,
`utm_medium`, `utm_campaign`, `utm_content`, `utm_term` are captured together (any
one present triggers capture of whichever of the five are in the URL), first-touch,
30-day TTL, same cookie attributes as `pm_ref`.

## Storage — `LeadRepository`

`lib/leads/LeadRepository.php` is a plain interface (`insert`, `query`, `count`).
The frontend and the endpoint never know or care which engine is behind it.

- **`SqliteLeadRepository`** — used automatically when `pdo_sqlite` is available
  (`extension_loaded('pdo_sqlite')` + driver check). Single `leads` table, WAL mode,
  indexed on `created_at` and `referral_code`.
- **`JsonlLeadRepository`** — automatic fallback when SQLite isn't available.
  Append-only, `flock()`-guarded writes, one JSON object per line. `query()`/`count()`
  read and filter the whole file in PHP — fine at V1.1 lead volumes, not intended to
  scale past a few thousand rows without revisiting.
- Engine selection: `config/market-v1_1.php` → `storage_engine` (`'auto'` | `'sqlite'`
  | `'jsonl'`). Default `'auto'`. **This repo's local sandbox has `pdo_sqlite`
  installed and both engines were integration-tested; whether Beget's actual PHP
  build has `pdo_sqlite` enabled was not verifiable from here (no server access) —
  the `'auto'` fallback exists specifically so this doesn't matter in practice.**
- Location: `storage/leads/` (SQLite file, or `leads.jsonl`, plus a `ratelimit/`
  subfolder). **Never committed to git** (`.gitignore`: `storage/leads/*`, with only
  `.gitkeep` and the protective `.htaccess` tracked). Protected at the HTTP layer by
  a `Require all denied` / `Deny from all` `.htaccess` inside `storage/leads/` —
  effective because this host's `.htaccess`-based routing already proven to work in
  production (`api/v1/.htaccess`'s `RewriteRule` is what makes `/api/v1/leads` work
  today), so `AllowOverride` is evidently enabled here.

### Extension point: future storage engines

Add a new class implementing `LeadRepository` (e.g. `GoogleSheetsLeadRepository`,
`PostgresLeadRepository`) and wire it into `LeadRepositoryFactory::make()`'s engine
switch. Nothing in `api/v1/lead-intake.php`, `admin/leads/*`, or the frontend needs
to change — that's the entire point of the interface. Google Sheets specifically was
explicitly *not* a V1.1 blocker per the task brief; this is where it plugs in later.

## Admin panel — `/admin/leads/`

- `admin/leads/login.php` — username + `password_hash()`-verified password, PHP
  session (`pm_admin_sess`, `HttpOnly`, `SameSite=Lax`, `Secure` over HTTPS, scoped
  to `Path=/admin/leads/`). 5 attempts / 60s per IP via the same `RateLimiter`.
- `admin/leads/index.php` — table of leads (`created_at`, `name`, `phone`, `email`,
  `referral_code`, `utm_source`, `status`, `landing_url`), filters (`referral_code`
  exact match, `date_from`/`date_to`, free-text `search` over name/phone/email),
  pagination (50/page). All output HTML-escaped.
- `admin/leads/export.php` — CSV export of the current filter, `Content-Disposition:
  attachment`, UTF-8 BOM (so Cyrillic opens correctly in Excel), every field passed
  through `Csv::sanitizeField()` — any value starting with `=`, `+`, `-`, or `@` gets
  a leading `'` so spreadsheet apps never interpret it as a formula. This is why
  exported phone numbers (which start with `+`) show a leading `'` — intentional,
  not a bug.
- Credentials live in `config/market-v1_1.php` (gitignored) — never in git, never in
  frontend JS. See `config/market-v1_1.sample.php` for the exact shape and how to
  generate a password hash.

## Privacy

Fields collected match the task's canonical lead model exactly — no extra PII beyond
`ip_hash` (pseudonymized, not raw IP) and `user_agent_short` (truncated, diagnostic
only). No data is sent to any third party by this new code path. The pre-existing
legal documents (`offer.html`, `privacy-policy.html`, `personal-data-consent.html`,
`marketing-consent.html`) are linked from the form's consent checkboxes — see
`reports/market-v1.1-implementation.md` §7 for the CONTENT BLOCKER on those documents
referencing a different domain (progress-market.ru) than market.teravox.ru.

## Migration path (future)

1. **Google Sheets** — new `GoogleSheetsLeadRepository implements LeadRepository`,
   using a service account + the Sheets API; swap in `LeadRepositoryFactory`.
2. **PostgreSQL / real CRM** — same pattern; `SqliteLeadRepository` is already
   written against a normal SQL schema, so a `PostgresLeadRepository` is a close
   port.
3. **Reconciling with the `lifeos/` pipeline** — once someone with access to
   `lifeos/` can document what `LeadIngestionService` actually does downstream
   (amoCRM sync? notifications? something else?), the two pipelines can be merged —
   e.g. this endpoint stays the single client-facing intake point and forwards into
   whatever `lifeos/` does, instead of them being fully parallel as they are now.
