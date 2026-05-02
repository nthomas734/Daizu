import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPushover, pickReadyPhrase } from '@/lib/pushover';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const phrase = pickReadyPhrase();
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from('orders')
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
