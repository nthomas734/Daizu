import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hopper, logShot } from '@/lib/beans-server';

export const runtime = 'nodejs';

const n = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
const TASTES = ['sour', 'balanced', 'bitter'];
const BODIES = ['thin', 'right', 'heavy'];

// POST — log a shot by hand (the beans tab, or "log the whole shot" from an
// order). Returns the shot and the one-sentence advice.
export async function POST(req: NextRequest) {
  const b = await req.json();
  const beanId = n(b.bean_id) ?? (await hopper())?.id;
  if (!beanId) return NextResponse.json({ error: 'no_bag' }, { status: 400 });
  const orderId = n(b.order_id);

  // From an order: replace the shot that "ready" logged at the recipe, if any
  if (orderId) {
    await supabaseAdmin().from('daizu_shots').delete().eq('order_id', orderId);
  }

  const res = await logShot(
    {
      bean_id: beanId,
      order_id: orderId,
      grind: n(b.grind),
      dose_g: n(b.dose_g) ?? 18,
      beans_in_g: n(b.beans_in_g),
      yield_g: n(b.yield_g),
      seconds: n(b.seconds),
      pressure_seconds: n(b.pressure_seconds),
      after_eco: !!b.after_eco,
      taste: TASTES.includes(b.taste) ? b.taste : null,
      body: BODIES.includes(b.body) ? b.body : null,
      is_recipe: !!b.is_recipe,
      note: typeof b.note === 'string' && b.note.trim() ? b.note.trim() : null,
    },
    { fromOrder: !!orderId }
  );
  if (!res) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  return NextResponse.json(res);
}

// DELETE ?id= — remove a shot logged by mistake
export async function DELETE(req: NextRequest) {
  const id = n(req.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
  await supabaseAdmin().from('daizu_shots').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
