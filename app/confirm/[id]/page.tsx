'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, Order } from '@/lib/menu';
import { FlapRow } from '@/components/SplitFlap';

export default function ConfirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const fromBar = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('from') === 'bar'
    : false;
  const backUrl = fromBar ? '/?mode=bar' : '/';

  const [order, setOrder] = useState<Order | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [showReturn, setShowReturn] = useState(false);

  const isCocktail = order?.category === 'bar';
  const palette = isCocktail ? COLORS.bar : COLORS.cafe;

  // Build STATUSES with contextual brewing/mixing label
  const STATUSES: { id: Order['status']; label: string }[] = [
    { id: 'received', label: 'received' },
    { id: 'brewing',  label: isCocktail ? 'mixing' : 'brewing' },
    { id: 'ready',    label: 'ready' },
  ];

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

  // Show the "back to menu" flapboard once the cancel window closes
  useEffect(() => {
    if (secondsLeft === 0 && order) setShowReturn(true);
  }, [secondsLeft, order]);

  const cancel = async () => {
    await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    router.push(backUrl);
  };

  // Long-press the board (350ms) to jump straight to the barista hub
  const [boardPressing, setBoardPressing] = useState(false);
  const boardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startBoardPress = () => {
    setBoardPressing(true);
    boardTimer.current = setTimeout(() => {
      setBoardPressing(false);
      router.push('/barista');
    }, 350);
  };
  const cancelBoardPress = () => {
    if (boardTimer.current) clearTimeout(boardTimer.current);
    boardTimer.current = null;
    setBoardPressing(false);
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
        width: '100%',
      }}
    >
    <div
      style={{
        minHeight: '100vh',
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
      {/* Waiting animation — loops until order is ready */}
      {!isReady && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {isCocktail ? <ShakerAnimation /> : <PouringAnimation />}
        </div>
      )}

      <div
        onPointerDown={startBoardPress}
        onPointerUp={cancelBoardPress}
        onPointerLeave={cancelBoardPress}
        onPointerCancel={cancelBoardPress}
        style={{
          background: palette.board,
          padding: '20px 16px',
          borderRadius: '6px',
          border: `1px solid ${palette.brass}33`,
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6)',
          opacity: boardPressing ? 0.7 : 1,
          transition: 'opacity 150ms ease',
          cursor: 'default',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          touchAction: 'manipulation',
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
          {isReady ? order.ready_phrase_jp || 'おまたせしました' : isCocktail ? '乾杯' : 'ありがとう'}
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
          {isReady ? order.ready_phrase_en || 'ready' : isCocktail ? 'kanpai · cheers' : 'arigatō · thank you'}
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

      {/* Flapboard return button — appears after cancel window closes */}
      {showReturn && !isReady && (
        <>
          <button
            onClick={() => router.push(backUrl)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, animation: 'returnFadeIn 500ms ease both' }}
            aria-label="back to menu"
          >
            <div
              style={{
                background: palette.board,
                padding: '16px 14px',
                borderRadius: '6px',
                border: `1px solid ${palette.brass}33`,
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
              }}
            >
              <FlapRow
                text="BACK TO MENU"
                width={12}
                startDelay={0}
                palette={palette}
                jp={false}
                refreshKey={1}
              />
            </div>
          </button>
          <style>{`@keyframes returnFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </>
      )}

      {isReady && (
        <button
          onClick={() => router.push(backUrl)}
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

const B = '#C8A97E';

function PouringAnimation() {
  return (
    <>
      <style>{`
        @keyframes drip1{0%,30%{transform:translateY(0);opacity:0}35%{opacity:1}90%{opacity:1}100%{transform:translateY(36px);opacity:0}}
        @keyframes drip2{0%,30%{transform:translateY(0);opacity:0}35%{opacity:1}90%{opacity:1}100%{transform:translateY(34px);opacity:0}}
      `}</style>
      <svg viewBox="0 0 80 90" width="72" height="81" style={{ overflow: 'visible' }}>
        <path d="M 22,4 L 58,4 L 58,16 L 22,16 Z" fill="none" stroke={B} strokeWidth={1.8} strokeLinejoin="round"/>
        <path d="M 58,8 Q 68,8 68,14 Q 68,20 58,20" fill="none" stroke={B} strokeWidth={1.8} strokeLinecap="round"/>
        <line x1="22" y1="4" x2="22" y2="16" stroke={B} strokeWidth={1} opacity={0.35}/>
        <line x1="30" y1="4" x2="30" y2="16" stroke={B} strokeWidth={1} opacity={0.35}/>
        <line x1="38" y1="4" x2="38" y2="16" stroke={B} strokeWidth={1} opacity={0.35}/>
        <line x1="46" y1="4" x2="46" y2="16" stroke={B} strokeWidth={1} opacity={0.35}/>
        <line x1="54" y1="4" x2="54" y2="16" stroke={B} strokeWidth={1} opacity={0.35}/>
        <line x1="30" y1="16" x2="27" y2="28" stroke={B} strokeWidth={1.5} strokeLinecap="round" opacity={0.6}/>
        <line x1="50" y1="16" x2="53" y2="28" stroke={B} strokeWidth={1.5} strokeLinecap="round" opacity={0.6}/>
        <circle cx="27" cy="30" r="2.8" fill={B} style={{ animation: 'drip1 1.6s ease-in infinite 0s' }}/>
        <circle cx="27" cy="37" r="2.2" fill={B} opacity={0.75} style={{ animation: 'drip1 1.6s ease-in infinite 0.28s' }}/>
        <circle cx="27" cy="44" r="1.6" fill={B} opacity={0.5} style={{ animation: 'drip1 1.6s ease-in infinite 0.56s' }}/>
        <circle cx="53" cy="30" r="2.8" fill={B} style={{ animation: 'drip2 1.6s ease-in infinite 0.18s' }}/>
        <circle cx="53" cy="37" r="2.2" fill={B} opacity={0.75} style={{ animation: 'drip2 1.6s ease-in infinite 0.46s' }}/>
        <circle cx="53" cy="44" r="1.6" fill={B} opacity={0.5} style={{ animation: 'drip2 1.6s ease-in infinite 0.74s' }}/>
        <path d="M 18,64 L 20,74 L 60,74 L 62,64 Z" fill="none" stroke={B} strokeWidth={1.8} strokeLinejoin="round"/>
        <line x1="16" y1="64" x2="64" y2="64" stroke={B} strokeWidth={1.8} strokeLinecap="round"/>
        <ellipse cx="40" cy="76" rx="24" ry="3" fill="none" stroke={B} strokeWidth={1.5}/>
      </svg>
    </>
  );
}

function ShakerAnimation() {
  return (
    <>
      <style>{`
        @keyframes shakerRock{0%,100%{transform:rotate(-14deg) translateX(-2px)}50%{transform:rotate(14deg) translateX(2px)}}
        @keyframes iceFly1{0%,60%{transform:translate(0,0) rotate(0deg);opacity:0}65%{opacity:.9}100%{transform:translate(12px,-10px) rotate(45deg);opacity:0}}
        @keyframes iceFly2{0%,55%{transform:translate(0,0) rotate(0deg);opacity:0}60%{opacity:.8}100%{transform:translate(-11px,-8px) rotate(-30deg);opacity:0}}
        @keyframes iceFly3{0%,70%{transform:translate(0,0);opacity:0}75%{opacity:.7}100%{transform:translate(5px,-14px);opacity:0}}
      `}</style>
      <div style={{ animation: 'shakerRock 600ms ease-in-out infinite', transformOrigin: 'center bottom' }}>
        <svg viewBox="0 0 80 90" width="72" height="81" style={{ overflow: 'visible' }}>
          <path d="M 26,32 L 30,72 L 50,72 L 54,32 Z" fill="none" stroke={B} strokeWidth={1.8} strokeLinejoin="round"/>
          <rect x="24" y="20" width="32" height="14" rx={4} fill="none" stroke={B} strokeWidth={1.8}/>
          <line x1="26" y1="34" x2="54" y2="34" stroke={B} strokeWidth={1.2} opacity={0.5}/>
          <line x1="30" y1="66" x2="50" y2="66" stroke={B} strokeWidth={1.2} opacity={0.5}/>
          <circle cx="35" cy="27" r="1.5" fill={B} opacity={0.5}/>
          <circle cx="40" cy="27" r="1.5" fill={B} opacity={0.5}/>
          <circle cx="45" cy="27" r="1.5" fill={B} opacity={0.5}/>
          <path d="M 30,46 L 35,42 L 32,50 L 38,44" fill="none" stroke={B} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.4}/>
          <circle cx="22" cy="38" r="2" fill={B} opacity={0.7} style={{ animation: 'iceFly2 1.8s ease-out infinite' }}/>
          <circle cx="58" cy="36" r="1.5" fill={B} opacity={0.6} style={{ animation: 'iceFly1 1.8s ease-out 0.3s infinite' }}/>
          <circle cx="40" cy="22" r="1.5" fill={B} opacity={0.5} style={{ animation: 'iceFly3 1.8s ease-out 0.6s infinite' }}/>
        </svg>
      </div>
    </>
  );
}
