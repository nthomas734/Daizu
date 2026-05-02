'use client';

import { useEffect, useState } from 'react';

const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ·.&'$";

type Palette = {
  surface: string;
  tileText: string;
};

export type TileSize = 'sm' | 'md' | 'lg';

const TILE_DIMS: Record<TileSize, { w: number; h: number; fs: number; jpFs: number; gap: number }> = {
  sm: { w: 21, h: 30, fs: 19, jpFs: 15, gap: 2 }, // phone (current)
  md: { w: 28, h: 40, fs: 24, jpFs: 19, gap: 3 }, // tablet idle (centered big board)
  lg: { w: 24, h: 34, fs: 21, jpFs: 17, gap: 2 }, // tablet selected (board compressed in 2-col)
};

export function FlapTile({
  char,
  delay = 0,
  palette,
  jp = false,
  tileSize = 'sm',
}: {
  char: string;
  delay?: number;
  palette: Palette;
  jp?: boolean;
  tileSize?: TileSize;
}) {
  const [display, setDisplay] = useState(' ');
  const target = jp ? char || ' ' : (char || ' ').toUpperCase();
  const dims = TILE_DIMS[tileSize];

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
        width: `${dims.w}px`,
        height: `${dims.h}px`,
        background: palette.surface,
        color: palette.tileText,
        fontFamily: jp
          ? "'Noto Serif JP', serif"
          : "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
        fontWeight: 700,
        fontSize: jp ? `${dims.jpFs}px` : `${dims.fs}px`,
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
  tileSize = 'sm',
}: {
  text: string;
  width?: number;
  startDelay?: number;
  palette: Palette;
  jp?: boolean;
  refreshKey?: number;
  tileSize?: TileSize;
}) {
  const padded = (text || '').padEnd(width, ' ').slice(0, width);
  const chars = jp ? Array.from(padded) : padded.split('');
  const gap = TILE_DIMS[tileSize].gap;
  return (
    <div style={{ display: 'flex', gap: `${gap}px` }}>
      {chars.map((c, i) => (
        <FlapTile
          key={`${refreshKey}-${i}-${c}`}
          char={c}
          delay={startDelay + i * 35}
          palette={palette}
          jp={jp}
          tileSize={tileSize}
        />
      ))}
    </div>
  );
}
