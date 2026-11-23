import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendToRole } from '@/lib/push-server';
import { readMornings, startAhead, tellHer } from '@/lib/ahead-server';
import { BARISTA_NAME, fmtClock, plan } from '@/lib/ahead';
import type { Order } from '@/lib/menu';

export const runtime = 'nodejs';

// PATCH — the taps on an order placed for the morning (status 'scheduled').
//   his:  { action: 'seen' }   got it; her screen says so
//         { action: 'cant' }   can't make it; the order is cancelled and she is told
//         { action: 'on' }     the machine is on; the warm-up counts from now
//         { action: 'start' }  start it now anyway; it joins the queue
//   hers: { action: 'shift', minutes }  or  { action: 'shift', wantAt }
// Anything else about the order goes through the usual routes.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();
  const { data: cur } = await sb.from('daizu_orders').select('*').eq('id', id).maybeSingle();
  if (!cur) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const o = cur as Order;
  if (o.status !== 'scheduled') return NextResponse.json({ error: 'not_waiting', order: o }, { status: 409 });
  const now = new Date().toISOString();
  const save = async (fields: Record<string, unknown>) => {
    const { data } = await sb.from('daizu_orders').update(fields).eq('id', id).eq('status', 'scheduled').select().maybeSingle();
    return data as Order | null;
  };
  const what = o.drink.toLowerCase();

  if (b.action === 'seen') {
    const order = await save({ seen_at: o.seen_at ?? now });
    if (order && !o.seen_at) await tellHer(order, `${BARISTA_NAME}'s got it: ${what} at ${fmtClock(order.want_at!)}.`);
    return NextResponse.json({ order });
  }

  if (b.action === 'cant') {
    const order = await save({ status: 'cancelled' });
    if (order) await tellHer(order, `${BARISTA_NAME} can't make the ${fmtClock(o.want_at!)} ${what}.`);
    return NextResponse.json({ order });
  }

  if (b.action === 'on') {
    // One machine: every order waiting for this morning is warming now
    const win = 6 * 3_600_000;
    const want = Date.parse(o.want_at!);
    await sb
      .from('daizu_orders')
      .update({ on_at: now })
      .eq('status', 'scheduled')
      .is('on_at', null)
      .gte('want_at', new Date(want - win).toISOString())
      .lte('want_at', new Date(want + win).toISOString());
    const { data } = await sb.from('daizu_orders').select('*').eq('id', id).maybeSingle();
    return NextResponse.json({ order: data });
  }

  if (b.action === 'start') {
    return NextResponse.json({ order: await startAhead(o.id) });
  }

  if (b.action === 'shift') {
    const cur = Date.parse(o.want_at!);
    const next = typeof b.wantAt === 'string' ? Date.parse(b.wantAt) : cur + Number(b.minutes) * 60_000;
    if (!Number.isFinite(next) || next < Date.now() || Math.abs(next - cur) > 12 * 3_600_000) {
      return NextResponse.json({ error: 'bad_time' }, { status: 400 });
    }
    // A new time is a new ask: the reminder pings may go out again
    const order = await save({ want_at: new Date(next).toISOString(), ahead_sent: [] });
    if (order) {
      const p = plan(order, await readMornings())!;
      await sendToRole(
        'barista',
        {
          title: `☕ ${o.customer} moved the ${what} to ${fmtClock(next)}`,
          body: o.on_at ? `Start it at ${fmtClock(p.start)}.` : `${p.early ? `Be up by ${fmtClock(p.upBy)}. ` : ''}Machine on by ${fmtClock(p.onBy)}.`,
          url: '/barista',
          tag: `daizu-order-${o.id}`,
          renotify: true,
        },
        o.push_endpoint
      );
    }
    return NextResponse.json({ order });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
