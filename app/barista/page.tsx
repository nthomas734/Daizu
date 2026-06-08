'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { SwipeRow } from '@/components/SwipeRow';
import {
  COCKTAILS,
  COLORS,
  DRINKS,
  HIGHBALL_SPIRITS,
  MILK_DRINKS,
  MILKS,
  Order,
  SYRUPS,
} from '@/lib/menu';
import { timeAgo } from '@/lib/time';

type OutOfStock = { drinks: string[]; milks: string[]; syrups: string[] };

type PosItem = {
  name: string;
  display: string;
  note: string;
  cat: 'bar' | 'cafe';
};

const BAR_ITEMS: PosItem[] = [
  { name: 'OLD FASHIONED', display: 'old fashioned', note: 'bourbon · bitters · sugar', cat: 'bar' },
  { name: 'GIN & TONIC',   display: 'gin & tonic',   note: 'gin · tonic · lime',        cat: 'bar' },
  { name: 'DAIQUIRI',      display: 'daiquiri',      note: 'rum · lime · demerara',     cat: 'bar' },
  { name: 'ESPRESSO TINI', display: 'espresso tini', note: 'vodka · espresso · mr black', cat: 'bar' },
  { name: 'GOLD COAST',    display: 'gold coast',    note: 'rye · honey · IPA float',   cat: 'bar' },
  { name: 'GARDEN MULE',   display: 'garden mule',   note: 'gin · hibiscus · ginger',   cat: 'bar' },
  { name: 'NEGRONI',       display: 'negroni',       note: 'gin · campari · vermouth',  cat: 'bar' },
  { name: 'HOUSE HIGHBALL',display: 'highball',      note: 'spirit · soda · citrus',    cat: 'bar' },
];

const CAFE_ITEMS: PosItem[] = [
  { name: 'ESPRESSO',   display: 'espresso',   note: 'double shot',          cat: 'cafe' },
  { name: 'LONG BLACK', display: 'long black', note: 'espresso · hot water', cat: 'cafe' },
  { name: 'AMERICANO',  display: 'americano',  note: 'espresso · water',     cat: 'cafe' },
  { name: 'CORTADO',    display: 'cortado',    note: 'espresso · milk 1:1',  cat: 'cafe' },
  { name: 'FLAT WHITE', display: 'flat white', note: 'espresso · microfoam', cat: 'cafe' },
  { name: 'CAPPUCCINO', display: 'cappuccino', note: 'espresso · foam',      cat: 'cafe' },
  { name: 'LATTE',      display: 'latte',      note: 'espresso · milk',      cat: 'cafe' },
];

