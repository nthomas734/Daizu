// POST /api/notify — called by Supabase pg_cron (job `daizu-syrups`, daily
// at 9am Pacific), not by the app. It's allow-listed in middleware.ts
// because cron has no auth cookie; instead it must send x-daizu-key, whose
// sha256 is checked below (the key itself lives in Vault as daizu_alert_key).
//
// body { kind: 'syrups' } — tell the bartender which syrups expire tomorrow
//   or already have. Repeats daily until a new batch is logged or the syrup
//   is 86'd in settings. Silent when everything's fresh. The same run tells
//   him once when a new RoosRoast bag was delivered (beansArrived below).
// body { kind: 'test', role } — ping every device with that role.
// body { kind: 'waiting' } — from pg_cron `daizu-waiting` (every minute, and
//   only when an order is actually waiting): an order still "received" gets
//   a second bartender ping at 3 minutes and a third at 8, then nothing.
//   `nudges` on the order makes each fire once. Same tag as the first push,
//   so it replaces that notification rather than stacking.

import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendToRole } from '@/lib/push-server';
import { SYRUPS, syrupDaysLeft } from '@/lib/menu';
import { hopper, readRoos } from '@/lib/beans-server';
import { ROOS_ANNOUNCED_KV, bagName, fmtDay, nextBag } from '@/lib/supply';

export const runtime = 'nodejs';

const KEY_SHA256 = '01a2793c62fadf5b1e55a3eadb64b6749b738fc8c3e493280a08f8fdd5c35562';

// Vercel runs in UTC; the cafe is in San Diego (en-CA formats YYYY-MM-DD)
function homeToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-daizu-key') || '';
  if (createHash('sha256').update(key).digest('hex') !== KEY_SHA256) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.kind === 'test') {
    const role = body.role === 'customer' ? 'customer' : 'barista';
    const sent = await sendToRole(role, {
      title: '☕ daizu',
      body: 'test ping — notifications are working',
      url: role === 'barista' ? '/barista' : '/',
      tag: 'daizu-test',
    });
    return NextResponse.json({ sent });
  }

  if (body.kind === 'waiting') {
    return NextResponse.json(await nudgeWaiting());
  }

  if (body.kind !== 'syrups') {
    return NextResponse.json({ error: 'unknown_kind' }, { status: 400 });
  }

  const beans = await beansArrived().catch((e) => {
    console.error('beans arrival check failed:', e);
    return null;
  });
  return NextResponse.json({ ...(await syrupsJob()), beans });
}

/**
 * Once per RoosRoast order: "new beans are here", the morning after Home sees
 * the delivered email, until a bag is put in the hopper. Which order was
 * announced is kept in home_kv `daizu_roos_announced`.
 */
async function beansArrived() {
  const sb = supabaseAdmin();
  const [roos, h, { data: bags }, { data: said }] = await Promise.all([
    readRoos(),
    hopper(),
    sb.from('daizu_beans').select('name').order('created_at', { ascending: false }).limit(50),
    sb.from('home_kv').select('value').eq('key', ROOS_ANNOUNCED_KV).maybeSingle(),
  ]);
  const nb = nextBag(roos, h);
  if (nb.stage !== 'delivered' || !nb.orderNumber || said?.value === nb.orderNumber) return { sent: 0, stage: nb.stage };
  const name = bagName(nb.item, bags ?? []) || 'The new bag';
  const sent = await sendToRole('barista', {
    title: '☕ new beans are here',
    body: `${name}, shipped ${fmtDay(nb.shipOn)}. Add the bag when you open it.`,
    url: '/barista?tab=beans',
    tag: 'daizu-beans-arrived',
  });
  await sb.from('home_kv').upsert({ key: ROOS_ANNOUNCED_KV, value: nb.orderNumber, updated_at: new Date().toISOString() });
  return { sent, order: nb.orderNumber };
}

