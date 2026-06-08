'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { GlassIcon } from '@/components/GlassIcon';
import {
  COCKTAIL_RECIPES,
  COCKTAILS,
  COLORS,
  Order,
  PUMPS_TO_OZ,
  RECIPES,
  STRENGTH_TO_OZ,
} from '@/lib/menu';
import { timeAgo } from '@/lib/time';

export default function BaristaOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [readyPhrase, setReadyPhrase] = useState<{ jp: string; en: string } | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((d) => d.order && setOrder(d.order))
      .catch(() => {});
  }, [id]);

  // Determine category based on order data; default cafe palette while loading
  const isCocktail =
    order?.category === 'bar' ||
    (!!order && COCKTAILS.some((c) => c.name === order.drink));
  const palette = isCocktail ? COLORS.bar : COLORS.cafe;

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

  // How many of this drink — drives the recipe-scaling hints below.
  // Defaults to 1 (no scaling) for anything without an explicit quantity.
  const quantity = order.quantity && order.quantity > 1 ? order.quantity : 1;

  // Build ingredients + steps depending on category
  let fullIngredients: string[];
  let steps: string[];
  let cocktailRecipe = isCocktail ? COCKTAIL_RECIPES[order.drink] : null;

  if (isCocktail && cocktailRecipe) {
    // Adjust the spirit pour amount based on strength
    const baseOz = STRENGTH_TO_OZ[order.strength || 'standard'];
    fullIngredients = cocktailRecipe.ingredients.map((ing) => {
      // Replace the leading "2 oz" base spirit pour with the strength-adjusted oz
      // (only the first "2 oz" — other measurements like "¾ oz" are juice/syrup)
      return ing.replace(/^2 oz/, baseOz);
    });
    // For House Highball, inject the chosen spirit into ingredient line
    if (order.drink === 'HOUSE HIGHBALL' && order.spirit) {
      fullIngredients = fullIngredients.map((ing) =>
        ing.includes('spirit (your choice)') ? ing.replace('spirit (your choice)', order.spirit!) : ing
      );
    }
    steps = cocktailRecipe.steps;
  } else {
    const recipe = RECIPES[order.drink] || RECIPES.LATTE;
    const oz = PUMPS_TO_OZ[order.sweetness] || '½ oz';
    const baseIngredients = recipe.base.map((ing) => {
      if (order.milk && ing.includes('milk')) {
        const milkPrefix = order.temp === 'iced' ? 'cold ' : '';
        return ing.replace('milk', `${milkPrefix}${order.milk} milk`);
      }
      return ing;
    });
    fullIngredients = [
      ...baseIngredients,
      ...order.syrups.map((s) => `${s} syrup · ${oz}`),
      ...order.extras.map((e) => e.replace(/_/g, ' ')),
    ];
    steps = order.temp === 'iced' ? recipe.iced : recipe.hot;
  }

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
        width: '100%',
      }}
    >
    <div
      style={{
        minHeight: '100vh',
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
          ● {order.status === 'brewing' && isCocktail ? 'mixing' : order.status}
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
            {!isCocktail && (
              <>
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
              </>
            )}
            {isCocktail && (
              <>
                {order.quantity && order.quantity > 1 && (
                  <Tag palette={palette} emphasis>
                    × {order.quantity}
                  </Tag>
                )}
                {order.strength && order.strength !== 'standard' && (
                  <Tag palette={palette} emphasis>
                    {order.strength}
                  </Tag>
                )}
                {order.spirit && <Tag palette={palette}>{order.spirit}</Tag>}
              </>
            )}
          </div>

          {isCocktail && cocktailRecipe && (
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                background: palette.bg,
                color: palette.cream,
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <GlassIcon
                type={cocktailRecipe.glass}
                size={44}
                color={palette.brass}
                stroke={2}
              />
              <div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    color: palette.brass,
                    textTransform: 'uppercase',
                  }}
                >
                  glassware
                </p>
                <p style={{ margin: '2px 0 6px', fontSize: '14px' }}>
                  {cocktailRecipe.glassLabel}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    color: palette.brass,
                    textTransform: 'uppercase',
                  }}
                >
                  garnish
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '14px' }}>
                  {cocktailRecipe.garnish}
                </p>
              </div>
            </div>
          )}
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

        {quantity > 1 && (
          <div
            style={{
              marginBottom: '16px',
              padding: '10px 14px',
              background: palette.accent,
              color: palette.cream,
              borderRadius: '2px',
              fontFamily: "'Geist Mono', monospace",
              fontSize: '12px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            making {quantity} — scale each line ×{quantity}
          </div>
        )}

        <Section title="ingredients" palette={palette}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {fullIngredients.map((ing, i) => {
              const hint = quantity > 1 ? scaleHint(ing, quantity) : null;
              return (
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
                <span>{ing}</span>
                {hint && (
                  <span
                    style={{
                      color: palette.accent,
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    → {hint}
                  </span>
                )}
              </li>
              );
            })}
          </ul>
        </Section>

        <Section
          title={
            isCocktail
              ? 'recipe'
              : `recipe · ${(RECIPES[order.drink] || RECIPES.LATTE).ratio}`
          }
          palette={palette}
        >
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
            {isCocktail ? 'start mixing' : 'start brewing'}
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
              {order.customer}&apos;s {order.drink.toLowerCase()} is ready {isCocktail ? '🍸' : '☕'}
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recipe scaling — conservative, display-only.
// Given an ingredient line like "2 oz bourbon" and a multiplier, returns a short
// scaled hint ("4 oz") ONLY when the line starts with a number + a known unit.
// Anything ambiguous ("1 large cube", "3 coffee beans", "float Baileys") returns
// null and shows no hint — the barista uses judgement, cued by the ×N banner.
// ─────────────────────────────────────────────────────────────────────────────
const FRACTIONS: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
};

const VOLUME_UNITS = ['oz', 'ml', 'cl', 'l', 'tsp', 'tbsp', 'teaspoon', 'tablespoon', 'cup', 'cups'];
const COUNT_UNITS = ['dash', 'dashes', 'drop', 'drops'];

function formatQty(v: number): string {
  const whole = Math.floor(v + 1e-9);
  const frac = v - whole;
  let fracStr = '';
  if (Math.abs(frac - 0.25) < 0.02) fracStr = '¼';
  else if (Math.abs(frac - 0.5) < 0.02) fracStr = '½';
  else if (Math.abs(frac - 0.75) < 0.02) fracStr = '¾';
  else if (Math.abs(frac - 1 / 3) < 0.03) fracStr = '⅓';
  else if (Math.abs(frac - 2 / 3) < 0.03) fracStr = '⅔';
  else if (frac > 0.02) return String(Math.round(v * 100) / 100); // odd value → plain decimal
  if (whole === 0 && fracStr) return fracStr;
  if (fracStr) return `${whole}${fracStr}`;
  return String(whole);
}

function scaleHint(line: string, mult: number): string | null {
  const s = line.trimStart();
  // Leading: optional decimal/integer, optional unicode fraction, optional unit word
  const m = s.match(/^(\d+(?:\.\d+)?)?\s*([¼½¾⅓⅔⅛])?\s*([a-zA-Z]+)?/);
  if (!m) return null;
  const whole = m[1] ? parseFloat(m[1]) : 0;
  const frac = m[2] ? FRACTIONS[m[2]] || 0 : 0;
  const value = whole + frac;
  if (value <= 0) return null; // no parseable number → no hint
  const unit = (m[3] || '').toLowerCase();
  const scaled = value * mult;
  if (VOLUME_UNITS.includes(unit)) return `${formatQty(scaled)} ${unit}`;
  if (COUNT_UNITS.includes(unit)) return formatQty(scaled); // number only — line already says the unit
  return null; // unknown/ambiguous unit ("large", "sugar", "coffee", "") → no hint
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
