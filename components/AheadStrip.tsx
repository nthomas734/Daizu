'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Order } from '@/lib/menu';
import { AHEAD_ORDER_KEY, BARISTA_NAME, fmtClock, fmtWeekday } from '@/lib/ahead';

/**
 * On the menu: one line leading back to the order this phone placed for
 * the morning, until it's ready or gone. Renders nothing otherwise.
 */
export function AheadStrip({ palette }: { palette: any }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    let id: string | null = null;
    try { id = localStorage.getItem(AHEAD_ORDER_KEY); } catch {}
    if (!id) return;
    let stop = false;
    const forget = () => { try { localStorage.removeItem(AHEAD_ORDER_KEY); } catch {} };
    const load = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`, { cache: 'no-store' });
        if (res.status === 404) { forget(); if (!stop) setOrder(null); return; }
        const d = await res.json();
        if (stop || !d.order) return;
        if (d.order.status === 'ready') { forget(); setOrder(null); } else setOrder(d.order);
      } catch {}
    };
    load();
    const t = setInterval(load, 20_000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  if (!order || !order.want_at) return null;
  const drink = order.drink.toLowerCase();
  const text =
    order.status === 'cancelled' ? `${BARISTA_NAME} can't make the ${fmtClock(order.want_at)} ${drink}`
    : order.status === 'scheduled' ? `your ${drink} · ${fmtWeekday(order.want_at).toLowerCase()} ${fmtClock(order.want_at)}${order.seen_at ? ` · ${BARISTA_NAME.toLowerCase()}'s got it` : ''}`
    : `your ${drink} is being made`;

  return (
    <button
      onClick={() => router.push(`/confirm/${order.id}`)}
      style={{
        background: 'transparent', border: `1px solid ${palette.brass}66`, borderRadius: '20px', color: palette.brass,
        padding: '10px 16px', minHeight: '44px', cursor: 'pointer', maxWidth: '100%',
        fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase',
      }}
    >
      {text} →
    </button>
  );
}
