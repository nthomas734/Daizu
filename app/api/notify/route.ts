// POST /api/notify — called by Supabase pg_cron (job `daizu-syrups`, daily
// at 9am Pacific), not by the app. It's allow-listed in middleware.ts
// because cron has no auth cookie; instead it must send x-daizu-key, whose
// sha256 is checked below (the key itself lives in Vault as daizu_alert_key).
//
// body { kind: 'syrups' } — tell the bartender which syrups expire tomorrow
//   or already have. Repeats daily until a new batch is logged or the syrup
//   is 86'd in settings. Silent when everything's fresh.
// body { kind: 'test', role } — ping every device with that role.

import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendToRole } from '@/lib/push-server';
import { SYRUPS, syrupDaysLeft } from '@/lib/menu';

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

  if (body.kind !== 'syrups') {
    return NextResponse.json({ error: 'unknown_kind' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const [{ data: batches }, { data: oos }] = await Promise.all([
    sb.from('daizu_syrup_batches').select('syrup_id, made_on'),
    sb.from('daizu_out_of_stock').select('item_id').eq('category', 'syrups'),
  ]);
  const off = new Set((oos ?? []).map((r) => r.item_id));
  const today = homeToday();

  const expired: string[] = [];
  const tomorrow: string[] = [];
  for (const b of batches ?? []) {
    const syrup = SYRUPS.find((s) => s.id === b.syrup_id);
    if (!syrup || off.has(syrup.id)) continue;
    const left = syrupDaysLeft(b.made_on, syrup.shelfDays, today);
    if (left <= 0) expired.push(syrup.label);
    else if (left === 1) tomorrow.push(syrup.label);
  }
  if (expired.length === 0 && tomorrow.length === 0) {
    return NextResponse.json({ sent: 0, today });
  }

  const list = (xs: string[]) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} & ${xs[xs.length - 1]}`);
  const title = expired.length
    ? `🫙 ${list(expired)} syrup${expired.length > 1 ? 's' : ''} expired`
    : `🫙 ${list(tomorrow)} syrup${tomorrow.length > 1 ? 's expire' : ' expires'} tomorrow`;
  const lines = [
    expired.length ? 'time for a fresh batch.' : 'make a new batch tonight?',
    expired.length && tomorrow.length ? `${list(tomorrow)} expires tomorrow too.` : null,
    "log it in settings, or 86 it to stop these.",
  ];

  const sent = await sendToRole('barista', {
    title,
    body: lines.filter(Boolean).join(' '),
    url: '/barista?tab=settings',
    tag: 'daizu-syrups',
  });
  return NextResponse.json({ sent, expired, tomorrow, today });
}
