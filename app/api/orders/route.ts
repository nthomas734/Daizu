import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPushover } from '@/lib/pushover';

// GET — fetch recent orders (last 24h). The barista hub filters this for
// the queue view; the customer's confirm screen pulls a single order by id.
export async function GET() {
  const sb = supabaseAdmin();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await sb
    .from('orders')
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

  // Build a clean insert payload — only fields the schema knows about
  const payload = {
    customer:  body.customer || body.name || 'Dez',
    drink:     body.drink,
    temp:      body.temp,
    milk:      body.milk ?? null,
    syrups:    body.syrups || [],
    sweetness: body.sweetness || 'normal',
    extras:    body.extras || [],
    notes:     body.notes || '',
    status:    'received',
  };

  const { data, error } = await sb
    .from('orders')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    console.error('orders POST failed:', error);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }

  // Optionally save as a favorite if the customer asked
  if (body.saveAsFav) {
    await sb.from('favorites').insert({
      label: `${body.drink.toLowerCase()} (${body.temp})`,
      drink: body.drink,
      temp: body.temp,
      milk: body.milk ?? null,
      syrups: body.syrups || [],
      sweetness: body.sweetness || 'normal',
      extras: body.extras || [],
      notes: body.notes || '',
      customer: payload.customer,
    });
  }

  // Fire-and-forget pushover (don't block the response on it)
  const description = [
    body.temp,
    body.milk ? `${body.milk} milk` : null,
    body.syrups?.length ? body.syrups.join(', ') : null,
    body.extras?.length ? body.extras.join(', ') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  sendPushover(
    'barista',
    `New order from ${payload.customer}: ${body.drink.toLowerCase()}\n${description}${body.notes ? `\nNote: ${body.notes}` : ''}`,
    { title: '☕ daizu — new order' }
  );

  return NextResponse.json({ order: data });
}

// DELETE — clear all non-ready orders. (Called by "clear all" in barista hub.)
export async function DELETE() {
  const sb = supabaseAdmin();
  const { error } = await sb
    .from('orders')
    .delete()
    .in('status', ['received', 'brewing', 'cancelled']);
  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
