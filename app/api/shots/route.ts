import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hopper, logShot, normShot } from '@/lib/beans-server';

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

// PATCH — fix a saved shot, or make it the bag's recipe.
// body { id, is_recipe: true } makes it the recipe: the old recipe is
// cleared and so is the bag's open next step, as saving a recipe does when
// logging. body { id, grind?, dose_g?, ... } fixes the numbers in place:
// pulled_at stays, no advice is worked out and no push is sent.
export async function PATCH(req: NextRequest) {
  const b = await req.json();
  const id = n(b.id);
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: cur } = await sb.from('daizu_shots').select('*').eq('id', id).maybeSingle();
  if (!cur) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (b.is_recipe === true) {
    if (cur.taste !== 'balanced') return NextResponse.json({ error: 'not_balanced' }, { status: 400 });
    await sb.from('daizu_shots').update({ is_recipe: false }).eq('bean_id', cur.bean_id).neq('id', id).eq('is_recipe', true);
    const { data, error } = await sb.from('daizu_shots').update({ is_recipe: true }).eq('id', id).select().single();
    if (error || !data) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
    await sb.from('daizu_beans').update({ next_step: null }).eq('id', cur.bean_id);
    return NextResponse.json({ shot: normShot(data) });
  }

  const fields: Record<string, unknown> = {};
  for (const k of ['grind', 'dose_g', 'yield_g', 'seconds', 'pressure_seconds', 'beans_in_g'] as const) {
    if (k in b) fields[k] = n(b[k]);
  }
  if ('dose_g' in fields && fields.dose_g == null) delete fields.dose_g; // dose is required
  if ('after_eco' in b) fields.after_eco = !!b.after_eco;
  if ('taste' in b) fields.taste = TASTES.includes(b.taste) ? b.taste : null;
  if ('body' in b) fields.body = BODIES.includes(b.body) ? b.body : null;
  if ('note' in b) fields.note = typeof b.note === 'string' && b.note.trim() ? b.note.trim() : null;
  // A recipe that is fixed to something other than balanced stops being the recipe
  if (cur.is_recipe && 'taste' in fields && fields.taste !== 'balanced') fields.is_recipe = false;
  if (Object.keys(fields).length === 0) return NextResponse.json({ shot: normShot(cur) });

  const { data, error } = await sb.from('daizu_shots').update(fields).eq('id', id).select().single();
  if (error || !data) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  return NextResponse.json({ shot: normShot(data) });
}

// DELETE ?id= — remove a shot logged by mistake
export async function DELETE(req: NextRequest) {
  const id = n(req.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
  await supabaseAdmin().from('daizu_shots').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
