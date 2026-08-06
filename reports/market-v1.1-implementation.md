# market-teravox V1.1 — Production Readiness Implementation Report

**project_id:** market-teravox-dropshipping · **task_id:** market-v1.1-production-readiness
**Branch:** `cloud/market-v1.1` (only branch touched) · **Repo:** `itnovok-ops/progressmarket-web`
**Scope honored:** `landing/` + proven-landing-adjacent files (legal pages, new backend
under `api/v1/`, `lib/`, `admin/`, `config/`, `storage/`). Top-level `lifeos/`,
`drop-landing/`, `api/growth/`, `helpdesk.*`, `AMOCRM-BEGET-SETUP.md`, `scripts/`
(pre-existing files) were **not modified** — out of scope per this agent's manifest.
**No deploy, no merge, no production change, no other branch touched.**

---

## 1. Architecture discovered

- Repo root = the actual web root (Apache/Beget shared hosting; confirmed by
  `api/v1/.htaccess`'s working `RewriteRule` and by every top-level folder name
  matching a live URL path: `/lifeos/`, `/landing/`, `/api/`).
- `landing/` is the real SPA source (components/logic/styles/assets) for the live
  site. It is loaded from **two** entry points: the true production one is
  `lifeos/index.html` (top-level, **out of scope**, forbidden per this agent's
  manifest — "access_teravox_nika_ai_or_nika_ops_core"), which loads
  `/lifeos/app.js` → `landing/simpleBoot.js`. A second, less-rich entry point,
  `landing/index.html`, is directly reachable at `/landing/` and was in scope — see
  §11 (SEO).
- A completely separate, unrelated top-level `lifeos/` directory (not to be confused
  with `landing/lifeos/`, a small in-scope experimental audit-tooling subfolder)
  contains a large ops platform: `nika/`, `autopilot/`, `revenue-routing/`,
  `agents/`, `control/`, `session/`, `growth/`, etc. This is out of scope by this
  agent's own operating manifest and was never opened.
- **The pre-existing lead pipeline** (`landing/components/leads.js` → `POST
  /api/v1/leads` → `api/v1/leads.php` → `require lifeos/bootstrap.php` →
  `LifeOS\LeadIngestionService`) depends on that forbidden directory. This is the
  single most consequential architectural fact discovered — see §8.
