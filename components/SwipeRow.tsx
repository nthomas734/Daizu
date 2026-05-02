'use client';

import { ReactNode, useRef, useState } from 'react';

export function SwipeRow({
  children,
  onDelete,
  palette,
}: {
  children: ReactNode;
  onDelete: () => void;
  palette: { accent: string };
}) {
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const startX = useRef<number | null>(null);
  const startOffset = useRef(0);
  const REVEAL_WIDTH = 80;
  const REVEAL_THRESHOLD = 40;

  const onPointerDown = (e: React.PointerEvent | React.TouchEvent) => {
    const x =
      (e as React.PointerEvent).clientX ??
      (e as React.TouchEvent).touches?.[0]?.clientX;
    startX.current = x;
    startOffset.current = offset;
  };
  const onPointerMove = (e: React.PointerEvent | React.TouchEvent) => {
    if (startX.current == null) return;
    const x =
      (e as React.PointerEvent).clientX ??
      (e as React.TouchEvent).touches?.[0]?.clientX;
    const delta = x - startX.current;
    const newOffset = Math.min(0, Math.max(-REVEAL_WIDTH, startOffset.current + delta));
    setOffset(newOffset);
  };
  const onPointerUp = () => {
    if (startX.current == null) return;
    if (-offset > REVEAL_THRESHOLD) {
      setOffset(-REVEAL_WIDTH);
      setRevealed(true);
    } else {
      setOffset(0);
      setRevealed(false);
    }
    startX.current = null;
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '2px' }}>
      <button
        onClick={onDelete}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: `${REVEAL_WIDTH}px`,
          background: palette.accent,
          color: '#fff',
          border: 'none',
          padding: 0,
          fontFamily: "'Geist Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          fontWeight: 600,
          cursor: 'pointer',
          opacity: revealed ? 1 : 0.85,
          transition: 'opacity 150ms ease',
        }}
      >
        delete
      </button>
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition:
            startX.current == null
              ? 'transform 200ms cubic-bezier(0.2, 0.9, 0.3, 1.05)'
              : 'none',
          touchAction: 'pan-y',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      >
        {children}
      </div>
    </div>
  );
}