async function syrupsJob() {
  const sb = supabaseAdmin();
  const [{ data: batches }, { data: oos }] = await Promise.all([
    sb.from('daizu_syrup_batches').select('syrup_id, made_on'),
    sb.from('daizu_out_of_stock').select('item_id').eq('category', 'syrups'),
  ]);
  const off = new Set((oos ?? []).map((r) => r.item_id));
  const today = homeToday();

  // A syrup past its shelf life 86s itself, and the morning push says so
  // once (the next day it's 86'd, so it's skipped). Logging a new batch
  // brings it back (POST /api/syrups). "Expires tomorrow" stays a reminder.
  const expired: { id: string; label: string }[] = [];
  const tomorrow: string[] = [];
  for (const b of batches ?? []) {
    const syrup = SYRUPS.find((s) => s.id === b.syrup_id);
    if (!syrup || off.has(syrup.id)) continue;
    const left = syrupDaysLeft(b.made_on, syrup.shelfDays, today);
    if (left <= 0) expired.push({ id: syrup.id, label: syrup.label });
    else if (left === 1) tomorrow.push(syrup.label);
  }
  if (expired.length === 0 && tomorrow.length === 0) {
    return { sent: 0, today };
  }
  if (expired.length) {
    await sb.from('daizu_out_of_stock').upsert(
      expired.map((e) => ({ category: 'syrups', item_id: e.id })),
      { onConflict: 'category,item_id', ignoreDuplicates: true }
    );
  }

  const list = (xs: string[]) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} & ${xs[xs.length - 1]}`);
  const gone = expired.map((e) => e.label);
  const title = gone.length
    ? `🫙 ${list(gone)} ${gone.length > 1 ? 'are' : 'is'} off the menu`
    : `🫙 ${list(tomorrow)} syrup${tomorrow.length > 1 ? 's expire' : ' expires'} tomorrow`;
  const lines = gone.length
    ? [
        `${list(gone)} ${gone.length > 1 ? 'are' : 'is'} past ${gone.length > 1 ? 'their' : 'its'} date and off the menu.`,
        'Log a new batch to bring it back.',
        tomorrow.length ? `${list(tomorrow)} expires tomorrow.` : null,
      ]
    : ['make a new batch tonight?', 'log it in settings, or 86 it to stop these.'];

  const sent = await sendToRole('barista', {
    title,
    body: lines.filter(Boolean).join(' '),
    url: '/barista?tab=more',
    tag: 'daizu-syrups',
  });
  return { sent, expired: gone, tomorrow, today };
}

const NUDGE_AT_MIN = [3, 8];

async function nudgeWaiting() {
  const sb = supabaseAdmin();
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  const { data: orders } = await sb
    .from('daizu_orders')
    .select('id, customer, drink, category, quantity, push_endpoint, created_at, nudges')
    .eq('status', 'received')
    .lt('nudges', NUDGE_AT_MIN.length)
    .gte('created_at', since);

  let sent = 0;
  for (const o of orders ?? []) {
    const ageMin = (Date.now() - new Date(o.created_at).getTime()) / 60_000;
    const due = NUDGE_AT_MIN.filter((m) => ageMin >= m).length;
    if (due <= o.nudges) continue;
    // Claim the nudge first; if another run got there, skip
    const { data: claimed } = await sb
      .from('daizu_orders')
      .update({ nudges: due })
      .eq('id', o.id)
      .eq('nudges', o.nudges)
      .eq('status', 'received')
      .select('id');
    if (!claimed?.length) continue;
    const emoji = o.category === 'bar' ? '🍸' : '☕';
    const qty = o.quantity > 1 ? `${o.quantity} × ` : '';
    sent += await sendToRole(
      'barista',
      {
        title: `${emoji} still waiting`,
        body: `${o.customer} is still waiting · ${qty}${o.drink.toLowerCase()}`,
        url: `/barista/order/${o.id}`,
        tag: `daizu-order-${o.id}`,
        renotify: true,
      },
      o.push_endpoint
    );
  }
  return { sent, checked: orders?.length ?? 0 };
}
