'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { GlassIcon } from '@/components/GlassIcon';
import { useViewport } from '@/lib/useViewport';
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
import { dayOff, fmtG, fmtGrind, recipeOf, type Advice, type Bean, type Shot } from '@/lib/beans';
import { RecipeTiles } from '@/components/beans/ui';

export default function BaristaOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const viewport = useViewport();
  const isTablet = viewport === 'tablet';
  const [screenW, setScreenW] = useState(0);
  useEffect(() => {
    const update = () => setScreenW(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const isLargeTablet = isTablet && screenW >= 1200;
  const [order, setOrder] = useState<Order | null>(null);
  const [readyPhrase, setReadyPhrase] = useState<{ jp: string; en: string } | null>(null);

  const [gone, setGone] = useState(false);
  const [marking, setMarking] = useState(false);
  // The bag in the hopper and its recipe (coffee orders only)
  const [bag, setBag] = useState<Bean | null>(null);
  const [recipe, setRecipe] = useState<Shot | null>(null);
  const [shotSecs, setShotSecs] = useState<number | null>(null);
  const [timeOpen, setTimeOpen] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  useEffect(() => {
    fetch('/api/beans', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.hopper) return;
        setBag(d.hopper);
        const r = recipeOf(d.shots ?? []);
        setRecipe(r);
        if (r?.seconds != null) setShotSecs(r.seconds);
      })
      .catch(() => {});
  }, []);

  // Opening the order is "I've seen it": a new order moves to brewing by
  // itself, so the customer's second dot lights up and there's no start
  // button to tap. A 404 means the customer cancelled (or it was cleared).
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch(`/api/orders/${id}`, { cache: 'no-store' });
        if (r.status === 404) { if (live) setGone(true); return; }
        const d = await r.json();
        if (!live || !d.order) return;
        setOrder(d.order);
        if (d.order.status === 'received') {
          const res = await fetch(`/api/orders/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'brewing' }),
          });
          const data = await res.json().catch(() => ({}));
          if (live && data.order) setOrder(data.order);
        }
      } catch {}
    })();
    return () => { live = false; };
  }, [id]);

  // Determine category based on order data; default cafe palette while loading
  const isCocktail =
    order?.category === 'bar' ||
    (!!order && COCKTAILS.some((c) => c.name === order.drink));
  const palette = isCocktail ? COLORS.bar : COLORS.cafe;

  if (gone) {
    return (
      <div style={{ minHeight: '100vh', background: palette.cream, color: palette.bg, padding: '60px 24px', fontFamily: "'Manrope', sans-serif", textAlign: 'center' }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 300, margin: 0 }}>this order was cancelled.</p>
        <p style={{ fontSize: '13px', opacity: 0.6, margin: '8px 0 28px', fontStyle: 'italic' }}>nothing to make</p>
        <button
          onClick={() => router.push('/barista')}
          style={{ background: palette.bg, color: palette.cream, border: 'none', padding: '14px 28px', minHeight: '48px', fontFamily: "'Geist Mono', monospace", fontSize: '12px', letterSpacing: '0.22em', textTransform: 'uppercase', borderRadius: '12px', cursor: 'pointer' }}
        >
          ← back to the queue
        </button>
      </div>
    );
  }

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

  const beanRecipe = isCocktail ? null : recipe;

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
    const bagRecipe = beanRecipe;
    const oz = PUMPS_TO_OZ[order.sweetness] || '½ oz';
    const shotLine = bagRecipe
      ? `double shot · grind ${fmtGrind(bagRecipe.grind)} · ${fmtG(bagRecipe.dose_g)}g in · ${fmtG(bagRecipe.yield_g)}g out${bagRecipe.seconds != null ? ` · ${bagRecipe.seconds}s` : ''}`
      : null;
    const baseIngredients = recipe.base.map((ing, i) => {
      if (i === 0 && shotLine && ing.startsWith('double shot')) return shotLine;
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

  const markReady = async () => {
    if (marking) return;
    setMarking(true);
    try {
      const res = await fetch(`/api/orders/${id}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe && !isCocktail && shotSecs != null ? { seconds: shotSecs } : {}),
      });
      if (res.status === 404) { setGone(true); return; }
      const data = await res.json();
      if (data.order) {
        setOrder(data.order);
        setReadyPhrase({ jp: data.order.ready_phrase_jp, en: data.order.ready_phrase_en });
        if (data.advice) setAdvice(data.advice);
        // Longer when there's advice for the next shot to read
        setTimeout(() => router.push('/barista'), data.advice ? 6000 : 2400);
      }
    } finally {
      setMarking(false);
    }
  };

  // ── named JSX blocks (shared by both phone and large-tablet layouts) ──────
  const orderInfoBlock = (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.25em', color: palette.surface, opacity: 0.6, textTransform: 'uppercase', margin: 0 }}>
        order · {timeAgo(order.created_at)} · for {order.customer}
      </p>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, fontSize: '40px', margin: '4px 0 0', letterSpacing: '-0.02em', color: palette.bg, lineHeight: 1 }}>
        {order.drink.toLowerCase()}
      </h2>
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
        {!isCocktail && (
          <>
            <Tag palette={palette}>{order.temp}</Tag>
            {order.milk && <Tag palette={palette}>{order.milk} milk</Tag>}
            {order.syrups.map((s) => <Tag key={s} palette={palette} emphasis>{s} ({order.sweetness})</Tag>)}
            {order.extras.map((e) => <Tag key={e} palette={palette}>{e.replace(/_/g, ' ')}</Tag>)}
          </>
        )}
        {isCocktail && (
          <>
            {order.quantity && order.quantity > 1 && <Tag palette={palette} emphasis>× {order.quantity}</Tag>}
            {order.strength && order.strength !== 'standard' && <Tag palette={palette} emphasis>{order.strength}</Tag>}
            {order.spirit && <Tag palette={palette}>{order.spirit}</Tag>}
          </>
        )}
      </div>
      {isCocktail && cocktailRecipe && (
        <div style={{ marginTop: '14px', padding: '14px 16px', background: palette.bg, color: palette.cream, borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <GlassIcon type={cocktailRecipe.glass} size={44} color={palette.brass} stroke={2} />
          <div>
            <p style={{ margin: 0, fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: palette.brass, textTransform: 'uppercase' }}>glassware</p>
            <p style={{ margin: '2px 0 6px', fontSize: '14px' }}>{cocktailRecipe.glassLabel}</p>
            <p style={{ margin: 0, fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: palette.brass, textTransform: 'uppercase' }}>garnish</p>
            <p style={{ margin: '2px 0 0', fontSize: '14px' }}>{cocktailRecipe.garnish}</p>
          </div>
        </div>
      )}
      {order.notes && (
        <div style={{ marginTop: '14px', padding: '12px 16px', background: `${palette.bg}0D`, color: palette.bg, borderRadius: '12px', border: `0.5px solid ${palette.bg}22`, fontSize: '13px', fontStyle: 'italic' }}>
          &quot;{order.notes}&quot;
        </div>
      )}
    </div>
  );

  const bagBlock = !isCocktail && bag ? (
    <div style={{ marginBottom: '20px', background: '#fff', border: `1px solid ${palette.bg}14`, borderRadius: '14px', padding: '14px' }}>
      <p style={{ margin: '0 0 6px', fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8A6D3B' }}>
        {[bag.name.toLowerCase(), dayOff(bag) != null ? `day ${dayOff(bag)}` : null, recipe ? 'recipe' : 'no recipe yet'].filter(Boolean).join(' · ')}
      </p>
      {recipe ? (
        <RecipeTiles grind={recipe.grind} dose={recipe.dose_g} yieldG={recipe.yield_g} seconds={recipe.seconds} />
      ) : (
        <p style={{ margin: 0, fontSize: '13px', color: `${palette.bg}99` }}>Save a balanced shot as the recipe on the beans tab, and it shows here.</p>
      )}
    </div>
  ) : null;

  const scaleBannerBlock = quantity > 1 ? (
    <div style={{ marginBottom: '16px', padding: '12px 16px', background: palette.accent, color: palette.cream, borderRadius: '12px', fontFamily: "'Geist Mono', monospace", fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
      making {quantity} — scale each line ×{quantity}
    </div>
  ) : null;

  const ingredientsBlock = (
    <Section title="ingredients" palette={palette}>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {fullIngredients.map((ing, i) => {
          const hint = quantity > 1 ? scaleHint(ing, quantity) : null;
          return (
            <li key={i} style={{ padding: '13px 0', borderBottom: i < fullIngredients.length - 1 ? `1px solid ${palette.bg}11` : 'none', fontFamily: "'Manrope', sans-serif", fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: palette.brass, fontFamily: "'Geist Mono', monospace", fontSize: '11px' }}>{String(i + 1).padStart(2, '0')}</span>
              <span>{ing}</span>
              {hint && <span style={{ color: palette.accent, fontFamily: "'Geist Mono', monospace", fontSize: '12px', fontWeight: 600 }}>→ {hint}</span>}
            </li>
          );
        })}
      </ul>
    </Section>
  );

  const recipeBlock = (
    <Section title={isCocktail ? 'recipe' : `recipe · ${(RECIPES[order.drink] || RECIPES.LATTE).ratio}`} palette={palette}>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {steps.map((step, i) => (
          <li key={i} style={{ padding: '12px 0', borderBottom: i < steps.length - 1 ? `1px solid ${palette.bg}11` : 'none', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', background: palette.bg, color: palette.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Geist Mono', monospace", fontSize: '11px', fontWeight: 600 }}>{i + 1}</div>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, paddingTop: '3px' }}>{step}</p>
          </li>
        ))}
      </ol>
    </Section>
  );

  // Fixed to the bottom so it's under the thumb the moment the page opens
  // from a notification — no scrolling past the recipe.
  const readyBar = order.status !== 'ready' && order.status !== 'cancelled' && (
    <div
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
        padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
        background: `${palette.cream}F2`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderTop: `0.5px solid ${palette.bg}1A`,
      }}
    >
      {!isCocktail && recipe && shotSecs != null && (
        <div style={{ maxWidth: isTablet ? '560px' : '448px', margin: '0 auto 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          {!timeOpen ? (
            <button
              onClick={() => setTimeOpen(true)}
              style={{ minHeight: '40px', padding: '0 16px', borderRadius: '20px', border: `1px dashed ${palette.bg}55`, background: 'transparent', color: palette.bg, fontFamily: "'Geist Mono', monospace", fontSize: '11px', letterSpacing: '0.08em', cursor: 'pointer' }}
            >
              shot ran {shotSecs}s · change
            </button>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 48px 84px 48px', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: `${palette.bg}99` }}>shot ran</span>
                <button aria-label="one second less" onClick={() => setShotSecs((v) => Math.max(1, (v ?? 0) - 1))} style={stepBtn(palette)}>−</button>
                <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, fontSize: '26px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                  {shotSecs}<small style={{ fontSize: '13px', fontFamily: "'Manrope', sans-serif", opacity: 0.6, marginLeft: '2px' }}>s</small>
                </span>
                <button aria-label="one second more" onClick={() => setShotSecs((v) => (v ?? 0) + 1)} style={stepBtn(palette)}>+</button>
              </div>
              <button
                onClick={() => router.push(`/barista/shot?order=${order.id}&s=${shotSecs}`)}
                style={{ background: 'transparent', border: 'none', padding: '6px', color: `${palette.bg}88`, fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                ran off in another way? log the whole shot →
              </button>
            </>
          )}
        </div>
      )}
      <button
        onClick={markReady}
        disabled={marking}
        style={{
          display: 'block', width: '100%', maxWidth: isTablet ? '560px' : '448px', margin: '0 auto',
          minHeight: '56px', background: palette.bg, color: palette.cream, border: 'none',
          fontFamily: "'Geist Mono', monospace", fontSize: '13px', letterSpacing: '0.22em',
          fontWeight: 600, textTransform: 'uppercase', borderRadius: '14px',
          cursor: marking ? 'wait' : 'pointer', opacity: marking ? 0.7 : 1,
        }}
      >
        ✓ ready for {order.customer}
      </button>
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: palette.cream,
        color: palette.bg,
        width: '100%',
      }}
    >
      {/* ── header — full viewport width ──────────────────────────────────── */}
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
            padding: '4px 10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            borderRadius: '20px',
          }}
        >
          ● {order.status === 'brewing' && isCocktail ? 'mixing' : order.status}
        </span>
      </div>

    <div
      style={{
        minHeight: '100vh',
        paddingBottom: '200px',
        fontFamily: "'Manrope', sans-serif",
        maxWidth: isLargeTablet ? '1300px' : isTablet ? '900px' : '480px',
        margin: '0 auto',
      }}
    >
      {isLargeTablet ? (
        /* two-column layout for large iPad */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', padding: '28px 32px' }}>
          {/* LEFT: order info + ingredients */}
          <div>
            {orderInfoBlock}
            {bagBlock}
            {scaleBannerBlock}
            {ingredientsBlock}
          </div>
          {/* RIGHT: recipe + actions */}
          <div style={{ paddingTop: '8px' }}>
            {recipeBlock}
          </div>
        </div>
      ) : (
        /* single-column layout for phone/small tablet */
        <div style={{ padding: '20px' }}>
          {orderInfoBlock}
          {bagBlock}
          {scaleBannerBlock}
          {ingredientsBlock}
          {recipeBlock}
        </div>
      )}

      {readyBar}

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
            {advice && (
              <p style={{ margin: '10px 0 0', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: '13px', lineHeight: 1.4 }}>
                {advice.text}
                {advice.next && <span style={{ display: 'block', fontSize: '11px', opacity: 0.65, marginTop: '4px' }}>Saved for the next shot on the beans tab.</span>}
              </p>
            )}
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

const stepBtn = (palette: any): React.CSSProperties => ({
  height: '48px', borderRadius: '12px', border: `1px solid ${palette.bg}33`, background: 'transparent',
  fontSize: '22px', color: palette.bg, cursor: 'pointer',
});

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
        background: emphasis ? palette.accent : `${palette.bg}18`,
        color: emphasis ? palette.cream : palette.bg,
        fontFamily: "'Geist Mono', monospace",
        fontSize: '10px',
        padding: '5px 12px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        borderRadius: '20px',
        border: emphasis ? 'none' : `0.5px solid ${palette.bg}33`,
      }}
    >
      {children}
    </span>
  );
}
