import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hopper, normShot, shotsFor } from '@/lib/beans-server';
import { homeDate, pastRecipes, type Bean, type NextStep } from '@/lib/beans';

// GET — everything the beans tab needs in one call:
//   hopper   the bag in the hopper (or null)
//   shots    every shot on that bag, newest first
//   bags     every bag, newest first (for "you've had this one before")
//   keyShots balanced and recipe shots on every bag (usual range, history)
export async function GET() {
  const sb = supabaseAdmin();
  const [h, { data: bags }, { data: key }] = await Promise.all([
    hopper(),
    sb.from('daizu_beans').select('*').order('created_at', { ascending: false }).limit(100),
    sb.from('daizu_shots').select('*').or('is_recipe.eq.true,taste.eq.balanced').order('pulled_at', { ascending: false }).limit(1000),
  ]);
  const shots = h ? await shotsFor(h.id) : [];
  return NextResponse.json({ hopper: h, shots, bags: bags ?? [], keyShots: (key ?? []).map(normShot) });
}

const clean = (b: any) => ({
  name: typeof b.name === 'string' ? b.name.trim() : undefined,
  roaster: b.roaster === undefined ? undefined : (b.roaster || '').trim() || null,
  roast_date: b.roast_date === undefined ? undefined : b.roast_date || null,
  bag_grams: b.bag_grams === undefined ? undefined : Math.max(1, Math.round(Number(b.bag_grams) || 340)),
  note: b.note === undefined ? undefined : (b.note || '').trim() || null,
});

// POST — a new bag goes into the hopper; the old one is finished today.
// body { name, roaster?, roast_date?, bag_grams?, note? }
export async function POST(req: NextRequest) {
  const body = clean(await req.json());
  if (!body.name) return NextResponse.json({ error: 'name_required' }, { status: 400 });
  const sb = supabaseAdmin();
  const today = homeDate();

  // A bean he's had before starts from what the last bag settled on
  const [{ data: bags }, { data: key }] = await Promise.all([
    sb.from('daizu_beans').select('*'),
    sb.from('daizu_shots').select('*').eq('is_recipe', true).order('pulled_at', { ascending: false }),
  ]);
  const past = pastRecipes(body.name, (bags ?? []) as Bean[], (key ?? []).map(normShot));
  const start = past[0]?.recipe;
  const next: NextStep | null = start
    ? {
        text: 'Start where the last bag settled.',
        grind: start.grind ?? undefined,
        dose: start.dose_g,
        yield: start.yield_g ?? undefined,
      }
    : null;

  await sb.from('daizu_beans').update({ in_hopper: false, finished_on: today }).eq('in_hopper', true);
  const { data, error } = await sb
    .from('daizu_beans')
    .insert({ ...body, in_hopper: true, opened_on: today, next_step: next ? JSON.stringify(next) : null })
    .select()
    .single();
  if (error || !data) {
    console.error('bean insert failed:', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
  return NextResponse.json({ bean: data });
}

// PATCH — fix a bag's details. body { id, name?, roaster?, roast_date?, bag_grams?, note? }
export async function PATCH(req: NextRequest) {
  const raw = await req.json();
  const id = Number(raw.id);
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
  const fields = Object.fromEntries(Object.entries(clean(raw)).filter(([, v]) => v !== undefined));
  if ('name' in fields && !fields.name) return NextResponse.json({ error: 'name_required' }, { status: 400 });
  const { data, error } = await supabaseAdmin().from('daizu_beans').update(fields).eq('id', id).select().single();
  if (error || !data) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  return NextResponse.json({ bean: data });
}
