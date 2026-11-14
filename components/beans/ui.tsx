'use client';

import { CSSProperties, ReactNode, useRef } from 'react';
import { COLORS } from '@/lib/menu';
import { fmtG, fmtGrind } from '@/lib/beans';

// Small shared pieces for the beans tab, the shot log, the new-bag form and
// the order page. Bartender side only, always the cafe palette.

export const P = COLORS.cafe;
export const MONO = "'Geist Mono', monospace";
export const SERIF = "'Fraunces', serif";
export const SANS = "'Manrope', sans-serif";
export const DARK_BRASS = '#8A6D3B';

export const mono = (extra: CSSProperties = {}): CSSProperties => ({
  fontFamily: MONO,
  fontSize: '10px',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  ...extra,
});

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${P.bg}14`, borderRadius: '14px', padding: '14px', ...style }}>
      {children}
    </div>
  );
}

export function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      <span style={mono({ color: DARK_BRASS })}>{children}</span>
      {right}
    </div>
  );
}

export function Pill({ children, tone = 'sage' }: { children: ReactNode; tone?: 'sage' | 'brass' }) {
  const c = tone === 'sage' ? { background: '#7B9F8C33', color: '#2F5A47' } : { background: '#C8A97E33', color: '#6E5530' };
  return <span style={{ ...mono({ fontWeight: 600, letterSpacing: '0.1em' }), ...c, padding: '4px 10px', borderRadius: '20px', display: 'inline-block' }}>{children}</span>;
}

/** grind · in · out · sec, as four dark tiles */
export function RecipeTiles({ grind, dose, yieldG, seconds }: { grind?: number | null; dose?: number | null; yieldG?: number | null; seconds?: number | null }) {
  const tiles: [string, string][] = [
    [fmtGrind(grind), 'grind'],
    [fmtG(dose), 'g in'],
    [fmtG(yieldG), 'g out'],
    [seconds != null ? String(seconds) : '–', 'sec'],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '4px' }}>
      {tiles.map(([v, l]) => (
        <div key={l} style={{ background: P.bg, color: P.cream, borderRadius: '10px', padding: '10px 4px', textAlign: 'center' }}>
          <b style={{ display: 'block', fontFamily: SERIF, fontWeight: 300, fontSize: '22px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{v}</b>
          <span style={mono({ fontSize: '9px', letterSpacing: '0.12em', color: P.brass, display: 'block', marginTop: '5px' })}>{l}</span>
        </div>
      ))}
    </div>
  );
}

/** One sentence of advice. tone: change (red), keep (green), note (neutral) */
export function Note({ children, tone = 'change' }: { children: ReactNode; tone?: 'change' | 'keep' | 'note' }) {
  const t =
    tone === 'change'
      ? { background: '#A8443812', border: '1px solid #A8443855', color: '#6E2A22' }
      : tone === 'keep'
        ? { background: '#7B9F8C22', border: '1px solid #7B9F8C77', color: '#1F4535' }
        : { background: `${P.bg}0D`, border: '1px solid transparent', color: `${P.bg}DD` };
  return <div style={{ ...t, borderRadius: '14px', padding: '12px 14px', fontSize: '14px', lineHeight: 1.45 }}>{children}</div>;
}

export function Btn({ children, onClick, line, disabled, style }: { children: ReactNode; onClick?: () => void; line?: boolean; disabled?: boolean; style?: CSSProperties }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', minHeight: '52px', padding: '0 14px', borderRadius: '12px',
        background: line ? 'transparent' : P.bg, color: line ? P.bg : P.cream,
        border: line ? `1px solid ${P.bg}44` : 'none',
        ...mono({ fontSize: '12px', letterSpacing: '0.18em', fontWeight: 600 }),
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/**
 * − value +. Each tap moves by `step`; holding a button moves by `fine`
 * (the Niche's 0.05 for settings like 15.15), repeating while held.
 */
export function Stepper({
  label, value, onChange, step, fine, min = 0, max = 999, format = (v: number) => String(v), id,
}: {
  label: ReactNode; value: number; onChange: (v: number) => void; step: number; fine?: number;
  min?: number; max?: number; format?: (v: number) => string; id: string;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const held = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    if (repeat.current) clearInterval(repeat.current);
    timer.current = null;
    repeat.current = null;
  };
  const start = (dir: 1 | -1) => {
    held.current = false;
    if (!fine) return;
    timer.current = setTimeout(() => {
      held.current = true;
      onChange(clamp(valueRef.current + dir * fine));
      repeat.current = setInterval(() => onChange(clamp(valueRef.current + dir * fine)), 260);
    }, 420);
  };
  const tap = (dir: 1 | -1) => {
    stop();
    if (held.current) { held.current = false; return; }
    onChange(clamp(value + dir * step));
  };

  const sq: CSSProperties = {
    height: '48px', borderRadius: '12px', border: `1px solid ${P.bg}33`, background: 'transparent',
    fontSize: '22px', color: P.bg, cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
  };
  const btn = (dir: 1 | -1) => (
    <button
      aria-label={`${dir < 0 ? 'less' : 'more'} ${typeof label === 'string' ? label : id}`}
      onPointerDown={() => start(dir)}
      onPointerUp={() => tap(dir)}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      style={sq}
    >
      {dir < 0 ? '−' : '+'}
    </button>
  );
  return (
    <div id={id} style={{ display: 'grid', gridTemplateColumns: '1fr 48px 76px 48px', gap: '8px', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${P.bg}12` }}>
      <span style={{ fontSize: '13px', color: P.bg }}>{label}</span>
      {btn(-1)}
      <span style={{ fontFamily: SERIF, fontWeight: 300, fontSize: '26px', textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: P.bg }}>{format(value)}</span>
      {btn(1)}
    </div>
  );
}

/** Three-way choice with big targets (taste, body). Tap again to clear. */
export function Seg<T extends string>({ options, value, onChange }: { options: T[]; value: T | null; onChange: (v: T | null) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: '6px' }}>
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            onClick={() => onChange(on ? null : o)}
            style={{ minHeight: '48px', borderRadius: '12px', border: `1px solid ${on ? P.bg : `${P.bg}33`}`, background: on ? P.bg : 'transparent', color: on ? P.cream : P.bg, fontFamily: SANS, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function TopBar({ back, onBack, title, right }: { back: string; onBack: () => void; title: string; right?: ReactNode }) {
  return (
    <div style={{ background: P.bg, color: P.cream, padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px' }}>
      <button onClick={onBack} style={{ ...mono({ fontSize: '11px', color: P.brass }), background: 'transparent', border: 'none', padding: '10px 0', textAlign: 'left', cursor: 'pointer', justifySelf: 'start' }}>
        ← {back}
      </button>
      <span style={{ fontFamily: SERIF, fontWeight: 300, fontSize: '18px' }}>{title}</span>
      <span style={{ ...mono({ color: P.brass }), justifySelf: 'end' }}>{right}</span>
    </div>
  );
}
