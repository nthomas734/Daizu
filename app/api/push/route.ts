import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST — save (or re-save) this device's push subscription.
// body: { endpoint, p256dh, auth, role: 'barista'|'customer', orderId? }
// orderId attaches the device to an order placed before it opted in, so
// that order's "ready" ping still finds it.
export async function POST(req: NextRequest) {
  const { endpoint, p256dh, auth, role, orderId } = await req.json();
  if (!endpoint || !p256dh || !auth || !['barista', 'customer'].includes(role)) {
    return NextResponse.json({ error: 'invalid_subscription' }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { error } = await sb
    .from('daizu_push')
    .upsert({ endpoint, p256dh, auth, role }, { onConflict: 'endpoint' });
  if (error) {
    console.error('push subscribe failed:', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
  if (orderId) {
    await sb.from('daizu_orders').update({ push_endpoint: endpoint }).eq('id', orderId);
  }
  return NextResponse.json({ ok: true });
}

// DELETE — body: { endpoint }
export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: 'missing_endpoint' }, { status: 400 });
  await supabaseAdmin().from('daizu_push').delete().eq('endpoint', endpoint);
  return NextResponse.json({ ok: true });
}