- Root-level files (`index.html`, `script.js`, `styles.css`, `offer.html`,
  `privacy-policy.html`, `personal-data-consent.html`, `marketing-consent.html`,
  `robots.txt`, `sitemap.xml`, `lead.php`, `helpdesk.*`) belong to an older/parallel
  "Progress Market" site (`progress-market.ru` — see `robots.txt`'s `Sitemap:` line
  and the legal documents' own text). Same legal entity (ИП Владимиров Р.С.) as
  market.teravox.ru, different domain framing. `lead.php` + its amoCRM OAuth flow
  (documented in `AMOCRM-BEGET-SETUP.md`) is a **superseded** integration, not called
  by anything in `landing/`.
- No build system anywhere (`SITE_AUDIT_REPORT.md` confirms this explicitly; no
  `package.json`/`composer.json` found). Plain static HTML/JS + PHP, files served
  as-is. `npm build` is not applicable — confirmed, not assumed.
- The repo already contained several **fully-written-but-never-rendered** landing
  components — `SystemFlowSection.js` (a "how it works" section, with its own audit
  tooling literally noting "content.system exists but SystemFlowSection is not
  rendered"), plus fully-styled-but-unwired `.sticky-cta`/`.soft-cta`/`.exit-cta` CSS
  and copy in `content.js`. V1.1 finishes and ships these rather than rebuilding —
  see §5–§6.

## 2. Changes made (file-level summary)

**Edited:**
`landing/assets/data/content.js`, `landing/components/CasesGrid.js`,
`landing/components/SystemFlowSection.js`, `landing/components/leads.js`,
`landing/logic/initLogic.js`, `landing/renderPage.js`, `landing/simpleBoot.js`,
`landing/styles/styles.css`, `landing/index.html`, `.gitignore`.

**New:**
`landing/components/ConversionOverlays.js`, `landing/components/referral.js`,
`landing/logic/conversionCta.js`, `api/v1/lead-intake.php`,
`lib/leads/{Config,Lead,LeadRepository,SqliteLeadRepository,JsonlLeadRepository,
LeadRepositoryFactory,RateLimiter,Csv}.php`, `lib/.htaccess`,
`admin/leads/{index,login,logout,export,auth,filters}.php`,
`config/market-v1_1.sample.php`, `config/.htaccess`, `storage/leads/.htaccess`,
`storage/leads/.gitkeep`, `scripts/tests/market-v1_1-lead-tests.php`,
`docs/LEAD_REFERRAL_V1.md`, this report.

**Not touched:** `api/v1/leads.php` (old endpoint — left exactly as-is, see §8),
all root-level legacy "Progress Market" files (legal HTML content itself was read,
not edited — see §7), top-level `lifeos/`, `drop-landing/`, `api/growth/`,
`helpdesk.*`, `scripts/*` (pre-existing files).

## 3. P0 fixed

- **Production placeholders removed from render output.** `cases/dashboard.png` and
  `diagrams/fbs-flow.png` (both literally contained the baked-in text "Placeholder —
  replace with final asset") are no longer referenced by any rendered component.
  `CasesGrid.js` and `SystemFlowSection.js` now render cleanly without an image when
  `item.image`/`step.image` is `null`, instead of ever pointing at a placeholder
  graphic. No fake metrics, screenshots, or partners were invented to fill the gap —
  the existing (real) revenue-figure copy in the "Результаты" section was left
  as-is, just no longer paired with a broken/placeholder visual.
- **Legal links.** `content.js`'s `legalLinks` (`../offer.html`, `../privacy-
  policy.html`, `../personal-data-consent.html`, `../marketing-consent.html`) were
  already structurally correct — they resolve to `/offer.html` etc., and those files
  **already exist, complete, in this repo** at the repo root. The 404s the prior
  audit found are a **deployment gap** (these files are in git but were evidently
  never uploaded to the live server), not a code/link bug — verified by running
  a local PHP server against this exact repo checkout: all four legal URLs plus
  `legal.css` return HTTP 200 (see §19). No href changes were needed or made.
- **CONTENT BLOCKER (per your explicit instruction not to invent legal content):**
  `offer.html`, `privacy-policy.html`, `personal-data-consent.html`, and
  `marketing-consent.html` are written for **"Progress Market" / progress-market.ru**
  — e.g. offer.html §1.2: *"Сервис Progress Market представляет собой программный
  продукт, размещенный на основном домене progress-market.ru..."* — and describe a
  subscription-cabinet SaaS product ("личный кабинет", "оплаченный тариф"), not
  market.teravox.ru's dropshipping lead-gen offer. The legal entity (ИП Владимиров
  Р.С., ОГРНИП/ИНН) matches, but the domain and product-scope language does not.
  **I did not rewrite this text** — that's a legal-content decision, not a code fix.
  Roman needs to decide: are these documents intentionally shared across both
  brands (in which case the domain clause should probably be broadened), or does
  market.teravox.ru need its own variant? See §26.

## 4. P1 fixed

- SEO meta (title/description/canonical/OG/Twitter/JSON-LD) verified present and
  corrected in `landing/index.html` — see §11.
- Mobile sticky CTA + mid-page soft CTA wired (previously fully built, never
  rendered) — see §6.
- "How it works" mechanics section wired and rewritten to the specified 7-step
  sequence — see §5.
- Form UX state machine completed (`IDLE`/`VALIDATION_ERROR`/`PENDING`/`SUCCESS`/
  `SERVER_ERROR`) — see §16.
- Basic anti-spam (honeypot, min-submit-time, rate limiting, size limit) — see §14.

## 5. Hero

Updated `content.js` `hero` block to the specified copy (headline/subtitle/primary
+ secondary CTA), fit within the existing composition with no HTML/CSS restructure:

- H1: *"Запустите продажи на Wildberries без закупки товара на склад"*
- Subtitle: *"Подключаем ассортимент оптовых поставщиков, готовим карточки и
  поддерживаем FBS-процесс. Вы приобретаете товар после получения заказа."*
- Primary CTA: *"Получить доступ к ассортименту"* → `#cta`
- Secondary CTA: *"Как это работает"* → `#system` (now a real section, see §7 below)

Hero video (`landing/logic/videoController.js`) was reviewed, not rewritten: it
already does the right things — `muted`/`playsinline` before any `play()` call
(autoplay-without-sound compliant), desktop-only autoplay (mobile requires a tap,
which is the safer default for mobile data/battery), `preload="metadata"` (not a
full download), a poster image, and multi-path fallback probing. No changes were
needed to satisfy "не позволять ему ломать mobile" — it already doesn't force a
large download on mobile. **New hero-video requirements documented for whenever the
platform UI stabilizes and a new video is produced:** keep `muted` + `playsinline`
+ `preload="metadata"` + poster; keep the existing multi-candidate source-fallback
mechanism (`HERO_VIDEO_PATHS_DESKTOP`/`_MOBILE` in `videoController.js`) so a new
file can simply be dropped in at the same paths without a code change.

## 6. CTA

Reused existing, previously-dead CSS + copy rather than inventing new UI:

- **Hero CTA** — unchanged mechanism, updated copy (§5).
- **Mid-page soft CTA** — new `landing/components/ConversionOverlays.js` renders the
  existing `.soft-cta` modal (title/text/label already in `content.js`'s
  `softCtaTitle/softCtaText/softCtaLabel`, previously unused). New
  `landing/logic/conversionCta.js` triggers it once per session at 35% scroll depth,
  closable via ×, backdrop click, or Escape; a `sessionStorage` flag prevents it
  reappearing. **This is not exit-intent** (no `mouseleave` listener exists anywhere
  in the new code — checked) — exit-intent is intentionally not wired, per the brief.
- **Mobile sticky CTA** — the existing `.sticky-cta` bar (previously unconditionally
  `display:none`, dead on every viewport) is now shown only on mobile
  (`@media (max-width:768px)`), only after scrolling past the hero, and hidden again
  automatically via `IntersectionObserver` once the real `#cta` form scrolls into
  view — so it never overlaps the form itself.
- All three point at the same `#cta` anchor → the one canonical `<form id="lead-
  form">`. No competing/duplicate forms were created.

## 7. Legal

See §3. Files verified complete (no placeholder/TODO text found via repo-wide grep),
correctly linked, confirmed serving 200 locally. Domain/scope mismatch flagged as a
CONTENT BLOCKER, not silently fixed.

## 8. Lead endpoint

**Deliberately new and self-contained**: `api/v1/lead-intake.php`. Does **not**
touch, require, or depend on `api/v1/leads.php` or the top-level `lifeos/` directory.

**Why not reuse the existing `/api/v1/leads`:** it requires
`lifeos/bootstrap.php` → `LifeOS\LeadIngestionService`, both inside the top-level
`lifeos/` directory this agent's manifest explicitly forbids accessing
("access_teravox_nika_ai_or_nika_ops_core"). Per your own instruction to reuse the
existing solution "если оно: безопасное; понятное; ... подходит под V1.1" — I
structurally cannot determine any of those three things about code I'm not permitted
to open. Building a parallel, fully self-contained, fully-documented endpoint was
the only path that satisfies both "ship a working canonical lead endpoint" and the
hard operating boundary. `content.js`'s `LEADS_ENDPOINT` now points at
`/api/v1/lead-intake.php`; `api/v1/leads.php` is untouched and still present.

**This is a real decision for Roman before deploy** — see §26. Nothing about the
above is a technical default; it's the only technically-possible option given the
constraints, but which pipeline should actually receive production leads is a
business call.

Full endpoint behavior (validation, CORS, anti-spam, error shapes) documented in
`docs/LEAD_REFERRAL_V1.md` and integration-tested — see §19.

## 9. LeadRepository

`lib/leads/LeadRepository.php` interface + `SqliteLeadRepository` +
`JsonlLeadRepository` + `LeadRepositoryFactory` (auto-selects SQLite when
`pdo_sqlite` is available, otherwise JSONL — both engines were built and integration
tested locally). Full detail in `docs/LEAD_REFERRAL_V1.md`.

## 10. Storage

`storage/leads/` — SQLite file or `leads.jsonl`, plus `ratelimit/`. Outside any
directory `landing/` or the frontend can reach. Protected by `Require all denied` /
`Deny from all` `.htaccess` (written at runtime too, defense in depth). **Never
committed** — `.gitignore` updated with `storage/leads/*` (only `.gitkeep` and the
`.htaccess` itself are tracked). Verified via `git add -n` dry-run that only the safe
files would ever be staged (see §28).

## 11. Admin leads

`/admin/leads/` (`admin/leads/index.php`), PHP session auth
(`admin/leads/login.php` + `auth.php`, `password_hash`/`password_verify`, 5
attempts/60s rate limit on login itself). Credentials in `config/market-v1_1.php`
(gitignored; sample at `config/market-v1_1.sample.php`). Shows
`created_at/name/phone/email/referral_code/status/landing_url` + `utm_source`
(bonus column). Filters: `referral_code` (exact), date range, free-text search.
CSV export with formula-injection escaping. No credentials in git or frontend JS —
verified.

## 12. Referral

Example URL: **`https://market.teravox.ru/lifeos/?ref=roman`**

`landing/components/referral.js` — first-touch, `[a-zA-Z0-9_-]{1,64}` validated
client-side (cheap filter) and **independently re-validated server-side**
(`Lead::cleanReferralCode()` — a tampered/malformed value is silently dropped to
empty, never trusted). 30-day cookie (`pm_ref`), `SameSite=Lax`, `Secure` on HTTPS,
`Path=/`, not `HttpOnly` (frontend needs to read it — documented why in
`docs/LEAD_REFERRAL_V1.md`, no server-templating layer exists for the static
landing page). Does not overwrite an existing valid cookie.

## 13. UTM attribution

Separate cookie (`pm_utm`, JSON, same TTL/attributes) — never mixed with
`referral_code`, per your explicit instruction. `utm_source/medium/campaign/
content/term`, first-touch, capped at 128 chars each, re-validated (length +
control-character stripping) server-side before storage.

## 14. Anti-spam

- **Honeypot** (`hp_trap`, already existed in the form) — non-empty → server returns
  `{"ok":true}` (so bots don't learn they were caught) but never persists the lead.
- **Minimum submit time** — client sends `client_render_ts` (captured when the form
  mounted); server rejects (silently, same `{"ok":true}` non-persist pattern) if the
  elapsed time is under `min_submit_seconds` (default 2s).
- **Rate limiting** — file-based sliding window (`RateLimiter`), default 8
  requests/60s per `ip_hash`, also applied to the admin login form separately (5/60s)
  to block credential brute-forcing.
- **Request size limit** — 20KB default, enforced via `Content-Length` check +
  a hard-capped `file_get_contents` read.
- No CAPTCHA was added (none was requested, and the brief explicitly said not to add
  a paid one without sign-off).

## 15. SEO

- `landing/index.html`'s `<head>` already had a mostly-complete meta set (title,
  description, keywords, robots, OG, Twitter, 3 JSON-LD blocks) — **but its
  `canonical`/`og:url`/JSON-LD `url` fields incorrectly self-referenced `/landing/`
  instead of the actual production canonical URL, `/lifeos/`** (which matches
  `content.js`'s own `CANONICAL_URL`). Fixed.
- **Known limitation, clearly flagged, not silently claimed as fixed:** the file
  actually served at the true production URL (`/lifeos/`) is `lifeos/index.html`,
  which lives inside the top-level `lifeos/` directory this agent cannot access. I
  could not directly verify or edit what's in the live `<head>` at `/lifeos/`. What
  I *can* say: `landing/index.html` (in-scope, fixed, reachable at `/landing/` per
  `landing/.htaccess`'s `DirectoryIndex`) is now the correct reference copy — see
  §22/§26 for what needs to happen to get it into the actual production entry file.
- `robots.txt`/`sitemap.xml` at repo root reference `progressmarket.ru`, not
  `market.teravox.ru` — **not proven to serve market.teravox.ru at all** (the
  live market.teravox.ru previously returned 404 for both, per the prior audit).
  I did not modify or duplicate these — touching a file with unproven, ambiguous
  ownership risked breaking a different property. Flagged as a question for Roman
  (§26), not guessed at.
- JSON-LD: only the pre-existing Organization/Product/FAQPage blocks (already
  fact-based, no invented ratings/reviews/prices) were left in place, with URLs
  corrected to `/lifeos/`. No new fabricated structured data was added.

## 16. Mobile

Checked via computed CSS at the standard breakpoints (360/390/430/768/1280/1440px)
— **no live browser was available this session, so this is a source-level review,
not a pixel-measured one** (see §20). Findings:
- New components (`ConversionOverlays`, `SystemFlowSection`'s 7-step timeline) reuse
  existing, already-mobile-tested CSS patterns (`.process-step` already had a
  `grid-template-columns: 1fr` mobile override from before this task;
  `.sticky-cta`/`.soft-cta` were already fully styled, just newly connected to
  the DOM and gated to mobile-only display).
- `.sticky-cta` is fixed `bottom:0` and only ever shown while `#cta` is **not**
  intersecting the viewport (`IntersectionObserver`-driven), specifically to satisfy
  "не должно быть fixed элементов, перекрывающих форму."
- All new interactive elements (`.btn`, checkboxes) reuse the existing `.btn`
  system, which already enforces `min-height: 44px`.
- No new horizontal-scroll risk introduced — no fixed-width elements were added;
  everything added uses the existing `.container`/`.section-inner`/`fr` grid
  patterns already in use elsewhere on the page.

## 17. AX (accessibility)

- New `#soft-cta` modal: `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby="soft-cta-title"`, closable via Escape, backdrop click, and a
  visible × button with `aria-label`.
- New `#sticky-cta` bar: `aria-hidden` kept in sync with actual visibility.
- Form: unchanged existing labels (all fields already had associated `<label>`s,
  verified), focus ring already implemented via `.cta-form input:focus`/`textarea:
  focus` (custom `box-shadow` ring, not `outline:none` with nothing replacing it —
  checked, this was already correct, not a bug).
- `prefers-reduced-motion` — already handled pre-existing (`@media (prefers-reduced-
  motion: reduce)` block in `styles.css`); nothing new added violates it (no new
  CSS animations were introduced).
- Alt text: all `renderImage()` calls (existing pattern) require `alt`; the new
  system-flow steps without images (§5) simply omit the image, no broken/empty
  `alt` attributes are rendered.
- Not independently re-verified with a live screen reader or contrast tool this
  session — flagged as a real gap, not claimed as fully WCAG-verified (matches the
  brief's "practical AX baseline," not a certification claim).

## 18. Security

- **Secrets**: `config/market-v1_1.php` (real credentials) is gitignored; verified
  with `git check-ignore` and a `git add -n` dry run that only
  `config/market-v1_1.sample.php` and `config/.htaccess` would ever be staged — the
  real file never appears in `git status` as stageable. Same verification for
  `storage/leads/*`.
- **XSS**: all admin-panel output goes through a local `h()` = `htmlspecialchars(...,
  ENT_QUOTES, 'UTF-8')` helper — every lead field, every filter-echoed value.
- **CSV injection**: `Csv::sanitizeField()` prefixes any value starting with
  `=`/`+`/`-`/`@` with `'` — unit-tested (`scripts/tests/market-v1_1-lead-tests.php`)
  and confirmed live in an actual CSV export (phone numbers, which start with `+`,
  correctly show the escaping prefix).
- **Directory traversal**: no user input is ever used to build a filesystem path
  anywhere in the new code — all paths are derived from `__DIR__`/`dirname()`.
- **Direct access to lead storage**: blocked via `.htaccess` inside `storage/leads/`,
  `config/`, and `lib/` — effectiveness reasoned from the fact `api/v1/.htaccess`'s
  `RewriteRule` is proven to work in production today (confirmed via the earlier
  site audit), meaning `AllowOverride` is enabled on this host.
- **Admin auth**: `password_hash`/`password_verify`, session-based, session ID
  regenerated on login, `HttpOnly`+`SameSite=Lax`(+`Secure` on HTTPS) cookie, scoped
  cookie path, 5-attempts/60s rate limit on the login form itself (integration
  tested — 6th rapid wrong-password attempt correctly blocked).
- **Logs**: `error_log()` calls contain exception messages and short diagnostic
  strings only — no lead PII (name/phone/email) is ever logged.
- **CORS**: `Access-Control-Allow-Origin` only ever set when the request's `Origin`
  header exactly matches the configured `allowed_origin` — never a wildcard, never
  reflected blindly.

## 19. Tests

Two layers, both real, neither faked:

1. **`scripts/tests/market-v1_1-lead-tests.php`** (committed, self-contained, no
   server needed) — 19 assertions covering lead valid/invalid, referral capture +
   invalid-referral rejection, UTM capture, SQLite + JSONL persistence and filters,
   CSV formula-injection escaping, rate-limiter allow/deny. **Run and passing**
   (`ALL TESTS PASSED`, exit 0) as of this report.
2. **Live integration test** — ran `php -S 127.0.0.1:8099` against this exact repo
   checkout and exercised the real HTTP endpoints with `curl`:
   - valid lead → `201 {"ok":true}`, persisted with correct fields (verified by
     reading the resulting SQLite row directly)
   - invalid lead (no name, no contact) → `400`, human-readable Russian message
   - malformed referral_code (`"bad ref!! <script>"`) → accepted lead, but
     `referral_code` stored as empty string, not the raw value
   - honeypot-filled + too-fast submissions → `200 {"ok":true}` but **not**
     persisted (confirmed: storage contained exactly 3 leads after 5 POSTs, matching
     the 3 that should have actually been saved)
   - malformed JSON body → `400`, clean message, no stack trace
   - `GET` to the endpoint → `405`
   - rate limiting → 9 rapid requests against a limit of 8/60s correctly started
     returning `429` (count included prior test requests against the same limiter
     window, as designed — rate limiting counts all well-formed POST attempts, not
     just ones that pass validation)
   - admin unauthenticated → `302` redirect to login
   - admin wrong password → rejected, correct error message, no session granted
   - admin correct password → `302` + working session → `200` on the list page
   - admin `?referral_code=roman` filter → correctly narrowed from 3 total leads to
     the 1 matching lead
   - CSV export → correct `Content-Type`/`Content-Disposition`, correct
     formula-injection escaping visible in the actual output
   - legal URLs (`offer.html`, `privacy-policy.html`, `personal-data-consent.html`,
     `marketing-consent.html`, `legal.css`) → all `200` from this checkout
   - login brute-force protection → 5 wrong attempts allowed, 6th correctly blocked
     with a distinct rate-limit message

**Not covered by the above (needs a real browser, not available this session)**:
`?ref=roman` cookie-write behavior itself, first-touch-not-overwritten behavior,
client-side double-submit guard, SEO meta as actually rendered in a browser's
`document.head`. These are code-reviewed (the logic is straightforward and was
read carefully) but not runtime-verified in an actual browser — see §20.

**Syntax**: `php -l` run clean on every new/edited PHP file (14 files). No `npm
build`/`composer install` exists or was fabricated — confirmed via repo-wide search,
consistent with the prior site audit's finding of no build tooling.

## 20. Browser QA

**BROWSER QA BLOCKED FOR BRANCH PREVIEW** — the Claude-in-Chrome extension is not
connected in this session, and no production-equivalent preview URL exists for this
branch (deploying one is out of scope — no deploy was performed, per hard
constraints). The PHP built-in server used for integration testing (§19) proves the
*backend* end-to-end but does not exercise the actual browser-rendered frontend
(cookies-via-JS, animations, real viewport layout, real touch input, console errors,
CLS/LCP). This is a genuine gap, stated plainly rather than presented as verified —
per this project's own reporting rule against reporting a source review as browser
verified.

**Recommended next step**: once a Chrome-connected session or a real preview
deployment is available, re-run the specific scenarios listed as "not covered" in
§19, plus a full 6-breakpoint visual pass per the earlier site-audit's checklist.

## 21. Known limitations

- The true production entry file (`lifeos/index.html`) could not be read or edited
  — out of scope. SEO/meta fixes only reach `landing/index.html` (§15).
- `pdo_sqlite` availability on the actual Beget production host is unverified (no
  server access) — mitigated by the automatic JSONL fallback, not left as a bare
  assumption.
- `robots.txt`/`sitemap.xml` domain ownership for market.teravox.ru is unresolved
  (§15) — nothing was guessed or duplicated.
- Legal documents' domain/product-scope mismatch is unresolved by design (§3/§7) —
  a content decision, not a code fix.
- No live-browser QA this session (§20).
- The existing `/api/v1/leads` → `lifeos/` pipeline's actual downstream behavior
  (what `LeadIngestionService` does with a lead — CRM sync? notification? nothing?)
  is unknown to this agent and was not investigated, by design (out of scope).
- Rate limiter and JSONL repository are file-based and adequate for V1.1/demo
  traffic; not designed for high concurrency or multi-server deployment.

## 22. Production requirements (before/at deploy — none of this was done by this agent)

1. **Deploy this branch's files** to the actual server, including the new
   `api/v1/lead-intake.php`, `lib/`, `admin/`, `config/.htaccess`,
   `storage/leads/.htaccess` (the directory itself will be created automatically on
   first request if missing, but the `.htaccess` should be present from the start).
2. **Create `config/market-v1_1.php` on the server** (never commit it) — copy
   `config/market-v1_1.sample.php`, set a real `admin_password_hash` (generate with
   `php -r "echo password_hash('...', PASSWORD_DEFAULT);"`), a real `ip_hash_salt`,
   and confirm `allowed_origin` matches the real deploy origin.
3. **Verify `pdo_sqlite`** is enabled on the production PHP build (`php -m | grep
   sqlite`) — if not, `storage_engine` will automatically fall back to JSONL, which
   works but doesn't need to be the silent default; worth an explicit choice.
4. **Sync the corrected `<head>` block** from `landing/index.html` into the actual
   production entry file (`lifeos/index.html`, outside this agent's reach) — or
   have `lifeos/index.html` `<link>`/redirect logic reference `landing/index.html`'s
   head directly, whichever fits the real deployment pipeline better.
5. **Resolve the legal-document CONTENT BLOCKER** (§3) before treating the lead
   form's consent flow as fully compliant.
6. **Explicit decision on which lead pipeline is live** — see §26.
7. **Confirm `AllowOverride`** is enabled for `config/`, `lib/`, and `storage/`
   on the production vhost (reasoned as likely, per §18, but not directly
   server-verified).

## 23. Google Sheets future integration

Not a V1.1 blocker, per the brief. The `LeadRepository` interface is the extension
point — see `docs/LEAD_REFERRAL_V1.md`'s "Migration path" section for the concrete
plan (`GoogleSheetsLeadRepository implements LeadRepository`, wired into
`LeadRepositoryFactory`, zero changes needed anywhere else).

## 24. V2 redesign backlog (not done now, explicitly out of scope for V1.1)

Carried forward from the prior audit, still valid, not attempted here:
- Unify the 3 clashing illustration styles across Problem/Insight/System sections.
- Replace the hero image/poster (currently a screenshot of an old internal admin
  modal) once the platform UI referenced in your brief stabilizes — new hero-video
  requirements are documented in §5 for whenever that happens.
- Resolve the brand-name fragmentation ("Система WB FBS" / "TeraVox Drop" /
  "progress-market.ru" support email) — a positioning decision, not a code fix.
- Full Lighthouse/Core Web Vitals pass once a live/preview URL + browser session are
  both available.
- Responsive image variants (WebP/AVIF, real multi-resolution `srcset`) — flagged
  previously, not addressed in this stabilization pass.

---

## Final status

**CODE READY** — all P0/P1 items implemented, tested at the backend/integration
level, committed to `cloud/market-v1.1` (see §26 in the chat-facing summary for the
exact commit hash and push result). Not `DEPLOYED`, not `LIVE VERIFIED` — no deploy
was performed or requested to be performed, per hard constraints. Full-browser QA
(§20) remains a stated, explicit gap rather than something silently skipped.
