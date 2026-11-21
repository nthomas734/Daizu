# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # next dev
npm run build    # next build
npm run start    # next start (production)
npx tsc --noEmit # typecheck (tsconfig has noEmit + strict)
```

There is **no test setup and no linter** in this repo — no test runner, no test files, no `lint` script, no ESLint config. Do not invent test or lint commands; if verification is needed, use `npm run build` / `npx tsc --noEmit`.

Deployment is Vercel (auto-deploy on push to GitHub). The README is written for a non-technical operator and assumes zero local tooling — schema changes are applied through the Supabase dashboard (or connector), not by a migration CLI. **`SCHEMA-SYNC.sql` is the true schema**: every schema change gets added there as a numbered section. The files under `supabase/` are out of date.

## Environment variables

Set in Vercel (changes require a redeploy to take effect):

- `DAIZU_PASSWORD` — the single shared site password
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `PUSHOVER_APP_TOKEN`, `PUSHOVER_BARISTA_KEY`, `PUSHOVER_CUSTOMER_KEY` — legacy; only used as a fallback when no device of the target role is on web push (see below). To retire once Dez's phone is opted in (review A7): delete `sendPushover` and its calls, then the three env vars. The ready phrases already live in `lib/menu.ts`.

Web push needs **no** Vercel env vars: the VAPID public key is a constant in `lib/push.ts`, the private key is in Supabase Vault (`daizu_vapid_private`, read through the service-role-only RPC `daizu_vapid_private()`).

## What this is

A private two-person home cafe/bar PWA. One person (the customer) orders a coffee or cocktail from a split-flap menu board; the other (the barista/bartender) gets a push notification, works the queue, and taps "ready", which pushes a Japanese phrase back to the customer. Next.js 15 App Router + React 19, Supabase for storage, Web Push for notifications (Pushover as legacy fallback). The bartender side also keeps a beans logbook (see below).

## Auth model — `middleware.ts`

Auth is a single shared password behind a cookie gate, not Supabase Auth. There are no user accounts.

`middleware.ts` runs on every request (matcher excludes only `_next/static`, `_next/image`, `favicon.ico`). It allow-lists `/auth`, `/api/auth`, `/manifest.json`, and `/icon-*` so the login page and PWA shell can load unauthenticated. Everything else requires the `daizu_auth` cookie to equal the literal constant `AUTH_COOKIE_VALUE` (`'admit_one'`); otherwise it redirects to `/auth?next=<original path>`. `POST /api/auth` compares the submitted password to `DAIZU_PASSWORD` and, on match, sets that httpOnly cookie with a one-year max-age. Cookie name/value/TTL constants live in `lib/auth.ts` and are shared by both middleware and the route — change them there, never inline.

The dot opens `/barista` from the cafe menu and `/barista?from=bar` from the bar menu; the hub header then says "barista" or "bartender" and exit returns to that menu. The hub's bottom bar (queue · order · beans · more) has thin line icons (`TabIcon` in `app/barista/page.tsx`).

Consequence: the barista hub at `/barista` is *not* separately protected. It is only "hidden" behind a 350ms long-press on a nearly invisible brass dot in the bottom-right of the menu screen (`BaristaDot` in `app/page.tsx`).

## Data flow

All database access goes through Next API routes using `supabaseAdmin()` (service-role key, RLS bypassed). The browser never talks to Supabase directly — `lib/supabase.ts` also exports an anon-key `supabase` client, but **nothing currently imports it**. Client pages fetch `/api/*` with `cache: 'no-store'`.

There are no websockets/realtime subscriptions; status updates come from **polling**: the barista queue polls `/api/orders` every 4s (and sets the icon badge to the open count), the customer confirm screen polls `/api/orders/[id]` every 3s. A 404 on either side means the order was cancelled or cleared, and both screens say so.

Order lifecycle:

1. `/` menu → `/customize/[drink]` → `POST /api/orders` inserts the row (status `received`) and web-pushes every `barista` device except the ordering one (Pushover only if none). If `saveAsFav` is set, it also inserts a favorites row in the same handler. Favorites ("the usual?") are shown only for the name last used on that phone (`localStorage['daizu-name']`); a long-press removes one (`DELETE /api/favorites?id=`).
2. Client redirects to `/confirm/[id]`, which polls for status. Cancelling there calls `DELETE /api/orders/[id]?by=customer`, which pushes "Dez cancelled the latte" with the order's tag so it replaces the new-order notification.
3. Opening `/barista/order/[id]` moves a `received` order to `brewing` by itself (`PATCH /api/orders/[id]/status`, which accepts only `received`/`brewing`/`cancelled`). There is no start button. An order still `received` after 3 and 8 minutes pings the bartender again (pg_cron `daizu-waiting` → `/api/notify {kind:'waiting'}`, counted by `daizu_orders.nudges`).
4. Ready: the bar fixed to the bottom of the order page, the ✓ on a queue card, or a right swipe. All hit `POST /api/orders/[id]/ready`, which is idempotent (a second tap doesn't ping twice), picks a phrase via `pickReadyPhrase(category)` (cafe/bar pools with romaji in `lib/menu.ts`), persists `ready_phrase_jp`/`ready_phrase_en` + `ready_at`, and pushes to the ordering phone. For a cafe order it also logs the shot to the bag in the hopper when that bag has a recipe (body `{seconds}`), and returns `{order, advice}`.

`GET /api/orders` returns only the last 24h. `DELETE /api/orders` clears all non-`ready` orders ("clear all"). `sendPushover` never throws and no-ops with a console warning when tokens are missing, so a misconfigured Pushover degrades silently rather than failing the order.

## Notifications (web push, added 2026-10-12)

- `daizu_push` — one row per opted-in device (`endpoint` unique, `role` = `barista` | `customer`). Role is also kept in `localStorage['daizu-push-role']` so `RegisterSW` can self-heal the subscription on launch (`syncPushSubscription`).
- Bartender opts in from hub → more → "order alerts on this phone". Customer opts in from the confirm screen's "ping me when it's ready" (shown only when this phone isn't subscribed; it also attaches the current order).
- Every order POST carries `pushEndpoint` (the ordering device, from `currentEndpoint()`), stored as `daizu_orders.push_endpoint`. New-order push → all `barista` devices except that endpoint. Ready push → that endpoint, else all `customer` devices, else Pushover.
- Syrup batches: `daizu_syrup_batches (syrup_id, made_on)`; shelf life is `shelfDays` on `SYRUPS` in `lib/menu.ts`, `syrupDaysLeft()` does the math. Logged from hub → more → "syrup batches" (tap "new batch" twice = made today). Logging a batch also un-86s the syrup.
- pg_cron `daizu-syrups` (16:00 UTC ≈ 9am Pacific) POSTs `{kind:'syrups'}` to `/api/notify` with `x-daizu-key` from Vault `daizu_alert_key`; the route checks its sha256. It reminds the bartender about syrups expiring tomorrow; a syrup past its date 86s itself and the push says so once (the next day it is 86'd and skipped). `{kind:'test', role}` pings every device of a role — fire it via pg_net, not curl (Vercel bot checkpoint). `/api/notify` is allow-listed in `middleware.ts`.
- Every bartender push carries `badge` (open orders, from `openOrderCount()`); `public/sw.js` sets the icon badge with it.
- `lib/push-server.ts` is server-only (`runtime = 'nodejs'` on every route that imports it — web-push needs Node crypto). Production URL is `daizu-henna.vercel.app`.

## Beans logbook (added 2026-11-13)

Hub → beans tab. `daizu_beans` (one row per bag; one `in_hopper`; `next_step` holds the open thread as JSON) and `daizu_shots` (every shot, hand-logged or from a cafe order via `order_id`; `is_recipe` marks the bag's recipe). `lib/beans.ts` is pure (bag math, advice rules); `lib/beans-server.ts` writes shots and sends the "about 4 doubles left" push. Screens: `components/beans/BeansTab.tsx`, `/barista/shot`, `/barista/bean`. The advice rules follow his method and are deliberately narrow: one change at a time with the reason, taste decides over time, no channeling diagnosis, no temperature (fixed at 95°C), no milk tracking.

**Shot rows (added 2026-11-21).** Tapping a row in "shots on this bag" opens it: "make it the recipe" (balanced shots only), "fix it" (`/barista/shot?edit=<id>`, the same form filled in, no advice) and "remove" (two taps). Both go through `PATCH /api/shots`: `{id, is_recipe:true}` clears the bag's other recipe and its `next_step`, as `logShot` does; any other fields fix the row in place, keep `pulled_at`, and send no push. A fixed recipe that is no longer balanced stops being the recipe.

**Next bag (added 2026-11-15).** The beans tab's "next bag · roosroast" card (`components/beans/NextBag.tsx`, mockup option B) shows when the next RoosRoast bag ships and lands, the shipping steps, and whether the hopper lasts that long. Data: the Home app reads his RoosRoast emails and saves them to `home_kv` key `roos_coffee` (Home's `src/lib/sources/roos.ts`, at most every 30 min while Home is open); daizu only reads it (`readRoos()`, returned as `roos` by `GET /api/beans`). `lib/supply.ts` is pure: `nextBag()` picks the stage (scheduled, ordered, shipped, out, delivered), falling back to every 14 days from Nov 23 2026 when there is no email. RoosRoast ships the day it charges, so the ship date (Michigan time) is the roast date. Delivery is 4 to 8 days until three bags give his own range. A delivered bag stays on the card until a bag is opened on or after that day; "add it" opens `/barista/bean?name=&roaster=&roast=&grams=` filled in. The "doubles left" push adds where the next bag is, and the daily 9am job pushes "new beans are here" once per order (remembered in `home_kv` key `daizu_roos_announced`).

## Supabase schema vs. the app

**`SCHEMA-SYNC.sql` is the true schema and wins over everything below.** `supabase/schema.sql` (run once) creates `orders`, `favorites`, `out_of_stock`; `supabase/migration_bar.sql` (run after) adds bar-mode columns (`category`, `strength`, `quantity`, `spirit`) and relaxes `temp` to nullable for cocktails.

**Naming mismatch to be aware of:** the SQL files create unprefixed table names, but every API route queries `daizu_orders`, `daizu_favorites`, `daizu_out_of_stock`. The live database evidently uses the `daizu_`-prefixed names; the checked-in SQL is out of date on this point. Match the `daizu_`-prefixed names used in code when writing queries, and expect to translate when reading the SQL files.

RLS is on for all three tables with **select-only public policies and no insert/update/delete policies** — public writes are impossible by design, which is why every write path must go through a service-role API route.

`out_of_stock` rows are `(category, item_id)` pairs with a unique constraint; `POST /api/out-of-stock` is a **toggle** (delete-if-exists, else insert) and `GET` reshapes rows into `{ drinks, milks, syrups }` arrays that the menu uses to grey out items.

## Key conventions

- **`lib/menu.ts` is the single source of truth** for all product data: `DRINKS`, `COCKTAILS`, `SYRUPS`, `EXTRAS`, `MILKS`, `SWEETNESS_LEVELS`, `STRENGTH_LEVELS`, `HIGHBALL_SPIRITS`, both `RECIPES` and `COCKTAIL_RECIPES`, the `Order`/`Favorite` types, and the `COLORS` palettes. Menu changes are edits to this file only — customer menu and barista recipe view both read from it.
- **cafe vs. bar is a mode, not a separate app.** `app/page.tsx` holds `mode: 'cafe' | 'bar'` in local state, initialized from `?mode=bar` or a `/bar` pathname; `app/bar/page.tsx` is literally `export { default } from '../page'` plus a kiosk flag. The mode selects the palette (`COLORS.cafe` green vs `COLORS.bar` blue), the drink list, the note placeholders, the notification emoji, and the ready-phrase pool. It also rewrites the iOS theme-color meta tag at runtime. Bar context is carried between screens via a `?from=bar` query param.
- **Category-conditional payloads.** `POST /api/orders` writes coffee fields as null/empty for bar orders and bar fields as null for cafe orders — one table, two shapes. Preserve that when adding fields.
- **Everything is a client component with inline styles.** There is no CSS file, no Tailwind, no CSS-in-JS library — styling is inline `style={{}}` objects fed by the `palette` object, which is threaded down as a prop. Fonts (Fraunces, Manrope, Noto Serif JP, Geist Mono) load via a stylesheet link in `app/layout.tsx`.
- **Split-flap board is width-constrained.** `SplitFlap.tsx` renders per-character flip tiles from a fixed `FLAP_CHARS` set; the board is 16 chars wide (20 on tablet) and rows are padded/truncated to that width. Cocktails carry a separate `display` field precisely because their names must fit 16 chars. Adding a long drink name means checking it against `BOARD_WIDTH`.
- **Phone vs. tablet layout** comes from `lib/useViewport.ts`, which requires *both* min-width and min-height ≥ 700px so a phone in landscape is never treated as a tablet. Tablet gets a two-column preview layout and larger tile sizes.
- Next 15 dynamic route handlers take `params` as a `Promise` and must be awaited. `useSearchParams()` requires a `Suspense` boundary (see `app/auth/page.tsx`).
- Path alias `@/*` maps to the repo root.
