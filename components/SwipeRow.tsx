'use client';

import { ReactNode, useRef, useState } from 'react';

// Swipe ← reveals delete, swipe → reveals ready. Each backing is only drawn
// while the row is pulled its way, so nothing peeks out behind a resting
// rounded card.
export function SwipeRow({
  children,
  onDelete,
  onReady,
  palette,
  radius = 16,
}: {
  children: ReactNode;
  onDelete: () => void;
  onReady?: () => void;
  palette: { accent: string; bg: string; cream: string };
  radius?: number;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const startOffset = useRef(0);
  // A drag that ends over the card must not also count as a tap on it
  const moved = useRef(false);
  const REVEAL_WIDTH = 88;
  const REVEAL_THRESHOLD = 40;
  const minOffset = -REVEAL_WIDTH;
  const maxOffset = onReady ? REVEAL_WIDTH : 0;

  const onPointerDown = (e: React.PointerEvent | React.TouchEvent) => {
    const x =
      (e as React.PointerEvent).clientX ??
      (e as React.TouchEvent).touches?.[0]?.clientX;
    startX.current = x;
    startOffset.current = offset;
    moved.current = false;
  };
  const onPointerMove = (e: React.PointerEvent | React.TouchEvent) => {
    if (startX.current == null) return;
    const x =
      (e as React.PointerEvent).clientX ??
      (e as React.TouchEvent).touches?.[0]?.clientX;
    const delta = x - startX.current;
    if (Math.abs(delta) > 6) moved.current = true;
    setOffset(Math.min(maxOffset, Math.max(minOffset, startOffset.current + delta)));
  };
  const onPointerUp = () => {
    if (startX.current == null) return;
    if (offset < -REVEAL_THRESHOLD) setOffset(minOffset);
    else if (offset > REVEAL_THRESHOLD && onReady) setOffset(maxOffset);
    else setOffset(0);
    startX.current = null;
  };

  const backing: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: `${REVEAL_WIDTH + radius}px`,
    border: 'none',
    fontFamily: "'Geist Mono', monospace",
    fontSize: '11px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: `${radius}px`,
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: `${radius}px` }}>
      {offset < 0 && (
        <button
          onClick={onDelete}
          style={{ ...backing, right: 0, background: palette.accent, color: '#fff', paddingLeft: `${radius}px` }}
        >
          delete
        </button>
      )}
      {offset > 0 && onReady && (
        <button
          onClick={() => { setOffset(0); onReady(); }}
          style={{ ...backing, left: 0, background: palette.bg, color: palette.cream, paddingRight: `${radius}px` }}
        >
          ✓ ready
        </button>
      )}
      <div
        style={{
          position: 'relative',
          transform: `translateX(${offset}px)`,
          transition:
            startX.current == null
              ? 'transform 200ms cubic-bezier(0.2, 0.9, 0.3, 1.05)'
              : 'none',
          touchAction: 'pan-y',
        }}
        onClickCapture={(e) => {
          if (moved.current) {
            // end of a swipe, not a tap
            e.stopPropagation();
            e.preventDefault();
            moved.current = false;
          } else if (offset !== 0) {
            // tapping a pulled-open card just closes it
            e.stopPropagation();
            e.preventDefault();
            setOffset(0);
          }
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
