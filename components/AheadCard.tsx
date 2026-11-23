'use client';

import { useEffect, useState } from 'react';
import { MILKS, type Order } from '@/lib/menu';
import { MORNINGS_DEFAULT, fmtClock, fmtWeekday, plan, type Mornings } from '@/lib/ahead';

const MONO = "'Geist Mono', monospace";
const HOUR = 3_600_000;

export function useMornings(): [Mornings, (m: Mornings) => void] {
  const [m, setM] = useState<Mornings>(MORNINGS_DEFAULT);
  useEffect(() => {
    fetch('/api/mornings', { cache: 'no-store' }).then((r) => r.json()).then((d) => d.mornings && setM(d.mornings)).catch(() => {});
  }, []);
  return [m, setM];
}

/**
 * Hub → queue, above the orders: drinks ordered for the morning, waiting
 * as 'scheduled'. The night before he answers "got it" or "can't"; in the
 * morning "it's on" starts the warm-up count. At start time the order
 * becomes 'received' and moves down into the queue by itself.
 */
export function AheadSection({ orders, palette, onOrder }: { orders: Order[]; palette: any; onOrder: (o: Order) => void }) {
  const [mornings] = useMornings();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);
  if (orders.length === 0) return null;
  return (
    <div style={{ padding: '20px 20px 0' }}>
      <p style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.2em', color: palette.surface, opacity: 0.6, textTransform: 'uppercase', margin: '0 0 12px' }}>for the morning</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {orders.map((o) => <AheadCard key={o.id} order={o} mornings={mornings} now={now} palette={palette} onOrder={onOrder} />)}
      </div>
    </div>
  );
}

