import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPushover } from '@/lib/pushover';

export async function GET() {
  const sb = supabaseAdmin();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from('daizu_orders')
    .select('*')
    .gte('created_at', dayAgo)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('orders GET failed:', error);
    return NextResponse.json({ error: 'database_error' }, { status: 500 });
  }
  return NextResponse.json({ orders: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = supabaseAdmin();

  const isBar     = body.category === 'bar';
  const isBottle  = isBar && body.subcategory === 'bottle';
  const isCocktail = isBar && !isBottle;
  const isBabyG   = body.drink === 'BABY GUINNESS';

  const payload = {
    customer:    body.customer || 'Guest',
    category:    body.category || 'cafe',
    subcategory: body.subcategory || null,
    drink:       body.drink,
    // coffee fields
    temp:      isBar     ? null : body.temp,
    milk:      isBar     ? null : (body.milk ?? null),
    syrups:    isBar     ? []   : (body.syrups || []),
    sweetness: isBar     ? null : (body.sweetness || 'normal'),
    extras:    isBar     ? []   : (body.extras || []),
    // cocktail fields
    strength: isCocktail ? (body.strength || 'standard') : null,
    quantity: isCocktail ? (body.quantity || 1) : 1,
    spirit:   isCocktail ? (body.spirit ?? null) : null,
    // bottle field
    mixer: isBottle ? (body.mixer ?? null) : null,
    notes: body.notes || '',
    status: 'received',
  };

  const { data, error } = await sb
    .from('daizu_orders')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    console.error('orders POST failed:', error);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }

  // Optionally save as favorite (not for bottles or baby guinness)
  if (body.saveAsFav && !isBottle && !isBabyG) {
    const favLabel = isCocktail
      ? `${body.drink.toLowerCase()}${body.strength && body.strength !== 'standard' ? ` (${body.strength})` : ''}`
      : `${body.drink.toLowerCase()} (${body.temp})`;
    await sb.from('daizu_favorites').insert({
      label: favLabel,
      category: body.category || 'cafe',
      subcategory: body.subcategory || null,
      drink: body.drink,
      temp: body.temp ?? null,
      milk: body.milk ?? null,
      syrups: body.syrups || [],
      sweetness: body.sweetness || 'normal',
      extras: body.extras || [],
      strength: isCocktail ? (body.strength || 'standard') : null,
      quantity: isCocktail ? (body.quantity || 1) : 1,
      spirit: isCocktail ? (body.spirit ?? null) : null,
      mixer: isBottle ? (body.mixer ?? null) : null,
      notes: body.notes || '',
      customer: payload.customer,
    });
  }

  // Build notification
  let title: string;
  let msgBody: string;

  if (isBabyG) {
    title = '🤫 daizu — secret order';
    msgBody = `Secret order from ${payload.customer}: baby guinness`;
  } else if (isBottle) {
    const mixerPart = body.mixer ? ` · ${body.mixer}` : '';
    title = '🍺 daizu — new order';
    msgBody = `${payload.customer}: ${body.drink.toLowerCase()}${mixerPart}${body.notes ? `\nNote: ${body.notes}` : ''}`;
  } else if (isCocktail) {
    const description = [
      body.quantity && body.quantity > 1 ? `× ${body.quantity}` : null,
      body.strength && body.strength !== 'standard' ? body.strength : null,
      body.spirit ? `with ${body.spirit}` : null,
    ].filter(Boolean).join(' · ');
    title = '🍸 daizu — new order';
    msgBody = `${payload.customer}: ${body.drink.toLowerCase()}${description ? `\n${description}` : ''}${body.notes ? `\nNote: ${body.notes}` : ''}`;
  } else {
    const description = [
      body.temp,
      body.milk ? `${body.milk} milk` : null,
      body.syrups?.length ? body.syrups.join(', ') : null,
      body.extras?.length ? body.extras.join(', ') : null,
    ].filter(Boolean).join(' · ');
    title = '☕ daizu — new order';
    msgBody = `${payload.customer}: ${body.drink.toLowerCase()}${description ? `\n${description}` : ''}${body.notes ? `\nNote: ${body.notes}` : ''}`;
  }

  sendPushover('barista', msgBody, { title });

  return NextResponse.json({ order: data });
}

export async function DELETE() {
  const sb = supabaseAdmin();
  const { error } = await sb
    .from('daizu_orders')
    .delete()
    .in('status', ['received', 'brewing', 'cancelled']);
  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
