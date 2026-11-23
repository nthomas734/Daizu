'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Order } from '@/lib/menu';
import { FlapRow } from '@/components/SplitFlap';
import {
  AHEAD_ORDER_KEY, AHEAD_TIME_KEY, BARISTA_NAME, MORNINGS_DEFAULT,
  fmtClock, fmtWeekday, herLine, hhmmOf, homeTime, plan, type Mornings,
} from '@/lib/ahead';

const HOUR = 3_600_000;

/**
 * The confirm screen for an order placed for the morning, while it waits
 * (status 'scheduled'), or after he said he can't. Same board, phrase and
 * step dots as the usual confirm screen; once it's time to make the drink
 * the order becomes 'received' and the usual screen takes over.
 */
export function AheadConfirm({ order, palette, backUrl, onOrder }: {
  order: Order; palette: any; backUrl: string; onOrder: (o: Order) => void;
}) {
  const router = useRouter();
  const [mornings, setMornings] = useState<Mornings>(MORNINGS_DEFAULT);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    fetch('/api/mornings', { cache: 'no-store' }).then((r) => r.json()).then((d) => d.mornings && setMornings(d.mornings)).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const mono = { fontFamily: "'Geist Mono', monospace", textTransform: 'uppercase' as const };
  const ghost = (tone: 'brass' | 'quiet' | 'stop' = 'brass') => ({
    flex: 1, minHeight: '44px', padding: '10px 6px', background: tone === 'stop' ? `${palette.accent}22` : 'transparent',
    border: `1px solid ${tone === 'stop' ? palette.accent : `${palette.brass}66`}`, borderRadius: '2px', cursor: 'pointer',
    color: tone === 'stop' ? palette.accent : tone === 'quiet' ? `${palette.cream}99` : palette.brass,
    ...mono, fontSize: '10px', letterSpacing: '0.16em', opacity: busy ? 0.6 : 1,
  });
  const menuBoard = (
    <button onClick={() => router.push(backUrl)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} aria-label="back to menu">
      <div style={{ background: palette.board, padding: '16px 14px', borderRadius: '6px', border: `1px solid ${palette.brass}33`, boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
        <FlapRow text="BACK TO MENU" width={12} startDelay={0} palette={palette} jp={false} refreshKey={1} />
      </div>
    </button>
  );
  const page = {
    minHeight: '100vh', padding: '40px 24px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    justifyContent: 'center', textAlign: 'center' as const, gap: '30px', maxWidth: '480px', margin: '0 auto',
  };
  const forget = () => { try { localStorage.removeItem(AHEAD_ORDER_KEY); } catch {} };

  const p = plan(order, mornings);

  // He tapped "can't"
  if (order.status === 'cancelled' || !p) {
    forget();
    return (
      <div style={{ minHeight: '100vh', background: palette.bg, color: palette.cream, width: '100%' }}>
        <div style={page}>
          <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '40px', margin: 0, fontWeight: 300 }}>ごめんね</p>
          <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.3em', color: palette.brass, margin: '-18px 0 0' }}>gomen ne · sorry</p>
          <p style={{ margin: 0, fontFamily: "'Manrope', sans-serif", fontSize: '15px', opacity: 0.85, lineHeight: 1.6 }}>
            {BARISTA_NAME} can&apos;t make the {order.want_at ? `${fmtClock(order.want_at)} ` : ''}{order.drink.toLowerCase()} this time.
          </p>
          {menuBoard}
        </div>
      </div>
    );
  }

  const act = async (body: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/orders/${order.id}/ahead`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.order) {
        onOrder(d.order);
        if (d.order.want_at) { try { localStorage.setItem(AHEAD_TIME_KEY, hhmmOf(d.order.want_at)); } catch {} }
      } else if (d.error === 'bad_time') alert('That time has passed. Pick a later one.');
    } catch {
      alert('Couldn’t change it. Check the connection and try again.');
    }
    setBusy(false);
    setChanging(false);
  };
  const cancel = async () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
    await fetch(`/api/orders/${order.id}?by=customer`, { method: 'DELETE' });
    forget();
    router.push(backUrl);
  };

  // Night before: good night. From a few hours before: good morning, with +10 / +20.
  const morning = now > p.want - 4 * HOUR;
  const steps = ['asked', 'seen', 'warming', 'brewing', 'ready'];
  const at = order.on_at ? 2 : order.seen_at ? 1 : 0;
  const line = herLine(order, mornings, now);
  const shown = p.late > 0 ? p.ready : p.want;
  const board = `${fmtWeekday(shown).toUpperCase()} ${fmtClock(shown).replace(':', '.')}`;
  const pad = Math.max(0, Math.floor((12 - board.length) / 2));

  return (
    <div style={{ minHeight: '100vh', background: palette.bg, color: palette.cream, width: '100%' }}>
      <div style={page}>
        <div style={{ background: palette.board, padding: '20px 16px', borderRadius: '6px', border: `1px solid ${palette.brass}33`, boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6)' }}>
          <FlapRow text={' '.repeat(pad) + board} width={12} palette={palette} refreshKey={shown} />
        </div>

        <div>
          <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '44px', color: palette.cream, margin: 0, fontWeight: 300 }}>{morning ? 'おはよう' : 'おやすみ'}</p>
          <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.3em', color: palette.brass, margin: '8px 0 0' }}>{morning ? 'ohayō · good morning' : 'oyasumi · good night'}</p>
        </div>

        {/* The same step dots as the usual confirm screen, with the waiting steps in front */}
        <div style={{ width: '100%', maxWidth: '340px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', height: '1px', background: palette.brass + '33' }} />
            <div style={{ position: 'absolute', top: '10px', left: '10px', height: '1px', background: palette.brass, width: `calc(${(at / (steps.length - 1)) * 100}% - ${(at / (steps.length - 1)) * 20}px)`, transition: 'width 600ms ease' }} />
            {steps.map((s, i) => (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, flex: '0 0 auto' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: i <= at ? palette.brass : palette.bg, border: `2px solid ${i <= at ? palette.brass : palette.brass + '55'}`, boxShadow: i === at ? `0 0 0 4px ${palette.brass}33` : 'none', transition: 'all 400ms ease' }} />
                <span style={{ ...mono, fontSize: '9px', marginTop: '8px', letterSpacing: '0.1em', color: i <= at ? palette.cream : palette.cream + '66', fontWeight: i === at ? 600 : 400 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '14px', lineHeight: 1.7 }}>
          <p style={{ margin: 0, opacity: 0.8 }}>
            one <em style={{ color: palette.brass, fontStyle: 'normal' }}>{order.drink.toLowerCase()}</em>, {order.temp}, {p.late > 0 ? 'about' : 'at'} {fmtClock(shown)}
          </p>
          <p style={{ margin: '6px 0 0' }}>
            <span style={{ opacity: 0.8 }}>{line.text}</span>{line.strong && <b style={{ fontWeight: 600 }}> {line.strong}</b>}
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: '340px' }}>
          {changing ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="time"
                aria-label="new time"
                defaultValue={hhmmOf(p.want)}
                id="ahead-new-time"
                style={{ flex: 1, minHeight: '44px', background: 'transparent', color: palette.cream, border: `1px solid ${palette.brass}66`, borderRadius: '2px', padding: '0 12px', fontSize: '16px', colorScheme: 'dark' }}
              />
              <button
                style={ghost()}
                onClick={() => {
                  const v = (document.getElementById('ahead-new-time') as HTMLInputElement | null)?.value;
                  if (!v) return;
                  // Same morning as the order, whatever the clock says now
                  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(p.want));
                  act({ action: 'shift', wantAt: new Date(homeTime(ymd, v)).toISOString() });
                }}
              >save</button>
              <button style={ghost('quiet')} onClick={() => setChanging(false)}>back</button>
            </div>
          ) : (
            <>
              {morning && <p style={{ ...mono, fontSize: '9px', letterSpacing: '0.25em', color: palette.brass, margin: '0 0 8px' }}>running behind?</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                {morning ? (
                  <>
                    <button style={ghost()} disabled={busy} onClick={() => act({ action: 'shift', minutes: 10 })}>+10 min</button>
                    <button style={ghost()} disabled={busy} onClick={() => act({ action: 'shift', minutes: 20 })}>+20 min</button>
                  </>
                ) : (
                  <button style={ghost()} onClick={() => setChanging(true)}>change time</button>
                )}
                <button style={ghost(armed ? 'stop' : 'quiet')} onClick={cancel}>{armed ? 'tap again' : 'cancel'}</button>
              </div>
            </>
          )}
        </div>

        {menuBoard}
      </div>
    </div>
  );
}