function AheadCard({ order, mornings, now, palette, onOrder }: { order: Order; mornings: Mornings; now: number; palette: any; onOrder: (o: Order) => void }) {
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const p = plan(order, mornings);
  if (!p) return null;

  const act = async (action: 'seen' | 'cant' | 'on' | 'start') => {
    if (busy) return;
    if (action === 'cant' && !armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/orders/${order.id}/ahead`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const d = await r.json();
      if (d.order) onOrder(d.order);
    } catch {
      alert('Couldn’t save that. Check the connection and try again.');
    }
    setBusy(false);
  };

  const seen = !!order.seen_at;
  const on = !!order.on_at;
  const morning = now > p.want - 4 * HOUR;
  const milk = order.milk ? MILKS.find((m) => m.id === order.milk)?.label ?? order.milk : null;
  const detail = [order.customer, order.temp, milk].filter(Boolean).join(' · ');
  const steps = [
    { t: on ? fmtClock(order.on_at!) : fmtClock(p.onBy), label: on ? 'on ✓' : 'machine on', lit: on || now >= p.onBy },
    { t: fmtClock(p.start), label: 'start it', lit: now >= p.start },
    { t: fmtClock(p.ready), label: 'ready', lit: false },
  ];
  const btn = (tone: 'dark' | 'line' | 'stop') => ({
    flex: tone === 'dark' ? 2 : 1, minHeight: '48px', borderRadius: '10px', cursor: 'pointer', padding: '0 8px',
    fontFamily: MONO, fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase' as const, fontWeight: 600,
    background: tone === 'dark' ? palette.bg : tone === 'stop' ? `${palette.accent}18` : 'transparent',
    color: tone === 'dark' ? palette.cream : tone === 'stop' ? palette.accent : palette.bg,
    border: `1px solid ${tone === 'dark' ? palette.bg : tone === 'stop' ? palette.accent : `${palette.bg}33`}`,
    opacity: busy ? 0.6 : 1,
  });

  return (
    <div style={{ background: '#fff', border: `0.5px solid ${palette.bg}11`, borderLeft: `3px solid ${seen ? palette.brass : palette.accent}`, borderRadius: '16px', padding: '14px 16px', color: palette.bg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, fontSize: '22px' }}>{order.drink.toLowerCase()}</span>
        <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', padding: '4px 9px', borderRadius: '20px', background: p.late > 0 ? `${palette.accent}22` : `${palette.brass}33`, color: p.late > 0 ? palette.accent : '#6E5530' }}>
          {morning ? `ready ${fmtClock(p.ready)}` : `${fmtWeekday(p.want).toLowerCase()} ${fmtClock(p.want)}`}
        </span>
      </div>
      <div style={{ fontSize: '13px', color: `${palette.bg}99`, marginTop: '2px' }}>
        {detail}{p.late > 0 ? ` · ${p.late} min late` : ''}
      </div>
      {order.notes?.trim() && (
        <p style={{ margin: '8px 0 0', fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: '13.5px', lineHeight: 1.35 }}>&ldquo;{order.notes.trim()}&rdquo;</p>
      )}

      {/* Only when her time gets him up before his usual */}
      {p.early && !on && (
        <div style={{ marginTop: '12px', background: palette.bg, color: palette.cream, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
          <b style={{ display: 'block', fontFamily: "'Fraunces', serif", fontWeight: 300, fontSize: '34px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmtClock(p.upBy)}</b>
          <span style={{ display: 'block', marginTop: '6px', fontFamily: MONO, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: palette.brass }}>be up by · earlier than usual · set your alarm</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginTop: '12px' }}>
        {steps.map((s) => (
          <div key={s.label} style={{ borderTop: `3px solid ${s.lit ? palette.brass : `${palette.bg}14`}`, paddingTop: '6px', fontFamily: MONO, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: `${palette.bg}88` }}>
            <b style={{ display: 'block', fontSize: '12px', color: palette.bg, letterSpacing: 0, marginBottom: '2px', fontVariantNumeric: 'tabular-nums' }}>{s.t}</b>
            {s.label}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
        {!on && <button style={btn(armed ? 'stop' : 'line')} disabled={busy} onClick={() => act('cant')}>{armed ? 'tap again' : 'can’t'}</button>}
        {!seen && <button style={btn('dark')} disabled={busy} onClick={() => act('seen')}>got it</button>}
        {seen && !on && <button style={btn('dark')} disabled={busy} onClick={() => act('on')}>it’s on</button>}
        {on && <button style={btn('line')} disabled={busy} onClick={() => act('start')}>{p.late > 0 ? 'start it now anyway' : 'start it now'}</button>}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: '12px', color: `${palette.bg}88`, lineHeight: 1.4 }}>
        {!seen ? `${order.customer}’s screen says “waiting” until you answer.`
          : !on ? (now >= p.onBy
              ? 'The machine should be on by now. Tap “it’s on” once it is.'
              : `Tap “it’s on” when the machine is on, any time before ${fmtClock(p.onBy)}. You get a ping then too.`)
          : `Warming. You get a ping at ${fmtClock(p.start)} to start it.`}
      </p>
    </div>
  );
}

/** Hub → more: the numbers order ahead runs on. Saved as they change. */
export function MorningsCard({ palette }: { palette: any }) {
  const [m, setM] = useMornings();
  const save = (patch: Partial<Mornings>) => {
    const next = { ...m, ...patch };
    setM(next);
    fetch('/api/mornings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
      .then((r) => r.json()).then((d) => d.mornings && setM(d.mornings)).catch(() => {});
  };
  const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '8px 14px', minHeight: '52px', background: '#fff', border: `1px solid ${palette.bg}22`, borderRadius: '2px', color: palette.bg, fontFamily: "'Manrope', sans-serif", fontSize: '13px' };
  const input = { width: '132px', minHeight: '36px', border: `1px solid ${palette.bg}33`, borderRadius: '8px', padding: '0 8px', fontFamily: MONO, fontSize: '16px', color: palette.bg, background: '#fff', textAlign: 'center' as const };
  const small = { display: 'block', fontSize: '11px', color: `${palette.bg}88`, marginTop: '1px' };
  const time = (label: string, key: 'upWeekday' | 'upWeekend') => (
    <label style={row}><span>{label}</span><input type="time" style={input} value={m[key]} onChange={(e) => e.target.value && save({ [key]: e.target.value })} /></label>
  );
  const minutes = (label: string, hint: string, key: 'warmup' | 'shot' | 'milk') => (
    <label style={row}>
      <span>{label}<small style={small}>{hint}</small></span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: MONO, fontSize: '11px' }}>
        <input type="number" inputMode="numeric" min={0} max={120} style={{ ...input, width: '64px' }} value={m[key]} onChange={(e) => save({ [key]: Math.max(0, Math.min(120, Number(e.target.value) || 0)) })} />min
      </span>
    </label>
  );
  return (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.2em', color: palette.surface, opacity: 0.6, textTransform: 'uppercase', margin: '0 0 8px' }}>mornings · order ahead</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button onClick={() => save({ on: !m.on })} style={{ ...row, cursor: 'pointer', textAlign: 'left', borderColor: m.on ? `${palette.bg}22` : palette.accent, color: m.on ? palette.bg : palette.accent, background: m.on ? '#fff' : `${palette.accent}11` }}>
          <span>orders for the morning</span>
          <span style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{m.on ? 'taking them' : 'off'}</span>
        </button>
        {time('up by, weekdays', 'upWeekday')}
        {time('up by, weekends', 'upWeekend')}
        {minutes('warm-up', 'switch on to first shot', 'warmup')}
        {minutes('shot only', 'espresso, americano, iced', 'shot')}
        {minutes('with steamed milk', 'cortado, flat white, cappuccino, latte', 'milk')}
      </div>
      <p style={{ fontSize: '12px', color: `${palette.bg}88`, margin: '8px 2px 0', lineHeight: 1.45 }}>
        The earliest time offered without a warning is up by + warm-up + the drink. Earlier picks are allowed; the card then shows when you&apos;d need to be up.
      </p>
    </div>
  );
}
