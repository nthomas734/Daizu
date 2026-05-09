import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPushover } from '@/lib/pushover';

// GET — fetch recent orders (last 24h). The barista hub filters this for
// the queue view; the customer's confirm screen pulls a single order by id.
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

// POST — create a new order, then fire a Pushover notification to the barista.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = supabaseAdmin();
  const isCocktail = body.category === 'bar';

  // Build a clean insert payload — only fields the schema knows about.
  // Coffee fields are NULL/empty for bar orders, and vice versa.
  const payload = {
    customer:  body.customer || body.name || 'Dez',
    category:  body.category || 'cafe',
    drink:     body.drink,
    temp:      isCocktail ? null : body.temp,
    milk:      isCocktail ? null : (body.milk ?? null),
    syrups:    isCocktail ? [] : (body.syrups || []),
    sweetness: isCocktail ? null : (body.sweetness || 'normal'),
    extras:    isCocktail ? [] : (body.extras || []),
    strength:  isCocktail ? (body.strength || 'standard') : null,
    quantity:  isCocktail ? (body.quantity || 1) : 1,
    spirit:    isCocktail ? (body.spirit ?? null) : null,
    notes:     body.notes || '',
    status:    'received',
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

  // Optionally save as a favorite
  if (body.saveAsFav) {
    const favLabel = isCocktail
      ? `${body.drink.toLowerCase()}${body.strength && body.strength !== 'standard' ? ` (${body.strength})` : ''}`
      : `${body.drink.toLowerCase()} (${body.temp})`;
    await sb.from('daizu_favorites').insert({
      label: favLabel,
      category: body.category || 'cafe',
      drink: body.drink,
      temp: body.temp ?? null,
      milk: body.milk ?? null,
      syrups: body.syrups || [],
      sweetness: body.sweetness || 'normal',
      extras: body.extras || [],
      strength: isCocktail ? (body.strength || 'standard') : null,
      quantity: isCocktail ? (body.quantity || 1) : 1,
      spirit: isCocktail ? (body.spirit ?? null) : null,
      notes: body.notes || '',
      customer: payload.customer,
    });
  }

  // Build the Pushover notification body. Different shape per category.
  const description = isCocktail
    ? [
        body.quantity && body.quantity > 1 ? `× ${body.quantity}` : null,
        body.strength && body.strength !== 'standard' ? body.strength : null,
        body.spirit ? `with ${body.spirit}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : [
        body.temp,
        body.milk ? `${body.milk} milk` : null,
        body.syrups?.length ? body.syrups.join(', ') : null,
        body.extras?.length ? body.extras.join(', ') : null,
      ]
        .filter(Boolean)
        .join(' · ');

  const title = isCocktail ? '🍸 daizu — new order' : '☕ daizu — new order';
  const msgBody = `New order from ${payload.customer}: ${body.drink.toLowerCase()}${
    description ? `\n${description}` : ''
  }${body.notes ? `\nNote: ${body.notes}` : ''}`;

  sendPushover('barista', msgBody, { title });

  return NextResponse.json({ order: data });
}

// DELETE — clear all non-ready orders. (Called by "clear all" in barista hub.)
export async function DELETE() {
  const sb = supabaseAdmin();
  const { error } = await sb
    .from('daizu_orders')
    .delete()
    .in('status', ['received', 'brewing', 'cancelled']);
  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
