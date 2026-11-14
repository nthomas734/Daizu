import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPushover, pickReadyPhrase } from '@/lib/pushover';
import { sendToEndpoint, sendToRole } from '@/lib/push-server';
import { hopper, logShot, shotsFor } from '@/lib/beans-server';
import { recipeOf, type Advice } from '@/lib/beans';
import { MILK_DRINKS } from '@/lib/menu';

export const runtime = 'nodejs';

// body { seconds? } — the shot time from the ready bar's chip. With a bag in
// the hopper that has a recipe, a coffee marked ready also logs one shot at
// the recipe's numbers (unless "log the whole shot" already logged one for
// this order), so the bag count stays right and an off shot carries advice
// to the next one.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = supabaseAdmin();
  const body = await req.json().catch(() => ({}));

  // Fetch category first so the ready phrase is appropriate for café vs bar
  const { data: existing } = await sb
    .from('daizu_orders')
    .select('*')
    .eq('id', id)
    .single();
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  // A second tap (queue button + order page, two phones) must not ping twice
  if (existing.status === 'ready') {
    return NextResponse.json({ order: existing });
  }
  const category = (existing?.category === 'bar' ? 'bar' : 'cafe') as 'cafe' | 'bar';
  const phrase = pickReadyPhrase(category);

  const { data, error } = await sb
    .from('daizu_orders')
    .update({
      status: 'ready',
      ready_at: new Date().toISOString(),
      ready_phrase_jp: phrase.jp,
      ready_phrase_en: phrase.en,
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  const isCocktail = data.category === 'bar';
  const emoji = isCocktail ? '🍸' : '☕';
  const qty = data.quantity && data.quantity > 1 ? `${data.quantity} ` : '';

  const message = `your ${qty}${data.drink.toLowerCase()}${data.quantity > 1 ? 's are' : ' is'} ready ${emoji}`;
  const push = {
    title: `${emoji} ${phrase.jp}`,
    body: `${message} (${phrase.romaji} · ${phrase.en})`,
    url: `/confirm/${data.id}${isCocktail ? '?from=bar' : ''}`,
    tag: `daizu-ready-${data.id}`,
  };

  // Back to the phone that ordered; if it never opted in (or has since
  // gone away), every customer device; Pushover only if nobody's on web
  // push yet.
  let pushed = data.push_endpoint ? await sendToEndpoint(data.push_endpoint, push) : 0;
  if (pushed === 0) pushed = await sendToRole('customer', push);
  if (pushed === 0) {
    await sendPushover('customer', `${phrase.jp}\n${message}\n(${phrase.romaji} · ${phrase.en})`, { title: `${emoji} daizu` });
  }

  const advice = data.category === 'bar' ? null : await logReadyShot(data, body.seconds);
  return NextResponse.json({ order: data, advice });
}

async function logReadyShot(order: { id: number; drink: string }, seconds: unknown): Promise<Advice | null> {
  try {
    const bag = await hopper();
    if (!bag) return null;
    const recipe = recipeOf(await shotsFor(bag.id));
    if (!recipe) return null;
    const { data: already } = await supabaseAdmin().from('daizu_shots').select('id').eq('order_id', order.id).limit(1);
    if (already?.length) return null;
    const secs = Number(seconds);
    const res = await logShot(
      {
        bean_id: bag.id,
        order_id: order.id,
        grind: recipe.grind,
        dose_g: recipe.dose_g,
        beans_in_g: recipe.beans_in_g,
        yield_g: recipe.yield_g,
        seconds: Number.isFinite(secs) && secs > 0 ? Math.round(secs) : recipe.seconds,
      },
      { fromOrder: true, inMilk: MILK_DRINKS.includes(order.drink) }
    );
    return res?.advice ?? null;
  } catch (err) {
    console.error('ready shot failed:', err);
    return null;
  }
}
