'use client';

import { useEffect, useState } from 'react';

const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ·.&'$";

type Palette = {
  surface: string;
  tileText: string;
};

export function FlapTile({
  char,
  delay = 0,
  palette,
  jp = false,
}: {
  char: string;
  delay?: number;
  palette: Palette;
  jp?: boolean;
}) {
  const [display, setDisplay] = useState(' ');
  const target = jp ? char || ' ' : (char || ' ').toUpperCase();

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const cycles = 6 + Math.floor(Math.random() * 4);
    const interval = 55;
    timeouts.push(
      setTimeout(() => {
        for (let i = 0; i < cycles; i++) {
          timeouts.push(
            setTimeout(() => {
              setDisplay(FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)]);
            }, i * interval)
          );
        }
        timeouts.push(setTimeout(() => setDisplay(target), cycles * interval));
      }, delay)
    );
    return () => timeouts.forEach(clearTimeout);
  }, [target, delay]);

  return (
    <div
      style={{
        position: 'relative',
        width: '21px',
        height: '30px',
        background: palette.surface,
        color: palette.tileText,
        fontFamily: jp
          ? "'Noto Serif JP', serif"
          : "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
        fontWeight: 700,
        fontSize: jp ? '15px' : '19px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '2px',
        boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }}
    >
      <span style={{ lineHeight: 1, transform: 'translateY(-1px)' }}>{display}</span>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: '1px',
          background: 'rgba(0,0,0,0.85)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.06)',
        }}
      />
    </div>
  );
}

export function FlapRow({
  text,
  width = 16,
  startDelay = 0,
  palette,
  jp = false,
  refreshKey = 0,
}: {
  text: string;
  width?: number;
  startDelay?: number;
  palette: Palette;
  jp?: boolean;
  refreshKey?: number;
}) {
  const padded = (text || '').padEnd(width, ' ').slice(0, width);
  const chars = jp ? Array.from(padded) : padded.split('');
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {chars.map((c, i) => (
        <FlapTile
          key={`${refreshKey}-${i}-${c}`}
          char={c}
          delay={startDelay + i * 35}
          palette={palette}
          jp={jp}
        />
      ))}
    </div>
  );
}
