'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { COLORS, Order, PUMPS_TO_OZ, RECIPES } from '@/lib/menu';
import { timeAgo } from '@/lib/time';

export default function BaristaOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const palette = COLORS.cafe;
  const [order, setOrder] = useState<Order | null>(null);
  const [readyPhrase, setReadyPhrase] = useState<{ jp: string; en: string } | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((d) => d.order && setOrder(d.order))
      .catch(() => {});
  }, [id]);

  if (!order) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: palette.cream,
          color: palette.bg,
          padding: '40px',
          fontFamily: "'Manrope', sans-serif",
        }}
      >
        <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', opacity: 0.7 }}>
          loading order…
        </p>
      </div>
    );
  }

  const recipe = RECIPES[order.drink] || RECIPES.LATTE;
  const oz = PUMPS_TO_OZ[order.sweetness] || '½ oz';
  const baseIngredients = recipe.base.map((ing) => {
    if (order.milk && ing.includes('milk')) {
      const milkPrefix = order.temp === 'iced' ? 'cold ' : '';
      return ing.replace('milk', `${milkPrefix}${order.milk} milk`);
    }
    return ing;
  });
  const fullIngredients = [
    ...baseIngredients,
    ...order.syrups.map((s) => `${s} syrup · ${oz}`),
    ...order.extras.map((e) => e.replace(/_/g, ' ')),
  ];
  const steps = order.temp === 'iced' ? recipe.iced : recipe.hot;

  const advance = async () => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'brewing' }),
    });
    const data = await res.json();
    if (data.order) setOrder(data.order);
  };

  const markReady = async () => {
    const res = await fetch(`/api/orders/${id}/ready`, { method: 'POST' });
    const data = await res.json();
    if (data.order) {
      setOrder(data.order);
      setReadyPhrase({ jp: data.order.ready_phrase_jp, en: data.order.ready_phrase_en });
      setTimeout(() => router.push('/barista'), 2400);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: palette.cream,
        color: palette.bg,
        paddingBottom: '40px',
        fontFamily: "'Manrope', sans-serif",
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          background: palette.bg,
          color: palette.cream,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => router.push('/barista')}
          style={{
            background: 'transparent',
            border: 'none',
            color: palette.brass,
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ← queue
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Logo size={22} color={palette.brass} stroke={7} />
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 300 }}>
            daizu
          </span>
        </div>
        <span
          style={{
            background: order.status === 'brewing' ? palette.brass : palette.accent,
            color: palette.cream,
            fontFamily: "'Geist Mono', monospace",
            fontSize: '9px',
            padding: '3px 8px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            borderRadius: '2px',
          }}
        >
          ● {order.status}
        </span>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <p
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '10px',
              letterSpacing: '0.25em',
              color: palette.surface,
              opacity: 0.6,
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            order · {timeAgo(order.created_at)} · for {order.customer}
          </p>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 300,
              fontSize: '40px',
              margin: '4px 0 0',
              letterSpacing: '-0.02em',
              color: palette.bg,
              lineHeight: 1,
            }}
          >
            {order.drink.toLowerCase()}
          </h2>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            <Tag palette={palette}>{order.temp}</Tag>
            {order.milk && <Tag palette={palette}>{order.milk} milk</Tag>}
            {order.syrups.map((s) => (
              <Tag key={s} palette={palette} emphasis>
                {s} ({order.sweetness})
              </Tag>
            ))}
            {order.extras.map((e) => (
              <Tag key={e} palette={palette}>
                {e.replace(/_/g, ' ')}
              </Tag>
            ))}
          </div>
          {order.notes && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 12px',
                background: palette.bg,
                color: palette.cream,
                borderRadius: '2px',
                fontSize: '13px',
                fontStyle: 'italic',
                borderLeft: `3px solid ${palette.brass}`,
              }}
            >
              &quot;{order.notes}&quot;
            </div>
          )}
        </div>

        <Section title="ingredients" palette={palette}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {fullIngredients.map((ing, i) => (
              <li
                key={i}
                style={{
                  padding: '10px 0',
                  borderBottom:
                    i < fullIngredients.length - 1 ? `1px solid ${palette.bg}11` : 'none',
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span
                  style={{
                    color: palette.brass,
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: '11px',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {ing}
              </li>
            ))}
          </ul>
        </Section>

        <Section title={`recipe · ${recipe.ratio}`} palette={palette}>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {steps.map((step, i) => (
              <li
                key={i}
                style={{
                  padding: '12px 0',
                  borderBottom: i < steps.length - 1 ? `1px solid ${palette.bg}11` : 'none',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: palette.bg,
                    color: palette.cream,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {i + 1}
                </div>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, paddingTop: '3px' }}>
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </Section>

        {order.status === 'received' && (
          <button
            onClick={advance}
            style={{
              width: '100%',
              marginTop: '12px',
              background: palette.brass,
              color: palette.bg,
              border: 'none',
              padding: '16px',
              fontFamily: "'Geist Mono', monospace",
              fontSize: '13px',
              letterSpacing: '0.25em',
              fontWeight: 600,
              textTransform: 'uppercase',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          >
            start brewing
          </button>
        )}
        {order.status === 'brewing' && (
          <button
            onClick={markReady}
            style={{
              width: '100%',
              marginTop: '12px',
              background: palette.bg,
              color: palette.cream,
              border: 'none',
              padding: '16px',
              fontFamily: "'Geist Mono', monospace",
              fontSize: '13px',
              letterSpacing: '0.25em',
              fontWeight: 600,
              textTransform: 'uppercase',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          >
            ✓ ready for pickup
          </button>
        )}
      </div>

      {readyPhrase && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '60px',
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: '340px',
              background: 'rgba(40,40,42,0.92)',
              backdropFilter: 'blur(20px)',
              borderRadius: '18px',
              padding: '12px 14px',
              color: '#fff',
              fontFamily: '-apple-system, system-ui, sans-serif',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '6px',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '5px',
                  background: COLORS.cafe.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Logo size={14} color={COLORS.cafe.brass} stroke={11} />
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  flex: 1,
                }}
              >
                daizu
              </span>
              <span style={{ fontSize: '11px', opacity: 0.6 }}>now</span>
            </div>
            <p
              style={{
                margin: '0 0 2px',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: "'Noto Serif JP', -apple-system, sans-serif",
              }}
            >
              {readyPhrase.jp}
            </p>
            <p style={{ margin: 0, fontSize: '13px', opacity: 0.85, lineHeight: 1.35 }}>
              {order.customer}&apos;s {order.drink.toLowerCase()} is ready ☕
              <span
                style={{
                  display: 'block',
                  fontSize: '11px',
                  opacity: 0.65,
                  marginTop: '2px',
                  fontStyle: 'italic',
                }}
              >
                {readyPhrase.en}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  palette,
  children,
}: {
  title: string;
  palette: any;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <p
        style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '10px',
          letterSpacing: '0.25em',
          color: palette.surface,
          textTransform: 'uppercase',
          margin: '0 0 10px',
          paddingBottom: '8px',
          borderBottom: `1px solid ${palette.bg}22`,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function Tag({
  palette,
  emphasis,
  children,
}: {
  palette: any;
  emphasis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        background: emphasis ? palette.accent : palette.bg,
        color: palette.cream,
        fontFamily: "'Geist Mono', monospace",
        fontSize: '10px',
        padding: '4px 10px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        borderRadius: '2px',
      }}
    >
      {children}
    </span>
  );
}