// ─────────────────────────────────────────────────────────────────────────────
// POS icon component — brass-line SVG illustrations per drink
// ─────────────────────────────────────────────────────────────────────────────
function PosIcon({ type }: { type: string }) {
  const c = '#C8A97E';
  const p = { fill: 'none' as const, stroke: c, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  // Shared shapes
  const slimCoupe = <path d="M 10,3 Q 14,28 28,32 Q 42,28 46,3 Z" {...p} strokeWidth={2.5} />;
  const coupeSystem = <g>
    {slimCoupe}
    <line x1={28} y1={32} x2={28} y2={50} {...p} strokeWidth={2.5} />
    <line x1={19} y1={50} x2={37} y2={50} {...p} strokeWidth={2.5} />
  </g>;
  const tallGlass = <path d="M 20,2 L 36,2 L 34,54 L 22,54 Z" {...p} strokeWidth={2.5} />;
  const rocksGlass = <path d="M 6,3 L 50,3 L 46,53 L 10,53 Z" {...p} strokeWidth={2.5} />;
  const wideCup = <g>
    <path d="M 10,24 L 46,24 L 44,50 L 12,50 Z" {...p} strokeWidth={2.5} />
    <path d="M 46,30 Q 52,30 52,38 Q 52,46 46,46" {...p} strokeWidth={2} />
    <ellipse cx={28} cy={52} rx={20} ry={3} {...p} strokeWidth={1.5} />
  </g>;

  const icons: Record<string, React.ReactNode> = {
    // ── Cocktails ─────────────────────────────────────────────────────────────
    'OLD FASHIONED': <g>
      {rocksGlass}
      <rect x={14} y={22} width={27} height={20} rx={2} {...p} strokeWidth={2} />
      <line x1={14} y1={22} x2={21} y2={16} {...p} strokeWidth={1.5} />
      <line x1={41} y1={22} x2={48} y2={16} {...p} strokeWidth={1.5} />
      <line x1={21} y1={16} x2={48} y2={16} {...p} strokeWidth={1.5} />
    </g>,

    'GIN & TONIC': <g>
      {tallGlass}
      <circle cx={43} cy={8} r={7} {...p} strokeWidth={2} />
      <line x1={43} y1={1} x2={43} y2={15} {...p} strokeWidth={1.5} />
      <line x1={36} y1={8} x2={50} y2={8} {...p} strokeWidth={1.5} />
    </g>,

    'DAIQUIRI': coupeSystem,

    'ESPRESSO TINI': <g>
      {coupeSystem}
      <ellipse cx={21} cy={13} rx={4} ry={2.2} {...p} strokeWidth={1.5} />
      <ellipse cx={28} cy={9}  rx={4} ry={2.2} {...p} strokeWidth={1.5} />
      <ellipse cx={35} cy={13} rx={4} ry={2.2} {...p} strokeWidth={1.5} />
    </g>,

    'GOLD COAST': <g>
      {coupeSystem}
      <path d="M 28,10 L 30,16 L 37,16 L 31,20 L 34,27 L 28,23 L 22,27 L 25,20 L 19,16 L 26,16 Z" {...p} strokeWidth={1.5} />
    </g>,

    'GARDEN MULE': <g>
      <path d="M 7,8 L 7,52 L 41,52 L 41,8 Z" {...p} strokeWidth={2.5} />
      <path d="M 41,18 Q 52,18 52,32 Q 52,46 41,46" {...p} strokeWidth={2.5} />
      <circle cx={17} cy={7} r={3.5} {...p} strokeWidth={1.5} />
      <circle cx={24} cy={3} r={3.5} {...p} strokeWidth={1.5} />
      <circle cx={31} cy={7} r={3.5} {...p} strokeWidth={1.5} />
    </g>,

    'NEGRONI': <g>
      {rocksGlass}
      {/* expressed orange peel curl */}
      <path d="M 21,14 Q 30,8 35,17 Q 40,26 35,33" {...p} strokeWidth={2} />
      <circle cx={35} cy={33} r={4} {...p} strokeWidth={1.5} />
      <path d="M 32,36 Q 30,42 28,46" {...p} strokeWidth={1.5} />
    </g>,

    'HOUSE HIGHBALL': <g>
      {tallGlass}
      <line x1={32} y1={6} x2={46} y2={1} stroke={c} strokeWidth={2} strokeLinecap="round" />
      <path d="M 36,2 Q 46,2 46,10 Q 46,18 36,18" {...p} strokeWidth={1.5} />
    </g>,

    // ── Coffee ────────────────────────────────────────────────────────────────
    'ESPRESSO': <g>
      <ellipse cx={28} cy={48} rx={18} ry={3.5} {...p} strokeWidth={2} />
      <path d="M 18,28 L 38,28 L 36,46 L 20,46 Z" {...p} strokeWidth={2.5} />
      <path d="M 38,32 Q 44,32 44,38 Q 44,43 38,43" {...p} strokeWidth={2} />
      <ellipse cx={28} cy={28} rx={10} ry={2.5} {...p} strokeWidth={1.5} />
    </g>,

    'LONG BLACK': <g>
      <path d="M 6,30 Q 6,50 28,50 Q 50,50 50,30 L 6,30 Z" {...p} strokeWidth={2.5} />
      <path d="M 50,34 Q 54,34 54,42 Q 54,48 50,48" {...p} strokeWidth={2} />
      <ellipse cx={28} cy={52} rx={22} ry={3} {...p} strokeWidth={1.5} />
      <path d="M 28,22 Q 30,16 28,12" {...p} strokeWidth={1.5} />
    </g>,

    'AMERICANO': <g>
      <path d="M 14,18 L 42,18 L 40,50 L 16,50 Z" {...p} strokeWidth={2.5} />
      <path d="M 42,24 Q 48,24 48,32 Q 48,42 42,42" {...p} strokeWidth={2} />
      <path d="M 22,12 Q 24,6 22,2"  {...p} strokeWidth={1.5} />
      <path d="M 32,10 Q 34,4 32,1"  {...p} strokeWidth={1.5} />
    </g>,

    'CORTADO': <g>
      <path d="M 16,16 L 40,16 L 38,50 L 18,50 Z" {...p} strokeWidth={2.5} />
      <line x1={19} y1={30} x2={37} y2={30} stroke={c} strokeWidth={1.5} />
      <circle cx={24} cy={30} r={1.5} fill={c} stroke="none" />
      <circle cx={28} cy={30} r={1.5} fill={c} stroke="none" />
      <circle cx={32} cy={30} r={1.5} fill={c} stroke="none" />
    </g>,

    'FLAT WHITE': <g>
      {wideCup}
      <path d="M 16,36 Q 20,30 24,36 Q 28,42 32,36 Q 36,30 40,36" {...p} strokeWidth={1.5} />
    </g>,

    'CAPPUCCINO': <g>
      {wideCup}
      <path d="M 10,24 Q 10,12 28,12 Q 46,12 46,24" {...p} strokeWidth={2} />
      <circle cx={28} cy={20} r={3.5} {...p} strokeWidth={1.5} />
    </g>,

    'LATTE': <g>
      <path d="M 12,14 L 44,14 L 42,50 L 14,50 Z" {...p} strokeWidth={2.5} />
      <path d="M 44,20 Q 50,20 50,30 Q 50,42 44,42" {...p} strokeWidth={2} />
      <ellipse cx={28} cy={52} rx={20} ry={3} {...p} strokeWidth={1.5} />
      <path d="M 20,28 Q 24,22 28,28 Q 32,34 36,28" {...p} strokeWidth={1.5} />
      <path d="M 24,36 Q 26,32 28,36 Q 30,40 32,36" {...p} strokeWidth={1.5} />
    </g>,
  };

  return (
    <svg viewBox="0 0 56 56" width={72} height={72} style={{ overflow: 'visible' }}>
      {icons[type] ?? null}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main hub page
// ─────────────────────────────────────────────────────────────────────────────
export default function BaristaHubPage() {
  const router = useRouter();
  const palette = COLORS.cafe;
  const [tab, setTab] = useState<'queue' | 'order' | 'stats' | 'settings'>('queue');
  const [orders, setOrders] = useState<Order[]>([]);
  const [outOfStock, setOutOfStock] = useState<OutOfStock>({ drinks: [], milks: [], syrups: [] });

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
    return () => { stop = true; clearInterval(t); };
  }, []);

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

  const tabs = [
    { id: 'queue'    as const, label: active.length > 0 ? `queue · ${active.length}` : 'queue' },
    { id: 'order'    as const, label: 'order' },
    { id: 'stats'    as const, label: 'stats' },
    { id: 'settings' as const, label: 'settings' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: palette.cream, color: palette.bg, width: '100%' }}>
      <div style={{ minHeight: '100vh', fontFamily: "'Manrope', sans-serif", maxWidth: '480px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: palette.bg, color: palette.cream, padding: '16px 20px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Logo size={28} color={palette.brass} stroke={6} />
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 300, letterSpacing: '-0.02em' }}>
                daizu
              </span>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.25em', color: palette.brass, textTransform: 'uppercase' }}>
                bartender
              </span>
            </div>
            <button
              onClick={() => router.push('/')}
              style={{ background: 'transparent', border: `1px solid ${palette.brass}66`, color: palette.brass, fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', padding: '5px 9px', borderRadius: '2px', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              ← exit
            </button>
          </div>

          {/* Segmented tab control */}
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '12px', padding: '3px', display: 'flex', gap: '2px' }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: '9px 4px', borderRadius: '10px',
                  background: tab === t.id ? palette.brass : 'transparent',
                  color: tab === t.id ? palette.bg : `${palette.brass}77`,
                  border: 'none', cursor: 'pointer',
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: '9px', letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontWeight: tab === t.id ? 600 : 400,
                  transition: 'background 200ms ease, color 200ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'queue' && (
          <QueueBody active={active} palette={palette} onPick={(id) => router.push(`/barista/order/${id}`)} onDelete={deleteOrder} onClearAll={clearAll} />
        )}
        {tab === 'order' && <OrderBody palette={palette} />}
        {tab === 'stats' && <StatsBody orders={orders} palette={palette} />}
        {tab === 'settings' && (
          <SettingsBody outOfStock={outOfStock} onToggle={toggleStock} palette={palette} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderBody — bartender POS
// ─────────────────────────────────────────────────────────────────────────────
function OrderBody({ palette }: { palette: any }) {
  const [menuMode, setMenuMode] = useState<'bar' | 'cafe'>('bar');
  const [selected, setSelected]   = useState<PosItem | null>(null);
  const [strength, setStrength]   = useState<'light' | 'standard' | 'strong'>('standard');
  const [spirit, setSpirit]       = useState('bourbon');
  const [temp, setTemp]           = useState<'hot' | 'iced'>('hot');
  const [qty, setQty]             = useState(1);
  const [name, setName]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent]           = useState(false);

  const items = menuMode === 'bar' ? BAR_ITEMS : CAFE_ITEMS;
  const isHighball = selected?.name === 'HOUSE HIGHBALL';
  const isMilkDrink = selected ? MILK_DRINKS.includes(selected.name) : false;

  const selectItem = (item: PosItem) => {
    setSelected(item);
    setStrength('standard');
    setTemp('hot');
    setQty(1);
    setSpirit('bourbon');
    setSent(false);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);

    const payload = selected.cat === 'bar'
      ? { category: 'bar', drink: selected.name, strength, quantity: qty, spirit: isHighball ? spirit : null, customer: name.trim() || 'bar', notes: '' }
      : { category: 'cafe', drink: selected.name, temp, milk: isMilkDrink ? 'whole' : null, syrups: [], sweetness: 'normal', extras: [], customer: name.trim() || 'bar', notes: '' };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);

    if (data.order) {
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setSelected(null);
        setQty(1);
        setName('');
      }, 1400);
    }
  };

  const pill = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        flex: 1, padding: '8px 0',
        border: `0.5px solid ${active ? palette.bg : `${palette.bg}22`}`,
        borderRadius: '8px',
        background: active ? palette.bg : 'transparent',
        color: active ? palette.cream : palette.bg,
        fontFamily: "'Manrope', sans-serif", fontSize: '12px',
        cursor: 'pointer', transition: 'all 150ms ease',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: '14px' }}>
      {/* cocktails / coffee toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {(['bar', 'cafe'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMenuMode(m); setSelected(null); setSent(false); }}
            style={{
              flex: 1, padding: '8px 0',
              border: `0.5px solid ${menuMode === m ? palette.brass : `${palette.brass}44`}`,
              borderRadius: '8px',
              background: menuMode === m ? palette.brass : 'transparent',
              color: menuMode === m ? palette.bg : palette.brass,
              fontFamily: "'Geist Mono', monospace", fontSize: '9px',
              letterSpacing: '0.15em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 150ms ease',
            }}
          >
            {m === 'bar' ? 'cocktails' : 'coffee'}
          </button>
        ))}
      </div>

      {/* icon grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '8px', marginBottom: '12px' }}>
        {items.map((item) => (
          <button
            key={item.name}
            onClick={() => selectItem(item)}
            style={{
              background: '#fff',
              border: selected?.name === item.name ? `1.5px solid ${palette.brass}` : `0.5px solid ${palette.bg}11`,
              borderRadius: '12px',
              padding: '14px 8px 10px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              transition: 'border-color 120ms ease',
            }}
          >
            <PosIcon type={item.name} />
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: palette.bg, letterSpacing: '0.04em', marginTop: '9px', lineHeight: 1.35, wordBreak: 'break-word', width: '100%', textAlign: 'center' }}>
              {item.display}
            </span>
          </button>
        ))}
      </div>

      {/* order panel */}
      {selected && !sent && (
        <div style={{ background: '#fff', border: `0.5px solid ${palette.bg}11`, borderRadius: '14px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', margin: 0, color: palette.bg, fontWeight: 300 }}>{selected.display}</p>
              <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: palette.brass, margin: '2px 0 0', letterSpacing: '0.08em' }}>{selected.note}</p>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: `${palette.bg}44`, fontSize: '18px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
          </div>

          {/* spirit picker — highball only */}
          {isHighball && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.brass, margin: '0 0 8px' }}>spirit</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {HIGHBALL_SPIRITS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSpirit(s.id)}
                    style={{
                      padding: '7px 12px',
                      border: `0.5px solid ${spirit === s.id ? palette.bg : `${palette.bg}22`}`,
                      borderRadius: '8px',
                      background: spirit === s.id ? palette.bg : 'transparent',
                      color: spirit === s.id ? palette.cream : palette.bg,
                      fontFamily: "'Manrope', sans-serif", fontSize: '12px',
                      cursor: 'pointer', transition: 'all 150ms ease',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* strength (bar) or temp (cafe) */}
          {selected.cat === 'bar' ? (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.brass, margin: '0 0 8px' }}>strength</p>
              <div style={{ display: 'flex', gap: '6px' }}>
                {pill('light', strength === 'light', () => setStrength('light'))}
                {pill('standard', strength === 'standard', () => setStrength('standard'))}
                {pill('strong', strength === 'strong', () => setStrength('strong'))}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.brass, margin: '0 0 8px' }}>temperature</p>
              <div style={{ display: 'flex', gap: '6px' }}>
                {pill('hot', temp === 'hot', () => setTemp('hot'))}
                {pill('iced', temp === 'iced', () => setTemp('iced'))}
              </div>
            </div>
          )}

          {/* quantity */}
          <div style={{ marginBottom: '14px' }}>
            <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.brass, margin: '0 0 8px' }}>quantity</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} style={{ width: 32, height: 32, border: `0.5px solid ${palette.bg}22`, borderRadius: '8px', background: 'none', fontSize: '17px', cursor: qty <= 1 ? 'default' : 'pointer', color: palette.bg, opacity: qty <= 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>−</button>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', minWidth: '22px', textAlign: 'center', color: palette.bg, fontWeight: 300 }}>{qty}</span>
              <button onClick={() => setQty(Math.min(4, qty + 1))} disabled={qty >= 4} style={{ width: 32, height: 32, border: `0.5px solid ${palette.bg}22`, borderRadius: '8px', background: 'none', fontSize: '17px', cursor: qty >= 4 ? 'default' : 'pointer', color: palette.bg, opacity: qty >= 4 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
              {qty > 1 && <span style={{ fontSize: '12px', color: `${palette.bg}55`, fontStyle: 'italic' }}>{qty} drinks</span>}
            </div>
          </div>

          {/* name */}
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.brass, margin: '0 0 8px' }}>name</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="guest name"
              style={{ width: '100%', boxSizing: 'border-box', border: `0.5px solid ${palette.bg}22`, borderRadius: '8px', padding: '9px 10px', fontSize: '13px', background: '#fff', color: palette.bg, outline: 'none', fontFamily: "'Manrope', sans-serif" }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ width: '100%', padding: '13px', background: palette.bg, color: palette.cream, border: 'none', borderRadius: '10px', fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'sending…' : 'send to queue →'}
          </button>
        </div>
      )}

      {/* sent confirmation */}
      {sent && (
        <div style={{ background: '#fff', border: `0.5px solid ${palette.bg}11`, borderRadius: '14px', padding: '28px 16px', textAlign: 'center' }}>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 300, color: palette.bg, margin: '0 0 4px' }}>queued.</p>
          <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: palette.brass, letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>{selected?.display} · in the queue</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QueueBody (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function QueueBody({ active, palette, onPick, onDelete, onClearAll }: {
  active: Order[]; palette: any; onPick: (id: number) => void; onDelete: (id: number) => void; onClearAll: () => void;
}) {
  if (active.length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ padding: '60px 20px', textAlign: 'center', border: `1px dashed ${palette.bg}33`, borderRadius: '2px' }}>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 300, margin: 0, color: palette.bg }}>all caught up.</p>
          <p style={{ fontSize: '13px', opacity: 0.6, margin: '8px 0 0', fontStyle: 'italic' }}>no orders waiting</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: palette.surface, opacity: 0.6, textTransform: 'uppercase', margin: 0 }}>swipe ← to delete</p>
        <button onClick={onClearAll} style={{ background: 'transparent', border: `1px solid ${palette.accent}66`, color: palette.accent, fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', padding: '5px 10px', borderRadius: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>clear all</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {active.map((order) => (
          <SwipeRow key={order.id} onDelete={() => onDelete(order.id)} palette={palette}>
            <button onClick={() => onPick(order.id)} style={{ width: '100%', background: '#fff', border: `1px solid ${palette.bg}22`, borderLeft: `4px solid ${order.status === 'received' ? palette.accent : palette.brass}`, borderRadius: '2px', padding: '14px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 300, color: palette.bg }}>
                  {order.drink.toLowerCase()}
                  {order.category === 'bar' && order.quantity && order.quantity > 1 && (
                    <span style={{ color: palette.accent, marginLeft: '8px', fontSize: '18px' }}>×{order.quantity}</span>
                  )}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: palette.surface, opacity: 0.7 }}>
                  <span style={{ fontWeight: 600, color: palette.bg }}>{order.customer} · </span>
                  {order.category === 'bar' ? (
                    <>{order.strength || 'standard'}{order.spirit && ` · ${order.spirit}`}</>
                  ) : (
                    <>{order.temp}{order.milk && ` · ${order.milk}`}{order.syrups?.length > 0 && ` · ${order.syrups.join(', ')}`}</>
                  )}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ background: order.status === 'received' ? palette.accent : palette.brass, color: '#fff', fontFamily: "'Geist Mono', monospace", fontSize: '9px', padding: '3px 8px', letterSpacing: '0.15em', textTransform: 'uppercase', borderRadius: '2px' }}>
                  {order.status === 'received' ? '● new' : order.status}
                </span>
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: palette.surface, opacity: 0.6, fontFamily: "'Geist Mono', monospace" }}>{timeAgo(order.created_at)}</p>
              </div>
            </button>
          </SwipeRow>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatsBody (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function StatsBody({ orders, palette }: { orders: Order[]; palette: any }) {
  const total = orders.length;
  const drinkCounts = orders.reduce<Record<string, number>>((acc, o) => { acc[o.drink] = (acc[o.drink] || 0) + 1; return acc; }, {});
  const topDrink = Object.entries(drinkCounts).sort((a, b) => b[1] - a[1])[0];
  const milkCounts = orders.reduce<Record<string, number>>((acc, o) => { if (o.milk) acc[o.milk] = (acc[o.milk] || 0) + 1; return acc; }, {});
  const tempCounts = orders.reduce<Record<string, number>>((acc, o) => { acc[o.temp] = (acc[o.temp] || 0) + 1; return acc; }, {});

  return (
    <div style={{ padding: '20px', color: palette.bg }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, fontSize: '30px', margin: '0 0 28px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
        you&apos;ve made<br /><span style={{ color: palette.surface }}>{total} drinks.</span>
      </h2>
      <StatRow label="favorite drink" value={topDrink ? `${topDrink[0].toLowerCase()} · ${topDrink[1]}×` : '—'} palette={palette} />
      <StatRow label="hot vs iced"    value={`${tempCounts.hot || 0} hot · ${tempCounts.iced || 0} iced`} palette={palette} />
      <StatRow label="milk preference" value={Object.entries(milkCounts).map(([k, v]) => `${k} ${v}×`).join(' · ') || '—'} palette={palette} />
      <StatRow label="vanilla syrups poured" value={`${orders.filter((o) => o.syrups?.includes('vanilla')).length}`} palette={palette} />
      <StatRow label="kisses received" value={`${orders.filter((o) => /kiss|love|♡/i.test(o.notes || '')).length} ♡`} palette={palette} />
      <p style={{ marginTop: '32px', textAlign: 'center', fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: palette.surface, opacity: 0.5, textTransform: 'uppercase' }}>
        — keep it up, bartender —
      </p>
    </div>
  );
}

function StatRow({ label, value, palette }: { label: string; value: string; palette: any }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 0', borderBottom: `1px solid ${palette.bg}22` }}>
      <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: palette.surface, opacity: 0.7, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', color: palette.bg, fontWeight: 400 }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SettingsBody (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function SettingsBody({ outOfStock, onToggle, palette }: {
  outOfStock: OutOfStock; onToggle: (category: 'drinks' | 'milks' | 'syrups', id: string) => void; palette: any;
}) {
  return (
    <div style={{ padding: '20px', color: palette.bg }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, fontSize: '26px', margin: '0 0 6px', letterSpacing: '-0.02em' }}>what&apos;s 86&apos;d today?</h2>
      <p style={{ fontSize: '12px', color: palette.surface, opacity: 0.7, fontStyle: 'italic', margin: '0 0 24px' }}>tap to hide from the menu</p>
      <Group label="drinks" palette={palette}>
        {DRINKS.map((d) => <Toggle key={d.name} label={d.name.toLowerCase()} active={outOfStock.drinks.includes(d.name)} onClick={() => onToggle('drinks', d.name)} palette={palette} />)}
      </Group>
      <Group label="milks" palette={palette}>
        {MILKS.map((m) => <Toggle key={m.id} label={m.label} active={outOfStock.milks.includes(m.id)} onClick={() => onToggle('milks', m.id)} palette={palette} />)}
      </Group>
      <Group label="syrups" palette={palette}>
        {SYRUPS.map((s) => <Toggle key={s.id} label={s.label} active={outOfStock.syrups.includes(s.id)} onClick={() => onToggle('syrups', s.id)} palette={palette} />)}
      </Group>
    </div>
  );
}

function Group({ label, palette, children }: { label: string; palette: any; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: palette.surface, opacity: 0.6, textTransform: 'uppercase', margin: '0 0 8px' }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>
    </div>
  );
}

function Toggle({ label, active, onClick, palette }: { label: string; active: boolean; onClick: () => void; palette: any }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: active ? palette.accent + '11' : '#fff', border: `1px solid ${active ? palette.accent : palette.bg + '22'}`, borderRadius: '2px', color: active ? palette.accent : palette.bg, fontFamily: "'Manrope', sans-serif", fontSize: '13px', cursor: 'pointer', textAlign: 'left', textDecoration: active ? 'line-through' : 'none' }}>
      <span>{label}</span>
      <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{active ? "86'd" : 'available'}</span>
    </button>
  );
}
