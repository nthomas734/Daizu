# daizu · 大豆

Your home cafe website. This README walks you through every step from "I just downloaded a zip" to "my wife is using the app on her iPhone" — assuming **zero terminal experience**. If you get stuck at any step, take a screenshot and ask Claude.

There are no commands to run on your computer. Everything happens in web browsers, on free services that talk to each other.

**Total time: ~25 minutes.**

---

## Overview of what you're building

There are 4 pieces that need to talk to each other:

1. **GitHub** — stores the code (free)
2. **Supabase** — the database where orders are saved (free)
3. **Pushover** — sends notifications to your phones ($5 one-time per device)
4. **Vercel** — runs the actual website (free)

The flow: you upload the code to GitHub → Vercel reads it from GitHub and runs it as a website → that website talks to Supabase to save orders and to Pushover to ping your phones.

---

## Step 1 — Get accounts on the four services

Sign up for these in any order. **Free** unless noted.

| Service | URL | Notes |
|---|---|---|
| GitHub | github.com | Free. You'll upload code here. |
| Supabase | supabase.com | Free. Sign up with GitHub for simplicity. |
| Vercel | vercel.com | Free. Sign up with GitHub for simplicity. |
| Pushover | pushover.net | Free signup, but the iOS app is **$5 one-time** to receive notifications. |

**Tip:** when signing up for Supabase and Vercel, choose "Sign up with GitHub" — saves you from having three separate logins.

---

## Step 2 — Set up Pushover (~5 min)

You'll install Pushover on **both phones**. The simplest setup is **two separate Pushover accounts** (different emails) — one per phone — so each phone has its own User Key. This is what the app expects.

### 2a. On your phone

1. App Store → search "Pushover Notifications" → install ($4.99 one-time)
2. Sign up at pushover.net with your email (do this on a computer too — easier)
3. Open the app on your phone → sign in with that account
4. The app shows your **User Key** at the top — looks like `u3xR8a2bC...`. **Copy and save this.**

### 2b. On her phone

1. Same: install the app, $4.99
2. Sign up at pushover.net with **a different email** (her email, or a secondary one of yours)
3. Sign in to the app on her phone with this second account
4. Save **her** User Key.

### 2c. Create the "daizu" Application token

This identifies your app to Pushover.

1. On a computer, go to pushover.net → log in with **your** account (the one tied to your phone)
2. Scroll down → click "Create an Application/API Token"
3. Name: `daizu`
4. Type: Application
5. Description: `home cafe` (or whatever)
6. Icon: optional — you can upload `icon-180.png` from this project
7. Click Create
8. On the next page, copy the **API Token/Key** — looks like `axxxxxxxxxxxxxx`. **Save this.**

By the end of this step you should have:
- ✅ Your phone's User Key (from your Pushover app)
- ✅ Her phone's User Key (from her Pushover app, different account)
- ✅ The "daizu" Application Token

---

## Step 3 — Set up Supabase (~5 min)

This is the database.

