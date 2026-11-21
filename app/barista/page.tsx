'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { SwipeRow } from '@/components/SwipeRow';
import {
  COCKTAIL_RECIPES,
  COCKTAILS,
  COLORS,
  DRINKS,
  EXTRAS,
  HIGHBALL_SPIRITS,
  MILK_DRINKS,
  MILKS,
  Order,
  STRENGTH_TO_OZ,
  SYRUPS,
  syrupDaysLeft,
} from '@/lib/menu';
import { timeAgo } from '@/lib/time';
import { currentEndpoint, disablePush, enablePush, getPushStatus, type PushStatus } from '@/lib/push';
import { useViewport } from '@/lib/useViewport';
import { BeansTab } from '@/components/beans/BeansTab';

type Tab = 'queue' | 'order' | 'beans' | 'more';

type OutOfStock = { drinks: string[]; milks: string[]; syrups: string[] };

type PosItem = {
  name: string;
  display: string;
  note: string;
  cat: 'bar' | 'cafe';
};

// One list: the POS reads the same COCKTAILS and DRINKS as the customer menu,
// so a note or spirit can't drift between the two.
const BAR_ITEMS: PosItem[] = COCKTAILS.map((c) => ({
  name: c.name,
  display: c.name.toLowerCase().replace(/^house /, ''),
  note: c.note,
  cat: 'bar' as const,
}));

const CAFE_ITEMS: PosItem[] = DRINKS.map((d) => ({
  name: d.name,
  display: d.name.toLowerCase(),
  note: d.note,
  cat: 'cafe' as const,
}));

