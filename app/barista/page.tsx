'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { SwipeRow } from '@/components/SwipeRow';
import { COLORS, DRINKS, MILKS, Order, SYRUPS } from '@/lib/menu';
import { timeAgo } from '@/lib/time';

type OutOfStock = { drinks: string[]; milks: string[]; syrups: string[] };

export default function BaristaHubPage() {
  const router = useRouter();
  const palette = COLORS.cafe;
  const [tab, setTab] = useState<'queue' | 'stats' | 'settings'>('queue');
  const [orders, setOrders] = useState<Order[]>([]);
  const [outOfStock, setOutOfStock] = useState<OutOfStock>({ drinks: [], milks: [], syrups: [] });

  // Poll active orders every 4 seconds
  useEffect(() => {
    let stop = false;
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/orders', { cache: 'no-store' });
        const data = await res.json();
        if (!stop && data.orders) setOrders(data.orders);
      } catch {}
    };
    fetchOrders();
    const t = setInterval(fetchOrders, 4000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  // Fetch out-of-stock once
  useEffect(() => {
    fetch('/api/out-of-stock')
      .then((r) => r.json())
      .then((d) => d.outOfStock && setOutOfStock(d.outOfStock))
      .catch(() => {});
  }, []);

  const active = orders.filter((o) => o.status !== 'ready' && o.status !== 'cancelled');

  const deleteOrder = async (id: number) => {
    await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const clearAll = async () => {
    if (!confirm('Clear all active orders?')) return;
    await fetch('/api/orders', { method: 'DELETE' });
    setOrders((prev) => prev.filter((o) => o.status === 'ready'));
  };

  const toggleStock = async (category: 'drinks' | 'milks' | 'syrups', itemId: string) => {
    setOutOfStock((prev) => ({
      ...prev,
      [category]: prev[category].includes(itemId)
        ? prev[category].filter((x) => x !== itemId)
        : [...prev[category], itemId],
    }));
    await fetch('/api/out-of-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, itemId }),
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: palette.cream,
        color: palette.bg,
        fontFamily: "'Manrope', sans-serif",
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      <div style={{ background: palette.bg, color: palette.cream, padding: '16px 20px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Logo size={28} color={palette.brass} stroke={6} />
            <span
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: '20px',
                fontWeight: 300,
                letterSpacing: '-0.02em',
              }}
            >
              daizu
            </span>
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '10px',
                letterSpacing: '0.25em',
                color: palette.brass,
                textTransform: 'uppercase',
              }}
            >
              barista
            </span>
          </div>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'transparent',
              border: `1px solid ${palette.brass}66`,
              color: palette.brass,
              fontFamily: "'Geist Mono', monospace",
              fontSize: '10px',
              letterSpacing: '0.15em',
              padding: '5px 9px',
              borderRadius: '2px',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            ← exit
          </button>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {(
            [
              { id: 'queue', label: `queue${active.length > 0 ? ` · ${active.length}` : ''}` },
              { id: 'stats', label: 'stats' },
              { id: 'settings', label: 'settings' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: tab === t.id ? palette.cream : palette.brass + '99',
                fontFamily: "'Geist Mono', monospace",
                fontSize: '10px',
                letterSpacing: '0.2em',
                padding: '10px 14px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                borderBottom: `2px solid ${tab === t.id ? palette.brass : 'transparent'}`,
                marginBottom: '-1px',
                fontWeight: tab === t.id ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ height: '1px', background: palette.brass + '22' }} />
      </div>

      {tab === 'queue' && (
        <QueueBody
          active={active}
          palette={palette}
          onPick={(id) => router.push(`/barista/order/${id}`)}
          onDelete={deleteOrder}
          onClearAll={clearAll}
        />
      )}
      {tab === 'stats' && <StatsBody orders={orders} palette={palette} />}
      {tab === 'settings' && (
        <SettingsBody outOfStock={outOfStock} onToggle={toggleStock} palette={palette} />
      )}
    </div>
  );
}

function QueueBody({
  active,
  palette,
  onPick,
  onDelete,
  onClearAll,
}: {
  active: Order[];
  palette: any;
  onPick: (id: number) => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
}) {
  if (active.length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            border: `1px dashed ${palette.bg}33`,
            borderRadius: '2px',
          }}
        >
          <p
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: '22px',
              fontWeight: 300,
              margin: 0,
              color: palette.bg,
            }}
          >
            all caught up.
          </p>
          <p style={{ fontSize: '13px', opacity: 0.6, margin: '8px 0 0', fontStyle: 'italic' }}>
            no orders waiting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <p
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.2em',
            color: palette.surface,
            opacity: 0.6,
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          swipe ← to delete
        </p>
        <button
          onClick={onClearAll}
          style={{
            background: 'transparent',
            border: `1px solid ${palette.accent}66`,
            color: palette.accent,
            fontFamily: "'Geist Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.15em',
            padding: '5px 10px',
            borderRadius: '2px',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          clear all
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {active.map((order) => (
          <SwipeRow key={order.id} onDelete={() => onDelete(order.id)} palette={palette}>
            <button
              onClick={() => onPick(order.id)}
              style={{
                width: '100%',
                background: '#fff',
                border: `1px solid ${palette.bg}22`,
                borderLeft: `4px solid ${
                  order.status === 'received' ? palette.accent : palette.brass
                }`,
                borderRadius: '2px',
                padding: '14px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Fraunces', serif",
                    fontSize: '22px',
                    fontWeight: 300,
                    color: palette.bg,
                  }}
                >
                  {order.drink.toLowerCase()}
                </p>
                <p
                  style={{
                    margin: '2px 0 0',
                    fontSize: '12px',
                    color: palette.surface,
                    opacity: 0.7,
                  }}
                >
                  <span style={{ fontWeight: 600, color: palette.bg }}>{order.customer} · </span>
                  {order.temp}
                  {order.milk && ` · ${order.milk}`}
                  {order.syrups?.length > 0 && ` · ${order.syrups.join(', ')}`}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    background: order.status === 'received' ? palette.accent : palette.brass,
                    color: '#fff',
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: '9px',
                    padding: '3px 8px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    borderRadius: '2px',
                  }}
                >
                  {order.status === 'received' ? '● new' : order.status}
                </span>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: '10px',
                    color: palette.surface,
                    opacity: 0.6,
                    fontFamily: "'Geist Mono', monospace",
                  }}
                >
                  {timeAgo(order.created_at)}
                </p>
              </div>
            </button>
          </SwipeRow>
        ))}
      </div>
    </div>
  );
}

