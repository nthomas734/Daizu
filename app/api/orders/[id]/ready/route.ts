import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPushover, pickReadyPhrase } from '@/lib/pushover';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = supabaseAdmin();

  // Fetch category first so the ready phrase is appropriate for café vs bar
  const { data: existing } = await sb
    .from('daizu_orders')
    .select('category')
    .eq('id', id)
    .single();
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

  sendPushover(
    'customer',
    `${phrase.jp}\nyour ${qty}${data.drink.toLowerCase()}${data.quantity > 1 ? 's are' : ' is'} ready ${emoji}\n(${phrase.en})`,
    { title: `${emoji} daizu` }
  );

  return NextResponse.json({ order: data });
}