// Per-drink accent colors — kura category palette
const DRINK_COLORS: Record<string, string> = {
  'OLD FASHIONED':  '#D4A657', // ochre — bourbon
  'GIN & TONIC':    '#8AA4C2', // dusty blue — crisp
  'DAIQUIRI':       '#7B9F8C', // sage — lime
  'ESPRESSO TINI':  '#B85C5C', // muted red — espresso
  'GOLD COAST':     '#C8A97E', // brass — the house special
  'GARDEN MULE':    '#9B7EC8', // violet — hibiscus
  'NEGRONI':        '#C77B5C', // terracotta — Campari
  'HOUSE HIGHBALL': '#A88BB0', // mauve — versatile
  'ESPRESSO':       '#8B6553', // warm brown
  'LONG BLACK':     '#6B7E8A', // slate
  'AMERICANO':      '#7A8E6B', // muted green
  'CORTADO':        '#B8956A', // warm tan
  'FLAT WHITE':     '#8A9E8A', // soft sage
  'CAPPUCCINO':     '#9E8ABE', // muted purple
  'LATTE':          '#B89E7A', // latte
};
const getDrinkColor = (drink: string) => DRINK_COLORS[drink] ?? '#C8A97E';

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
      <path d="M 18,28 L 38,28 L 36,50 L 20,50 Z" {...p} strokeWidth={2.2} />
      <line x1={20} y1={38} x2={36} y2={38} {...p} strokeWidth={1.5} />
      <circle cx={25} cy={38} r={1.8} fill={c} stroke="none" />
      <circle cx={28} cy={38} r={1.8} fill={c} stroke="none" />
      <circle cx={31} cy={38} r={1.8} fill={c} stroke="none" />
    </g>,

    'FLAT WHITE': <g>
      {wideCup}
      <path d="M 16,36 Q 20,30 24,36 Q 28,42 32,36 Q 36,30 40,36" {...p} strokeWidth={1.5} />
    </g>,

    'CAPPUCCINO': <g>
      {/* cup sides + bottom only — no top line so dome arc connects cleanly */}
      <path d="M 8,26 L 10,50 L 46,50 L 48,26" {...p} strokeWidth={2.2} />
      <path d="M 48,32 Q 54,32 54,40 Q 54,46 48,46" {...p} strokeWidth={2} />
      <ellipse cx={28} cy={52} rx={22} ry={3} {...p} strokeWidth={1.5} />
      {/* foam dome arc — connects exactly to cup top edges */}
      <path d="M 8,26 A 20,13 0 0 1 48,26" {...p} strokeWidth={2.2} />
      <circle cx={28} cy={19} r={4} {...p} strokeWidth={1.5} />
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
  const viewport = useViewport();
  const isTablet = viewport === 'tablet';
  const [tab, setTabState] = useState<Tab>('queue');
  // Opened from the bar menu (?from=bar): the header says "bartender" and
  // exit goes back to the bar menu. From the cafe menu it says "barista".
  const [fromBar, setFromBar] = useState(false);
  // Keep the tab in the URL so "back" from a beans screen returns to it
  const setTab = (t: Tab) => {
    setTabState(t);
    const q = new URLSearchParams();
    if (t !== 'queue') q.set('tab', t);
    if (fromBar) q.set('from', 'bar');
    try { window.history.replaceState(null, '', q.toString() ? `/barista?${q}` : '/barista'); } catch {}
    window.scrollTo(0, 0);
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [outOfStock, setOutOfStock] = useState<OutOfStock>({ drinks: [], milks: [], syrups: [] });
  const [batches, setBatches] = useState<Record<string, string>>({});

  // Deep links: ?tab=beans (bean alerts, beans screens), ?tab=settings or
  // ?tab=more (the syrup reminder; settings now live under "more")
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setFromBar(q.get('from') === 'bar');
    const t = q.get('tab');
    if (t === 'beans' || t === 'order' || t === 'more') setTabState(t);
    else if (t === 'settings' || t === 'stats') setTabState('more');
  }, []);

  useEffect(() => {
    let stop = false;
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/orders', { cache: 'no-store' });
        const data = await res.json();
        if (!stop && data.orders) {
          setOrders(data.orders);
          // Keep the icon badge honest: open orders, cleared when the queue empties
          const open = (data.orders as Order[]).filter((o) => o.status === 'received' || o.status === 'brewing').length;
          const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
          (open > 0 ? nav.setAppBadge?.(open) : nav.clearAppBadge?.())?.catch(() => {});
        }
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
    fetch('/api/syrups', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d.batches && setBatches(d.batches))
      .catch(() => {});
  }, []);

  const logBatch = async (syrupId: string) => {
    const madeOn = localToday();
    setBatches((prev) => ({ ...prev, [syrupId]: madeOn }));
    // A fresh batch puts the syrup back on the menu
    setOutOfStock((prev) => ({ ...prev, syrups: prev.syrups.filter((x) => x !== syrupId) }));
    await fetch('/api/syrups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syrupId, madeOn }),
    });
  };

  // Oldest first: whoever has waited longest is at the top
  const active = orders
    .filter((o) => o.status !== 'ready' && o.status !== 'cancelled')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const deleteOrder = async (id: number) => {
    await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  // One tap from the queue: same route as the order page's ready bar, so
  // the customer still gets the phrase.
  const readyOrder = async (id: number) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'ready' } : o)));
    try {
      const res = await fetch(`/api/orders/${id}/ready`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) setOrders((prev) => prev.filter((o) => o.id !== id));
      else if (data.order) setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)));
    } catch {}
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

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'queue', label: 'queue', badge: active.length },
    { id: 'order', label: 'order' },
    { id: 'beans', label: 'beans' },
    { id: 'more', label: 'more' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: palette.cream, color: palette.bg, width: '100%' }}>
      <div style={{ minHeight: '100vh', fontFamily: "'Manrope', sans-serif", maxWidth: isTablet ? '1200px' : '480px', margin: '0 auto', width: '100%', paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>

        {/* Header: the tabs live in the bottom bar now */}
        <div style={{ background: palette.bg, color: palette.cream, padding: '14px 20px', paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Logo size={26} color={palette.brass} stroke={6} />
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 300, letterSpacing: '-0.02em' }}>
              daizu
            </span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.25em', color: palette.brass, textTransform: 'uppercase' }}>
              {tab === 'queue' ? (fromBar ? 'bartender' : 'barista') : tab}
            </span>
          </div>
          <button
            onClick={() => router.push(fromBar ? '/?mode=bar' : '/')}
            style={{ background: 'transparent', border: `1px solid ${palette.brass}66`, color: palette.brass, fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', padding: '0 12px', minHeight: '36px', borderRadius: '2px', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            ← exit
          </button>
        </div>

        {tab === 'queue' && (
          <QueueBody active={active} palette={palette} onPick={(id) => router.push(`/barista/order/${id}`)} onReady={readyOrder} onDelete={deleteOrder} onClearAll={clearAll} />
        )}
        {tab === 'order' && <OrderBody palette={palette} isTablet={isTablet} />}
        {tab === 'beans' && <BeansTab />}
        {tab === 'more' && (
          <>
            <StatsBody palette={palette} />
            <SettingsBody outOfStock={outOfStock} onToggle={toggleStock} batches={batches} onLogBatch={logBatch} palette={palette} />
          </>
        )}
      </div>

      {/* Bottom tab bar: one-handed at the machine */}
      <nav
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
          background: palette.bg, borderTop: '1px solid #00000033',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <div style={{ maxWidth: isTablet ? '720px' : '480px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '4px 8px' }}>
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={on ? 'page' : undefined}
                style={{
                  minHeight: '56px', background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  fontFamily: "'Geist Mono', monospace", fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: on ? palette.brass : `${palette.brass}88`, fontWeight: on ? 600 : 400,
                }}
              >
                <span style={{ position: 'relative', display: 'block', width: '22px', height: '22px' }}>
                  <TabIcon id={t.id} />
                  {!!t.badge && (
                    <span style={{ position: 'absolute', top: '-7px', left: '15px', minWidth: '18px', padding: '1px 5px', borderRadius: '9px', background: palette.accent, color: '#fff', fontSize: '10px', lineHeight: '14px', letterSpacing: 0, fontWeight: 600, textAlign: 'center' }}>{t.badge}</span>
                  )}
                </span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** Thin brass line icons for the bottom bar (tab icon mockups, option A). */
function TabIcon({ id }: { id: Tab }) {
  const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={{ display: 'block' }}>
      {id === 'queue' && (
        <g {...line}>
          <path d="M3 4.5h18" />
          <rect x="4.5" y="4.5" width="4.5" height="8" rx="0.8" />
          <rect x="10.5" y="4.5" width="4.5" height="11" rx="0.8" />
          <rect x="16.5" y="4.5" width="3" height="6" rx="0.8" />
        </g>
      )}
      {id === 'order' && (
        <g {...line}>
          <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z" />
          <path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" />
          <path d="M10 3.5v4M8 5.5h4" />
        </g>
      )}
      {id === 'beans' && (
        <g {...line}>
          <ellipse cx="12" cy="12" rx="6.5" ry="8.5" transform="rotate(-30 12 12)" />
          <path d="M15.5 5.5c-3 2-1.5 5-3.5 6.5s-4.5 2-4.5 6" />
        </g>
      )}
      {id === 'more' && (
        <g fill="currentColor">
          <circle cx="5.5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="18.5" cy="12" r="1.6" />
        </g>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderBody — bartender POS
// ─────────────────────────────────────────────────────────────────────────────
function OrderBody({ palette, isTablet }: { palette: any; isTablet: boolean }) {
  const [menuMode, setMenuMode] = useState<'bar' | 'cafe'>('bar');
  const [selected, setSelected]   = useState<PosItem | null>(null);
  const [strength, setStrength]   = useState<'light' | 'standard' | 'strong'>('standard');
  const [spirit, setSpirit]       = useState<string>(HIGHBALL_SPIRITS[0].id);
  const [temp, setTemp]           = useState<'hot' | 'iced'>('hot');
  const [qty, setQty]             = useState(1);
  const [name, setName]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent]           = useState(false);

  const items = menuMode === 'bar' ? BAR_ITEMS : CAFE_ITEMS;
  const isHighball = selected?.name === 'HOUSE HIGHBALL';
  const isMilkDrink = selected ? MILK_DRINKS.includes(selected.name) : false;
  const cocktailRecipe = selected?.cat === 'bar' ? COCKTAIL_RECIPES[selected.name] : null;

  const selectItem = (item: PosItem) => {
    setSelected(item);
    setStrength('standard');
    setTemp('hot');
    setQty(1);
    setSpirit(HIGHBALL_SPIRITS[0].id);
    setSent(false);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);

    const payload = selected.cat === 'bar'
      ? { category: 'bar', drink: selected.name, strength, quantity: qty, spirit: isHighball ? spirit : null, customer: name.trim() || 'bar', notes: '' }
      : { category: 'cafe', drink: selected.name, temp, milk: isMilkDrink ? 'whole' : null, syrups: [], sweetness: 'normal', extras: [], customer: name.trim() || 'bar', notes: '' };

    const pushEndpoint = await currentEndpoint();
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, pushEndpoint }),
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
        flex: 1, padding: '8px 0', minHeight: '44px',
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

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Geist Mono', monospace", fontSize: '9px',
    letterSpacing: '0.2em', textTransform: 'uppercase',
    color: palette.brass, margin: '0 0 8px',
  };

  const orderPanel = selected && !sent && (
    <div style={{ background: '#fff', border: `0.5px solid ${palette.bg}11`, borderRadius: '14px', padding: '16px', ...(isTablet ? {} : { marginTop: '12px' }) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', margin: 0, color: palette.bg, fontWeight: 300 }}>{selected.display}</p>
          <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: palette.brass, margin: '2px 0 0', letterSpacing: '0.08em' }}>{selected.note}</p>
        </div>
        <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: `${palette.bg}44`, fontSize: '20px', cursor: 'pointer', padding: 0, lineHeight: 1, width: '44px', height: '44px', marginTop: '-10px', marginRight: '-10px' }}>×</button>
      </div>

      {/* ingredients — cocktails only */}
      {cocktailRecipe && (
        <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: `0.5px solid ${palette.bg}15` }}>
          <p style={labelStyle}>ingredients</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {cocktailRecipe.ingredients.map((ing, i) => {
              const baseOz = STRENGTH_TO_OZ[strength] || '2 oz';
              const scaled = ing.replace(/^2 oz/, baseOz);
              return (
                <li key={i} style={{ fontSize: '12px', color: palette.bg, opacity: 0.75 }}>
                  · {scaled}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* spirit picker — highball only */}
      {isHighball && (
        <div style={{ marginBottom: '14px' }}>
          <p style={labelStyle}>spirit</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {HIGHBALL_SPIRITS.map((s) => (
              <button key={s.id} onClick={() => setSpirit(s.id)} style={{ padding: '7px 16px', minHeight: '44px', border: `0.5px solid ${spirit === s.id ? palette.bg : `${palette.bg}22`}`, borderRadius: '8px', background: spirit === s.id ? palette.bg : 'transparent', color: spirit === s.id ? palette.cream : palette.bg, fontFamily: "'Manrope', sans-serif", fontSize: '12px', cursor: 'pointer', transition: 'all 150ms ease' }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* strength or temp */}
      {selected.cat === 'bar' ? (
        <div style={{ marginBottom: '14px' }}>
          <p style={labelStyle}>strength</p>
          <div style={{ display: 'flex', gap: '6px' }}>
            {pill('light', strength === 'light', () => setStrength('light'))}
            {pill('standard', strength === 'standard', () => setStrength('standard'))}
            {pill('strong', strength === 'strong', () => setStrength('strong'))}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '14px' }}>
          <p style={labelStyle}>temperature</p>
          <div style={{ display: 'flex', gap: '6px' }}>
            {pill('hot', temp === 'hot', () => setTemp('hot'))}
            {pill('iced', temp === 'iced', () => setTemp('iced'))}
          </div>
        </div>
      )}

      {/* quantity */}
      <div style={{ marginBottom: '14px' }}>
        <p style={labelStyle}>quantity</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} style={{ width: 44, height: 44, border: `0.5px solid ${palette.bg}22`, borderRadius: '8px', background: 'none', fontSize: '17px', cursor: qty <= 1 ? 'default' : 'pointer', color: palette.bg, opacity: qty <= 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>−</button>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', minWidth: '22px', textAlign: 'center', color: palette.bg, fontWeight: 300 }}>{qty}</span>
          <button onClick={() => setQty(Math.min(4, qty + 1))} disabled={qty >= 4} style={{ width: 44, height: 44, border: `0.5px solid ${palette.bg}22`, borderRadius: '8px', background: 'none', fontSize: '17px', cursor: qty >= 4 ? 'default' : 'pointer', color: palette.bg, opacity: qty >= 4 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
          {qty > 1 && <span style={{ fontSize: '12px', color: `${palette.bg}55`, fontStyle: 'italic' }}>{qty} drinks</span>}
        </div>
      </div>

      {/* name */}
      <div style={{ marginBottom: '12px' }}>
        <p style={labelStyle}>name</p>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="guest name" style={{ width: '100%', boxSizing: 'border-box', border: `0.5px solid ${palette.bg}22`, borderRadius: '8px', padding: '12px 10px', fontSize: '16px', background: '#fff', color: palette.bg, outline: 'none', fontFamily: "'Manrope', sans-serif" }} />
      </div>

      <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: '13px', minHeight: '52px', background: palette.bg, color: palette.cream, border: 'none', borderRadius: '10px', fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
        {submitting ? 'sending…' : 'send to queue →'}
      </button>
    </div>
  );

  const sentBanner = sent && (
    <div style={{ background: '#fff', border: `0.5px solid ${palette.bg}11`, borderRadius: '14px', padding: '28px 16px', textAlign: 'center', ...(isTablet ? {} : { marginTop: '12px' }) }}>
      <p style={{ fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 300, color: palette.bg, margin: '0 0 4px' }}>queued.</p>
      <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: palette.brass, letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>{selected?.display} · in the queue</p>
    </div>
  );

  return (
    <div style={{ padding: '14px' }}>
      {/* cocktails / coffee toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {(['bar', 'cafe'] as const).map((m) => (
          <button key={m} onClick={() => { setMenuMode(m); setSelected(null); setSent(false); }} style={{ flex: 1, padding: '8px 0', border: `0.5px solid ${menuMode === m ? palette.brass : `${palette.brass}44`}`, borderRadius: '8px', background: menuMode === m ? palette.brass : 'transparent', color: menuMode === m ? palette.bg : palette.brass, fontFamily: "'Geist Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 150ms ease' }}>
            {m === 'bar' ? 'cocktails' : 'coffee'}
          </button>
        ))}
      </div>

      {/* tablet: two-column grid + panel | phone: grid then panel below */}
      {isTablet ? (
        <div style={{ display: 'grid', gridTemplateColumns: selected && !sent ? '1fr 380px' : '1fr', gap: '20px', alignItems: 'start', transition: 'grid-template-columns 300ms ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '8px' }}>
            {items.map((item) => (
              <button key={item.name} onClick={() => selectItem(item)} style={{ background: '#fff', border: selected?.name === item.name ? `1.5px solid ${palette.brass}` : `0.5px solid ${palette.bg}11`, borderRadius: '12px', padding: '14px 8px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'border-color 120ms ease' }}>
                <PosIcon type={item.name} />
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: palette.bg, letterSpacing: '0.04em', marginTop: '9px', lineHeight: 1.35, wordBreak: 'break-word', width: '100%', textAlign: 'center' }}>{item.display}</span>
              </button>
            ))}
          </div>
          <div>
            {orderPanel}
            {sentBanner}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '8px', marginBottom: '12px' }}>
            {items.map((item) => (
              <button key={item.name} onClick={() => selectItem(item)} style={{ background: '#fff', border: selected?.name === item.name ? `1.5px solid ${palette.brass}` : `0.5px solid ${palette.bg}11`, borderRadius: '12px', padding: '14px 8px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'border-color 120ms ease' }}>
                <PosIcon type={item.name} />
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: palette.bg, letterSpacing: '0.04em', marginTop: '9px', lineHeight: 1.35, wordBreak: 'break-word', width: '100%', textAlign: 'center' }}>{item.display}</span>
              </button>
            ))}
          </div>
          {orderPanel}
          {sentBanner}
        </>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// QueueBody (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
/** " · less sweet · extra shot": sweetness and extras when not the default. */
function cafeExtras(order: Order): string {
  const sweet = order.sweetness === 'light' ? 'less sweet' : order.sweetness === 'extra' ? 'extra sweet' : null;
  const extras = (order.extras ?? []).map((e) => EXTRAS.find((x) => x.id === e)?.label ?? e.replace(/_/g, ' '));
  return [sweet, ...extras].filter(Boolean).map((x) => ` · ${x}`).join('');
}

function QueueBody({ active, palette, onPick, onReady, onDelete, onClearAll }: {
  active: Order[]; palette: any; onPick: (id: number) => void; onReady: (id: number) => void; onDelete: (id: number) => void; onClearAll: () => void;
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
        <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: palette.surface, opacity: 0.6, textTransform: 'uppercase', margin: 0 }}>swipe → ready · ← delete</p>
        <button onClick={onClearAll} style={{ background: 'transparent', border: `1px solid ${palette.accent}66`, color: palette.accent, fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', padding: '5px 12px', minHeight: '40px', borderRadius: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>clear all</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {active.map((order) => (
          <SwipeRow key={order.id} onDelete={() => onDelete(order.id)} onReady={() => onReady(order.id)} palette={palette}>
            <div
              style={{
                width: '100%', background: '#fff',
                border: `0.5px solid ${palette.bg}11`,
                borderRadius: '16px',
                display: 'flex', overflow: 'hidden',
              }}
            >
              {/* drink-color accent bar */}
              <div style={{ width: '6px', flexShrink: 0, background: getDrinkColor(order.drink) }} />
              {/* card content — tap opens the recipe */}
              <button
                onClick={() => onPick(order.id)}
                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '18px 8px 18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: palette.bg, fontFamily: "'Manrope', sans-serif" }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 300, color: palette.bg, lineHeight: 1.1 }}>
                    {order.drink.toLowerCase()}
                    {order.category === 'bar' && order.quantity && order.quantity > 1 && (
                      <span style={{ color: getDrinkColor(order.drink), marginLeft: '8px', fontSize: '20px', opacity: 0.9 }}>×{order.quantity}</span>
                    )}
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: '12px', color: palette.bg, opacity: 0.5, letterSpacing: '0.01em' }}>
                    <span style={{ fontWeight: 600, opacity: 0.8 }}>{order.customer}</span>
                    {' · '}
                    {order.category === 'bar' ? (
                      <>{order.strength || 'standard'}{order.spirit && ` · ${order.spirit}`}</>
                    ) : (
                      <>{order.temp}{order.milk && ` · ${order.milk}`}{order.syrups?.length > 0 && ` · ${order.syrups.join(', ')}`}{cafeExtras(order)}</>
                    )}
                  </p>
                  {/* The note rides on the card: the ✓ and the swipe finish a
                      drink without opening it, so the note has to be seen here */}
                  {order.notes?.trim() && (
                    <p style={{
                      margin: '7px 0 0', padding: '5px 9px', borderRadius: '7px', background: `${palette.brass}33`,
                      fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: '13.5px', lineHeight: 1.35, color: palette.bg,
                      display: 'inline-block', maxWidth: '100%', boxSizing: 'border-box',
                    }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>
                        &ldquo;{order.notes.trim()}&rdquo;
                      </span>
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                  <span style={{
                    background: order.status === 'received' ? `${getDrinkColor(order.drink)}22` : `${palette.brass}22`,
                    color: order.status === 'received' ? getDrinkColor(order.drink) : palette.brass,
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: '9px', padding: '4px 10px',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    borderRadius: '20px', fontWeight: 600,
                    display: 'inline-block',
                  }}>
                    {order.status === 'received' ? '● new' : (order.status === 'brewing' && order.category === 'bar' ? '● mixing' : order.status)}
                  </span>
                  <p style={{ margin: '5px 0 0', fontSize: '10px', color: palette.bg, opacity: 0.4, fontFamily: "'Geist Mono', monospace" }}>
                    {timeAgo(order.created_at)}
                  </p>
                </div>
              </button>
              {/* one tap to ready, for when swiping is awkward */}
              <button
                onClick={() => onReady(order.id)}
                aria-label={`mark ${order.drink.toLowerCase()} ready`}
                style={{ flexShrink: 0, alignSelf: 'center', width: '48px', height: '48px', margin: '0 12px 0 4px', borderRadius: '50%', border: `1px solid ${palette.bg}33`, background: 'transparent', color: palette.bg, fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✓
              </button>
            </div>
          </SwipeRow>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatsBody (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
type Stats = {
  made: number; firstOrder: string | null; busiest: { day: string; drinks: number } | null;
  favorite: { drink: string; count: number } | null; hot: number; iced: number; cocktails: number;
  milks: Record<string, number>; kisses: number;
};

// All time, from GET /api/stats. "Made" means marked ready.
function StatsBody({ palette }: { palette: any }) {
  const [st, setSt] = useState<Stats | null>(null);
  useEffect(() => {
    fetch('/api/stats', { cache: 'no-store' }).then((r) => r.json()).then((d) => d.made != null && setSt(d)).catch(() => {});
  }, []);
  const md = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();

  return (
    <div style={{ padding: '20px 20px 0', color: palette.bg }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, fontSize: '30px', margin: '0 0 20px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
        you&apos;ve made<br /><span style={{ color: palette.surface }}>{st ? st.made : '…'} drinks.</span>
      </h2>
      {st && (
        <>
          <StatRow label="first order" value={st.firstOrder ? md(st.firstOrder) : '—'} palette={palette} />
          <StatRow label="busiest night" value={st.busiest ? `${md(st.busiest.day)} · ${st.busiest.drinks}` : '—'} palette={palette} />
          <StatRow label="favorite drink" value={st.favorite ? `${st.favorite.drink.toLowerCase()} · ${st.favorite.count}×` : '—'} palette={palette} />
          <StatRow label="hot · iced · cocktails" value={`${st.hot} · ${st.iced} · ${st.cocktails}`} palette={palette} />
          <StatRow label="milk preference" value={Object.entries(st.milks).map(([k, v]) => `${k} ${v}×`).join(' · ') || '—'} palette={palette} />
          <StatRow label="kisses received" value={`${st.kisses} ♡`} palette={palette} />
        </>
      )}
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
// SettingsBody
// ─────────────────────────────────────────────────────────────────────────────
function SettingsBody({ outOfStock, onToggle, batches, onLogBatch, palette }: {
  outOfStock: OutOfStock; onToggle: (category: 'drinks' | 'milks' | 'syrups', id: string) => void;
  batches: Record<string, string>; onLogBatch: (syrupId: string) => void; palette: any;
}) {
  const today = localToday();
  return (
    <div style={{ padding: '32px 20px 20px', color: palette.bg }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, fontSize: '26px', margin: '0 0 6px', letterSpacing: '-0.02em' }}>what&apos;s 86&apos;d today?</h2>
      <p style={{ fontSize: '12px', color: palette.surface, opacity: 0.7, fontStyle: 'italic', margin: '0 0 24px' }}>tap to hide from the menu</p>
      <Group label="coffee" palette={palette}>
        {DRINKS.map((d) => <Toggle key={d.name} label={d.name.toLowerCase()} active={outOfStock.drinks.includes(d.name)} onClick={() => onToggle('drinks', d.name)} palette={palette} />)}
      </Group>
      <Group label="cocktails" palette={palette}>
        {COCKTAILS.map((c) => <Toggle key={c.name} label={c.name.toLowerCase()} active={outOfStock.drinks.includes(c.name)} onClick={() => onToggle('drinks', c.name)} palette={palette} />)}
      </Group>
      <Group label="milks" palette={palette}>
        {MILKS.map((m) => <Toggle key={m.id} label={m.label} active={outOfStock.milks.includes(m.id)} onClick={() => onToggle('milks', m.id)} palette={palette} />)}
      </Group>
      <Group label="syrups" palette={palette}>
        {SYRUPS.map((s) => <Toggle key={s.id} label={s.label} active={outOfStock.syrups.includes(s.id)} onClick={() => onToggle('syrups', s.id)} palette={palette} />)}
      </Group>
      <Group label="syrup batches" palette={palette}>
        {SYRUPS.map((s) => (
          <BatchRow
            key={s.id}
            label={s.label}
            madeOn={batches[s.id]}
            daysLeft={batches[s.id] ? syrupDaysLeft(batches[s.id], s.shelfDays, today) : null}
            onLog={() => onLogBatch(s.id)}
            palette={palette}
          />
        ))}
      </Group>
      <AlertsToggle palette={palette} />
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

// The phone's own calendar day (San Diego), as YYYY-MM-DD
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();

// One row per syrup: when the batch was made, how long it has left, and a
// tap to log a fresh one today. The 9am reminder reads the same dates.
function BatchRow({ label, madeOn, daysLeft, onLog, palette }: {
  label: string; madeOn?: string; daysLeft: number | null; onLog: () => void; palette: any;
}) {
  const [confirming, setConfirming] = useState(false);
  const urgent = daysLeft !== null && daysLeft <= 1;
  const status =
    daysLeft === null ? 'no batch logged'
    : daysLeft < 0 ? `expired ${-daysLeft}d ago`
    : daysLeft === 0 ? 'expires today'
    : daysLeft === 1 ? 'expires tomorrow'
    : `${daysLeft} days left`;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '9px 10px 9px 14px', background: urgent ? palette.accent + '11' : '#fff', border: `1px solid ${urgent ? palette.accent : palette.bg + '22'}`, borderRadius: '2px' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '13px', color: palette.bg }}>{label}</div>
        <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: urgent ? palette.accent : palette.surface, opacity: urgent ? 1 : 0.6, marginTop: '3px' }}>
          {madeOn ? `made ${shortDate(madeOn)} · ` : ''}{status}
        </div>
      </div>
      <button
        onClick={() => {
          if (!confirming) { setConfirming(true); setTimeout(() => setConfirming(false), 2500); return; }
          setConfirming(false);
          onLog();
        }}
        style={{ flexShrink: 0, background: confirming ? palette.bg : 'transparent', color: confirming ? palette.cream : palette.bg, border: `1px solid ${palette.bg}55`, borderRadius: '2px', padding: '7px 10px', fontFamily: "'Geist Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        {confirming ? 'made today?' : 'new batch'}
      </button>
    </div>
  );
}

// "Order alerts on this phone" — opts this device in as the bartender:
// new orders + the morning syrup reminder.
function AlertsToggle({ palette }: { palette: any }) {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getPushStatus().then(setStatus); }, []);
  if (status === null) return null;

  const on = status === 'barista';
  const toggle = async () => {
    setBusy(true);
    setError('');
    try {
      if (on) await disablePush();
      else await enablePush('barista');
      setStatus(await getPushStatus());
    } catch {
      setError('couldn’t turn on alerts — check notification settings for daizu');
    }
    setBusy(false);
  };

  const note =
    status === 'unsupported' ? 'add daizu to your home screen to get alerts'
    : status === 'denied' ? 'notifications are blocked — allow them in iOS settings › daizu'
    : on ? 'new orders + syrup reminders come to this phone'
    : 'get a ping when an order comes in';

  return (
    <Group label="alerts" palette={palette}>
      <button
        onClick={toggle}
        disabled={busy || status === 'unsupported' || status === 'denied'}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: on ? palette.bg : '#fff', border: `1px solid ${on ? palette.bg : palette.bg + '22'}`, borderRadius: '2px', color: on ? palette.cream : palette.bg, fontFamily: "'Manrope', sans-serif", fontSize: '13px', cursor: 'pointer', textAlign: 'left', opacity: busy ? 0.6 : 1 }}
      >
        <span>order alerts on this phone</span>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: on ? palette.brass : palette.bg }}>{on ? 'on' : 'off'}</span>
      </button>
      <p style={{ fontSize: '12px', color: error ? palette.accent : palette.surface, opacity: error ? 1 : 0.7, fontStyle: 'italic', margin: '2px 0 0' }}>{error || note}</p>
    </Group>
  );
}
