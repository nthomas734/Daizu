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

Deployment is Vercel (auto-deploy on push to GitHub). The README is written for a non-technical operator and assumes zero local tooling — schema changes are applied by pasting SQL into the Supabase dashboard SQL Editor, not by a migration CLI.

## Environment variables

Set in Vercel (changes require a redeploy to take effect):

- `DAIZU_PASSWORD` — the single shared site password
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `PUSHOVER_APP_TOKEN`, `PUSHOVER_BARISTA_KEY`, `PUSHOVER_CUSTOMER_KEY`

## What this is

A private two-person home cafe/bar PWA. One person (the customer) orders a coffee or cocktail from a split-flap menu board; the other (the barista/bartender) gets a push notification, works the queue, and taps "ready", which pushes a Japanese phrase back to the customer. Next.js 15 App Router + React 19, Supabase for storage, Pushover for notifications.

## Auth model — `middleware.ts`

Auth is a single shared password behind a cookie gate, not Supabase Auth. There are no user accounts.

`middleware.ts` runs on every request (matcher excludes only `_next/static`, `_next/image`, `favicon.ico`). It allow-lists `/auth`, `/api/auth`, `/manifest.json`, and `/icon-*` so the login page and PWA shell can load unauthenticated. Everything else requires the `daizu_auth` cookie to equal the literal constant `AUTH_COOKIE_VALUE` (`'admit_one'`); otherwise it redirects to `/auth?next=<original path>`. `POST /api/auth` compares the submitted password to `DAIZU_PASSWORD` and, on match, sets that httpOnly cookie with a one-year max-age. Cookie name/value/TTL constants live in `lib/auth.ts` and are shared by both middleware and the route — change them there, never inline.

Consequence: the barista hub at `/barista` is *not* separately protected. It is only "hidden" behind a 350ms long-press on a nearly invisible brass dot in the bottom-right of the menu screen (`BaristaDot` in `app/page.tsx`). The README describes this as a triple-tap; the code is a long-press.

## Data flow

All database access goes through Next API routes using `supabaseAdmin()` (service-role key, RLS bypassed). The browser never talks to Supabase directly — `lib/supabase.ts` also exports an anon-key `supabase` client, but **nothing currently imports it**. Client pages fetch `/api/*` with `cache: 'no-store'`.

There are no websockets/realtime subscriptions; status updates come from **polling**: the barista queue polls `/api/orders` every 4s, the customer confirm screen polls `/api/orders/[id]` every 3s.

Order lifecycle:

1. `/` menu → `/customize/[drink]` → `POST /api/orders` inserts the row (status `received`) and fires a Pushover to `barista`. If `saveAsFav` is set, it also inserts a favorites row in the same handler — there is no favorites POST endpoint, and no favorites delete.
2. Client redirects to `/confirm/[id]`, which polls for status.
3. Barista opens `/barista/order/[id]` → `PATCH /api/orders/[id]/status` advances to `brewing` (that route accepts only `received`/`brewing`/`cancelled`).
4. "Ready for pickup" hits `POST /api/orders/[id]/ready` — a dedicated route because it does more than a status change: it reads the order's category, picks a random phrase via `pickReadyPhrase(category)` (separate cafe/bar phrase pools in `lib/pushover.ts`), persists `ready_phrase_jp`/`ready_phrase_en` + `ready_at`, and pushes to `customer`.

`GET /api/orders` returns only the last 24h. `DELETE /api/orders` clears all non-`ready` orders ("clear all"). `sendPushover` never throws and no-ops with a console warning when tokens are missing, so a misconfigured Pushover degrades silently rather than failing the order.

## Supabase schema vs. the app

`supabase/schema.sql` (run once) creates `orders`, `favorites`, `out_of_stock`; `supabase/migration_bar.sql` (run after) adds bar-mode columns (`category`, `strength`, `quantity`, `spirit`) and relaxes `temp` to nullable for cocktails.

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
