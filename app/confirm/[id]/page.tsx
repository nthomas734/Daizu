'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, Order } from '@/lib/menu';
import { FlapRow } from '@/components/SplitFlap';

const STATUSES: { id: Order['status']; label: string }[] = [
  { id: 'received', label: 'received' },
  { id: 'brewing',  label: 'brewing' },
  { id: 'ready',    label: 'ready' },
];

export default function ConfirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(5);

  const isCocktail = order?.category === 'bar';
  const palette = isCocktail ? COLORS.bar : COLORS.cafe;
  // Poll for status updates every 3 seconds
  useEffect(() => {
    let stop = false;
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!stop && data.order) setOrder(data.order);
      } catch {}
    };
    fetchOrder();
    const t = setInterval(fetchOrder, 3000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [id]);

  // 5-second cancel countdown — only available while order is "received"
  const canCancel = order?.status === 'received' && secondsLeft > 0;
  useEffect(() => {
    if (!canCancel) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [canCancel]);

  const cancel = async () => {
    await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    router.push('/');
  };

  if (!order) {
    return (
      <div style={{ ...wrap, background: palette.bg, color: palette.cream }}>
        <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', opacity: 0.7 }}>
          loading order…
        </p>
      </div>
    );
  }

  const currentIdx = STATUSES.findIndex((s) => s.id === order.status);
  const isReady = order.status === 'ready';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: palette.bg,
        color: palette.cream,
        padding: '40px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '32px',
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          background: palette.board,
          padding: '20px 16px',
          borderRadius: '6px',
          border: `1px solid ${palette.brass}33`,
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6)',
        }}
      >
        <FlapRow
          text={isReady ? '   READY!   ' : '  ORDER IN  '}
          width={12}
          palette={palette}
          refreshKey={isReady ? 1 : 0}
        />
      </div>

      <div>
        <p
          style={{
            fontFamily: "'Noto Serif JP', serif",
            fontSize: isReady ? '36px' : '44px',
            color: palette.cream,
            margin: 0,
            fontWeight: 300,
          }}
        >
          {isReady ? order.ready_phrase_jp || 'おまたせしました' : 'ありがとう'}
        </p>
        <p
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.3em',
            color: palette.brass,
            textTransform: 'uppercase',
            margin: '8px 0 0',
          }}
        >
          {isReady ? order.ready_phrase_en || 'ready' : 'arigatō · thank you'}
        </p>
      </div>

      {/* Status timeline */}
      <div style={{ width: '100%', maxWidth: '320px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            position: 'relative',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              right: '10px',
              height: '1px',
              background: palette.brass + '33',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              height: '1px',
              background: palette.brass,
              width: `calc(${
                (Math.max(currentIdx, 0) / (STATUSES.length - 1)) * 100
              }% - ${(Math.max(currentIdx, 0) / (STATUSES.length - 1)) * 20}px)`,
              transition: 'width 600ms ease',
            }}
          />
          {STATUSES.map((s, i) => {
            const reached = i <= currentIdx;
            const current = i === currentIdx;
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 1,
                  flex: '0 0 auto',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: reached ? palette.brass : palette.bg,
                    border: `2px solid ${reached ? palette.brass : palette.brass + '55'}`,
                    boxShadow: current ? `0 0 0 4px ${palette.brass}33` : 'none',
                    transition: 'all 400ms ease',
                  }}
                />
                <span
                  style={{
                    fontSize: '10px',
                    marginTop: '8px',
                    fontFamily: "'Geist Mono', monospace",
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: reached ? palette.cream : palette.cream + '66',
                    fontWeight: current ? 600 : 400,
                  }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: '14px',
          lineHeight: 1.7,
          opacity: 0.8,
        }}
      >
        <p style={{ margin: 0 }}>
          {isCocktail ? (
            <>
              {order.quantity && order.quantity > 1 ? `${order.quantity} ` : 'one '}
              <em style={{ color: palette.brass, fontStyle: 'normal' }}>
                {order.drink.toLowerCase()}
                {order.quantity && order.quantity > 1 ? 's' : ''}
              </em>
              {order.strength && order.strength !== 'standard' && `, ${order.strength}`}
              {order.spirit && `, with ${order.spirit}`}
            </>
          ) : (
            <>
              one{' '}
              <em style={{ color: palette.brass, fontStyle: 'normal' }}>
                {order.drink.toLowerCase()}
              </em>
              , {order.temp}
            </>
          )}
        </p>
        {!isCocktail && order.syrups?.length > 0 && (
          <p style={{ margin: '4px 0 0' }}>with {order.syrups.join(', ')}</p>
        )}
      </div>

      {canCancel && (
        <button
          onClick={cancel}
          style={{
            background: palette.accent + '22',
            border: `1px solid ${palette.accent}`,
            color: palette.accent,
            padding: '10px 24px',
            borderRadius: '2px',
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          cancel · {secondsLeft}s
        </button>
      )}

      {isReady && (
        <button
          onClick={() => router.push('/')}
          style={{
            background: palette.cream,
            color: palette.bg,
            border: 'none',
            padding: '14px 32px',
            fontFamily: "'Geist Mono', monospace",
            fontSize: '12px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            borderRadius: '2px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          back to menu
        </button>
      )}
    </div>
  );
}

const wrap = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px',
};
