import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendToRole } from '@/lib/push-server';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('daizu_orders')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ order: data });
}

// ?by=customer — the customer cancelled inside the 5 seconds. Tell the
// bartender, with the order's own tag so it replaces the "new order"
// notification. A bartender's swipe-delete sends no push.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const byCustomer = req.nextUrl.searchParams.get('by') === 'customer';
  const sb = supabaseAdmin();
  const { data: gone, error } = await sb.from('daizu_orders').delete().eq('id', id).select().maybeSingle();
  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
  if (byCustomer && gone) {
    const emoji = gone.category === 'bar' ? '🍸' : '☕';
    await sendToRole(
      'barista',
      {
        title: `${emoji} order cancelled`,
        body: `${gone.customer} cancelled the ${gone.drink.toLowerCase()}`,
        url: '/barista',
        tag: `daizu-order-${gone.id}`,
      },
      gone.push_endpoint
    );
  }
  return NextResponse.json({ ok: true });
}