function StatsBody({ orders, palette }: { orders: Order[]; palette: any }) {
  const total = orders.length;
  const drinkCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.drink] = (acc[o.drink] || 0) + 1;
    return acc;
  }, {});
  const topDrink = Object.entries(drinkCounts).sort((a, b) => b[1] - a[1])[0];
  const milkCounts = orders.reduce<Record<string, number>>((acc, o) => {
    if (o.milk) acc[o.milk] = (acc[o.milk] || 0) + 1;
    return acc;
  }, {});
  const tempCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.temp] = (acc[o.temp] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', color: palette.bg }}>
      <h2
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 300,
          fontSize: '30px',
          margin: '0 0 28px',
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
        }}
      >
        you&apos;ve made
        <br />
        <span style={{ color: palette.surface }}>{total} drinks.</span>
      </h2>

      <StatRow
        label="favorite drink"
        value={topDrink ? `${topDrink[0].toLowerCase()} · ${topDrink[1]}×` : '—'}
        palette={palette}
      />
      <StatRow
        label="hot vs iced"
        value={`${tempCounts.hot || 0} hot · ${tempCounts.iced || 0} iced`}
        palette={palette}
      />
      <StatRow
        label="milk preference"
        value={
          Object.entries(milkCounts)
            .map(([k, v]) => `${k} ${v}×`)
            .join(' · ') || '—'
        }
        palette={palette}
      />
      <StatRow
        label="vanilla syrups poured"
        value={`${orders.filter((o) => o.syrups?.includes('vanilla')).length}`}
        palette={palette}
      />
      <StatRow
        label="kisses received"
        value={`${orders.filter((o) => /kiss|love|♡/i.test(o.notes || '')).length} ♡`}
        palette={palette}
      />

      <p
        style={{
          marginTop: '32px',
          textAlign: 'center',
          fontFamily: "'Geist Mono', monospace",
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: palette.surface,
          opacity: 0.5,
          textTransform: 'uppercase',
        }}
      >
        — keep it up, barista —
      </p>
    </div>
  );
}

function StatRow({ label, value, palette }: { label: string; value: string; palette: any }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '16px 0',
        borderBottom: `1px solid ${palette.bg}22`,
      }}
    >
      <span
        style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: palette.surface,
          opacity: 0.7,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: '16px',
          color: palette.bg,
          fontWeight: 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SettingsBody({
  outOfStock,
  onToggle,
  palette,
}: {
  outOfStock: OutOfStock;
  onToggle: (category: 'drinks' | 'milks' | 'syrups', id: string) => void;
  palette: any;
}) {
  return (
    <div style={{ padding: '20px', color: palette.bg }}>
      <h2
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 300,
          fontSize: '26px',
          margin: '0 0 6px',
          letterSpacing: '-0.02em',
        }}
      >
        what&apos;s 86&apos;d today?
      </h2>
      <p
        style={{
          fontSize: '12px',
          color: palette.surface,
          opacity: 0.7,
          fontStyle: 'italic',
          margin: '0 0 24px',
        }}
      >
        tap to hide from the menu
      </p>

      <Group label="drinks" palette={palette}>
        {DRINKS.map((d) => (
          <Toggle
            key={d.name}
            label={d.name.toLowerCase()}
            active={outOfStock.drinks.includes(d.name)}
            onClick={() => onToggle('drinks', d.name)}
            palette={palette}
          />
        ))}
      </Group>

      <Group label="milks" palette={palette}>
        {MILKS.map((m) => (
          <Toggle
            key={m.id}
            label={m.label}
            active={outOfStock.milks.includes(m.id)}
            onClick={() => onToggle('milks', m.id)}
            palette={palette}
          />
        ))}
      </Group>

      <Group label="syrups" palette={palette}>
        {SYRUPS.map((s) => (
          <Toggle
            key={s.id}
            label={s.label}
            active={outOfStock.syrups.includes(s.id)}
            onClick={() => onToggle('syrups', s.id)}
            palette={palette}
          />
        ))}
      </Group>
    </div>
  );
}

function Group({
  label,
  palette,
  children,
}: {
  label: string;
  palette: any;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <p
        style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: palette.surface,
          opacity: 0.6,
          textTransform: 'uppercase',
          margin: '0 0 8px',
        }}
      >
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>
    </div>
  );
}

function Toggle({
  label,
  active,
  onClick,
  palette,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  palette: any;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '11px 14px',
        background: active ? palette.accent + '11' : '#fff',
        border: `1px solid ${active ? palette.accent : palette.bg + '22'}`,
        borderRadius: '2px',
        color: active ? palette.accent : palette.bg,
        fontFamily: "'Manrope', sans-serif",
        fontSize: '13px',
        cursor: 'pointer',
        textAlign: 'left',
        textDecoration: active ? 'line-through' : 'none',
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '9px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        {active ? "86'd" : 'available'}
      </span>
    </button>
  );
}