1. Go to supabase.com → log in → click **"New project"**
2. Project name: `daizu`
3. Database password: make one up and save it somewhere (you won't need it for this app, but Supabase requires it)
4. Region: pick the one closest to you
5. Pricing plan: **Free**
6. Click "Create new project" — wait ~2 minutes for it to provision

### 3a. Run the schema (creates the tables)

1. In the left sidebar, click **SQL Editor** (looks like a database icon)
2. Click **"+ New query"**
3. Open the file `supabase/schema.sql` from this project (just open it in any text editor — Notepad on Windows, TextEdit on Mac)
4. Copy the entire contents and paste into the Supabase SQL editor
5. Click **"Run"** (bottom right)
6. You should see "Success. No rows returned." — that means it worked

### 3b. Grab your API keys

1. In the Supabase sidebar, click the **gear icon (Settings)** at the bottom
2. Click **"API"** under "Project Settings"
3. Copy these three values and save them:
   - **Project URL** — looks like `https://xxxxx.supabase.co`
   - **anon / public** key — long string starting with `eyJ...`
   - **service_role** key — also long, also starts with `eyJ...` ← ⚠️ this one is secret, never share it

By the end of this step you have:
- ✅ Supabase Project URL
- ✅ Supabase anon key
- ✅ Supabase service_role key

---

## Step 4 — Upload the code to GitHub (~5 min)

Since you don't use the terminal, we'll use GitHub's web upload.

1. Go to github.com → log in → top-right "+", click **"New repository"**
2. Repository name: `daizu`
3. **Private** (cleaner, but doesn't really matter)
4. **Do NOT** check "Add a README" or any of the init options. Leave everything empty.
5. Click "Create repository"

You'll land on a page that says "Quick setup". Look for the link that says **"uploading an existing file"** in the middle of the page (small text). Click it.

6. Open the folder where you unzipped this project on your computer
7. Select **all the files and folders inside it** (not the parent folder — go inside) and drag them onto the GitHub upload area
8. Wait for the upload to finish (might take 30 seconds)
9. Scroll down → commit message: `initial commit` → click "Commit changes"

Done. Your code is on GitHub.

> **Note:** the `.env.local` file is automatically excluded because it's in `.gitignore`. That's good — no secrets on GitHub. The `.env.example` is just a template with no real values.

---

## Step 5 — Deploy to Vercel (~5 min)

This is where the website actually runs.

1. Go to vercel.com → log in (sign in with GitHub if you haven't)
2. Click **"Add New..."** → **"Project"**
3. Find your `daizu` repo in the list and click **"Import"**
4. Framework preset should auto-detect as **Next.js** — leave it
5. **Expand "Environment Variables"** — this is critical

Add each of these one at a time. Click "Add" after each. Names must match exactly.

| Name | Value |
|---|---|
| `DAIZU_PASSWORD` | `beanthedog` |
| `PUSHOVER_APP_TOKEN` | (the "daizu" Application Token from Pushover) |
| `PUSHOVER_BARISTA_KEY` | (your phone's Pushover User Key) |
| `PUSHOVER_CUSTOMER_KEY` | (her phone's Pushover User Key) |
| `NEXT_PUBLIC_SUPABASE_URL` | (Supabase Project URL — `https://xxxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (Supabase anon key) |
| `SUPABASE_SERVICE_KEY` | (Supabase service_role key) |

6. Click **"Deploy"**
7. Wait ~2 minutes for the build to finish
8. You'll get a URL like `daizu-xxxxx.vercel.app` — **that's your website**

---

## Step 6 — Test it (~2 min)

1. Open the URL in any browser
2. You'll see the password gate. Enter `beanthedog` → submit
3. You should see the daizu menu, with the split-flap board flipping into Japanese, then English
4. Tap a drink → customize it → tap "send order"
5. **Your phone should buzz** with a Pushover notification — "New order from Dez: latte..."
6. Triple-tap the tiny brass dot in the bottom-right of the menu screen
7. You're now in the barista hub. See your order in the queue.
8. Tap it → tap "start brewing" → tap "ready for pickup"
9. **Her phone should buzz** with a Japanese phrase notification

If both notifications arrived, you're done. 🎉

If not, see **Troubleshooting** below.

---

## Step 7 — Add to home screen (~1 min per phone)

This makes it feel like a native app.

**On her phone:**
1. Open the daizu URL in **Safari** (not Chrome — must be Safari for proper "Add to Home Screen")
2. Enter the password
3. Tap the share icon (square with up-arrow) at the bottom
4. Scroll down → tap **"Add to Home Screen"**
5. Name: `daizu` → Add
6. The brass-on-green icon appears on her home screen
7. Tap it — opens fullscreen, no Safari chrome, feels native

**On your phone, do the same** — but you can also save a separate icon that goes straight to the barista hub:
1. Open `https://your-url.vercel.app/barista` directly in Safari (note the `/barista` at the end)
2. Add to Home Screen, name it `daizu barista`
3. Now you have two icons — one for ordering, one for receiving

Or, just save the menu URL and triple-tap the brass dot when you need to switch to barista mode. Either works.

---

## How to make changes later

The flow:

1. Edit a file on your computer
2. Go to your repo on github.com
3. Find the file, click the pencil icon ("edit")
4. Replace the content with the edited version
5. Commit changes
6. Vercel automatically redeploys within ~1 minute

Or ask Claude to make the change, paste the new file into GitHub.

---

## Custom domain (optional, ~5 min)

If you want `daizu.coffee` instead of `daizu-xxxxx.vercel.app`:

1. Buy the domain from a registrar — Namecheap, Google Domains, Cloudflare
2. In Vercel: project → Settings → Domains → Add
3. Vercel shows DNS records to add at your registrar
4. Paste those records into your registrar's DNS settings
5. Wait ~10 minutes for DNS to propagate
6. Vercel auto-issues an SSL cert

---

## Troubleshooting

**The menu loads but shows no drinks.**
You probably skipped Step 3a. Run the SQL schema.

**Wrong password error even though I'm typing it right.**
Check that `DAIZU_PASSWORD` is set correctly in Vercel. After changing env vars, you need to **redeploy** for changes to take effect: Vercel → Deployments → latest deployment → "..." menu → Redeploy.

**Order goes through but no notification.**
Three things to check:
1. Is the Pushover iOS app open and signed in?
2. Is `PUSHOVER_APP_TOKEN` set in Vercel?
3. Is `PUSHOVER_BARISTA_KEY` set, matching the User Key in your Pushover app?

Test Pushover directly: pushover.net → log in → "send a test notification" form at the bottom. If that works but our app doesn't, the issue is your Vercel env vars. If that doesn't work, the issue is Pushover setup itself.

**Orders aren't showing in the queue.**
Check Supabase → Table Editor → `orders`. Are rows being created? If yes, problem is in the frontend. If no, the API can't write — check `SUPABASE_SERVICE_KEY` in Vercel.

**The app feels slow on first open.**
Vercel's free tier "wakes up" the server on the first request after idle. Subsequent loads are fast. After it's on her home screen this won't be noticeable.

**Split-flap shows blank tiles.**
Font loading race condition. Refresh once and it should be fine. Add to home screen and you won't see it again.

---

## What's where in the code

```
app/
  page.tsx                    ← the menu screen (root URL)
  customize/[drink]/page.tsx  ← drink customization
  confirm/[id]/page.tsx       ← order confirmation + status timeline
  barista/page.tsx            ← barista hub (queue / stats / settings)
  barista/order/[id]/page.tsx ← barista order detail (recipe + ready button)
  auth/page.tsx               ← password gate
  api/                        ← server endpoints
lib/
  menu.ts                     ← all drink/syrup/recipe data
  pushover.ts                 ← notification sending
  supabase.ts                 ← database client
  time.ts                     ← time-ago helper
  auth.ts                     ← cookie constants
components/
  Logo.tsx                    ← the bean+ears SVG
  SplitFlap.tsx               ← the flip-tile animation
  SwipeRow.tsx                ← swipe-to-delete
public/
  icon-180.png                ← iOS home screen icon
  icon-512.png / icon-1024.png
  manifest.json               ← PWA config
supabase/
  schema.sql                  ← database tables (run once)
middleware.ts                 ← auth gate (runs on every request)
```

To change drinks/syrups/extras/recipes: edit `lib/menu.ts`.

---

## You did it

If you got here, you have a working website with a custom espresso ordering system, push notifications to two phones, a database storing every order, and a split-flap menu board. Bean approves. ☕
