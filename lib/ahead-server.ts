// Order ahead, server side: his morning settings, and the every-minute
// job's work for orders waiting as 'scheduled'. Only import from API
// routes (Node runtime). The sums are in lib/ahead.ts.

import { supabaseAdmin } from '@/lib/supabase';
import { sendToEndpoint, sendToRole } from '@/lib/push-server';
import { fmtG, fmtGrind, parseNext, recipeOf } from '@/lib/beans';
import { hopper, shotsFor } from '@/lib/beans-server';
import { MILK_DRINKS, type Order } from '@/lib/menu';
import { MORNINGS_KV, cleanMornings, due, fmtClock, fmtWeekday, plan, type Mornings } from '@/lib/ahead';

export async function readMornings(): Promise<Mornings> {
  const { data } = await supabaseAdmin().from('home_kv').select('value').eq('key', MORNINGS_KV).maybeSingle();
  return cleanMornings(data?.value);
}

export async function saveMornings(v: unknown): Promise<Mornings> {
  const clean = cleanMornings(v);
  await supabaseAdmin().from('home_kv').upsert({ key: MORNINGS_KV, value: clean, updated_at: new Date().toISOString() });
  return clean;
}

const tag = (id: number) => `daizu-order-${id}`;
const what = (o: Pick<Order, 'drink' | 'temp'>) => `${o.temp === 'iced' ? 'iced ' : ''}${o.drink.toLowerCase()}`;

/** The first ping, the night before: what, when, and what it asks of him. */
export function askPush(o: Order, m: Mornings) {
  const p = plan(o, m)!;
  return {
    title: `☕ ${o.customer}: ${what(o)}, ${fmtWeekday(p.want)} ${fmtClock(p.want)}`,
    body: `${p.early ? `Be up by ${fmtClock(p.upBy)}. ` : ''}Machine on by ${fmtClock(p.onBy)}. Tap to say you've got it.`,
    url: '/barista',
    tag: tag(o.id),
  };
}

/** The numbers for the next shot, for the "start it" ping. */
async function shotLine(o: Order): Promise<string> {
  try {
    const bag = await hopper();
    if (!bag) return '';
    const next = parseNext(bag.next_step);
    const recipe = next ? null : recipeOf(await shotsFor(bag.id));
    const grind = next?.grind ?? recipe?.grind;
    const dose = next?.dose ?? recipe?.dose_g;
    const out = next?.yield ?? recipe?.yield_g;
    if (grind == null || dose == null) return '';
    return ` ${fmtGrind(grind)} · ${fmtG(dose)}g${out != null ? ` → ${fmtG(out)}g` : ''}${MILK_DRINKS.includes(o.drink) && o.temp !== 'iced' ? ', then steam' : ''}.`;
  } catch {
    return '';
  }
}

/** Move a waiting order into the queue. False when something else already did. */
export async function startAhead(id: number): Promise<Order | null> {
  const { data } = await supabaseAdmin()
    .from('daizu_orders')
    .update({ status: 'received', queued_at: new Date().toISOString(), nudges: 0 })
    .eq('id', id)
    .eq('status', 'scheduled')
    .select()
    .maybeSingle();
  return (data as Order | null) ?? null;
}

/**
 * Called every minute by pg_cron (through /api/notify) while any order is
 * 'scheduled'. Each ping is claimed on the row first, so two runs can't
 * both send it.
 */
export async function aheadTick(now = Date.now()) {
  const sb = supabaseAdmin();
  const { data } = await sb.from('daizu_orders').select('*').eq('status', 'scheduled').not('want_at', 'is', null);
  const orders = (data ?? []) as Order[];
  if (orders.length === 0) return { waiting: 0, sent: 0 };
  const m = await readMornings();
  let sent = 0;

  for (const o of orders) {
    const p = plan(o, m);
    if (!p) continue;
    for (const d of due(o, m, now)) {
      if (d === 'start') {
        const started = await startAhead(o.id);
        if (!started) continue;
        sent += await sendToRole('barista', {
          title: `☕ start ${o.customer}'s ${what(o)}`,
          body: `${p.late > 0 ? `Ready about ${fmtClock(p.ready)}.` : `Ready at ${fmtClock(p.want)}.`}${await shotLine(o)}`,
          url: `/barista/order/${o.id}`,
          tag: tag(o.id),
          renotify: true,
        });
        continue;
      }
      // Claim: add the marker only if it isn't there yet
      const { data: claimed } = await sb
        .from('daizu_orders')
        .update({ ahead_sent: [...(o.ahead_sent ?? []), d] })
        .eq('id', o.id)
        .eq('status', 'scheduled')
        .not('ahead_sent', 'cs', `{${d}}`)
        .select('id');
      if (!claimed?.length) continue;
      o.ahead_sent = [...(o.ahead_sent ?? []), d];
      if (d === 'seen2') {
        sent += await sendToRole('barista', { ...askPush(o, m), renotify: true });
      } else {
        sent += await sendToRole('barista', {
          title: d === 'on' ? '☕ machine on' : '☕ machine on, now',
          body: `For ${o.customer}'s ${fmtClock(p.want)} ${what(o)}. Tap when it's on.`,
          url: '/barista',
          tag: 'daizu-ahead-on',
          renotify: true,
        });
      }
    }
  }
  return { waiting: orders.length, sent };
}

/** Tell the phone that ordered (if it takes pings) what he answered. */
export async function tellHer(o: Order, body: string) {
  if (!o.push_endpoint) return 0;
  return sendToEndpoint(o.push_endpoint, { title: '☕ daizu', body, url: `/confirm/${o.id}`, tag: `daizu-ahead-${o.id}` });
}
