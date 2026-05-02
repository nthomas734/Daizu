'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  COCKTAILS,
  COCKTAIL_NOTE_PLACEHOLDERS,
  COLORS,
  DRINKS,
  EXTRAS,
  Favorite,
  HIGHBALL_SPIRITS,
  MILKS,
  MILK_DRINKS,
  NOTE_PLACEHOLDERS,
  STRENGTH_LEVELS,
  SWEETNESS_LEVELS,
  SYRUPS,
} from '@/lib/menu';

export default function CustomizePage({
  params,
}: {
  params: Promise<{ drink: string }>;
}) {
  const { drink: drinkParam } = use(params);
  const router = useRouter();
  const drinkName = decodeURIComponent(drinkParam).toUpperCase();

  // Detect category — try cocktails first, then coffee
  const cocktail = COCKTAILS.find((c) => c.name === drinkName);
  const coffee = DRINKS.find((d) => d.name === drinkName);
  const isCocktail = !!cocktail;
  const drink = cocktail ?? coffee;

  const palette = isCocktail ? COLORS.bar : COLORS.cafe;
  const isMilkDrink = !isCocktail && MILK_DRINKS.includes(drinkName);
  const isHighball = drinkName === 'HOUSE HIGHBALL';

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [name, setName] = useState('');

  // Coffee-only state
  const [temp, setTemp] = useState<'hot' | 'iced'>('hot');
  const [milk, setMilk] = useState<string | null>(isMilkDrink ? 'whole' : null);
  const [syrups, setSyrups] = useState<string[]>([]);
  const [sweetness, setSweetness] = useState('normal');
  const [extras, setExtras] = useState<string[]>([]);

  // Bar-only state
  const [strength, setStrength] = useState<'light' | 'standard' | 'strong'>('standard');
  const [quantity, setQuantity] = useState(1);
  const [spirit, setSpirit] = useState<string>(isHighball ? 'bourbon' : '');

  // Shared
  const [notes, setNotes] = useState('');
  const [saveAsFav, setSaveAsFav] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Rotate notes placeholder
  const placeholders = isCocktail ? COCKTAIL_NOTE_PLACEHOLDERS : NOTE_PLACEHOLDERS;
  const [phIndex, setPhIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhIndex((i) => (i + 1) % placeholders.length), 3500);
    return () => clearInterval(t);
  }, [placeholders.length]);

  // Load favorites for this drink
  useEffect(() => {
    fetch('/api/favorites')
      .then((r) => r.json())
      .then((d) => setFavorites(d.favorites || []))
      .catch(() => {});
  }, []);

  const matchingFavorites = favorites.filter((f) => f.drink === drinkName);

  const applyFavorite = (fav: Favorite) => {
    if (fav.category === 'bar') {
      if (fav.strength) setStrength(fav.strength);
      if (fav.quantity) setQuantity(fav.quantity);
      if (fav.spirit) setSpirit(fav.spirit);
    } else {
      setTemp(fav.temp);
      setMilk(fav.milk ?? (isMilkDrink ? 'whole' : null));
      setSyrups(fav.syrups || []);
      setSweetness(fav.sweetness || 'normal');
      setExtras(fav.extras || []);
    }
    setNotes(fav.notes || '');
    if (fav.customer) setName(fav.customer);
  };

  const toggleArr = (arr: string[], setArr: (v: string[]) => void, id: string) => {
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };

  const handleSubmit = async () => {
    if (!drink) return;
    setSubmitting(true);
    const payload = isCocktail
      ? {
          category: 'bar' as const,
          drink: drink.name,
          strength,
          quantity,
          spirit: isHighball ? spirit : null,
          notes,
          customer: name.trim() || 'Dez',
          saveAsFav,
        }
      : {
          category: 'cafe' as const,
          drink: drink.name,
          temp,
          milk,
          syrups,
          sweetness,
          extras,
          notes,
          customer: name.trim() || 'Dez',
          saveAsFav,
        };
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.order) {
      router.push(`/confirm/${data.order.id}`);
    } else {
      setSubmitting(false);
      alert('Something went wrong placing the order');
    }
  };

  if (!drink) {
    return (
      <div style={{ padding: '40px', color: palette.cream, background: palette.bg, minHeight: '100vh' }}>
        <p>Drink not found.</p>
        <button onClick={() => router.push('/')}>← back</button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: palette.bg,
        color: palette.cream,
        padding: '20px 20px 140px',
        fontFamily: "'Manrope', system-ui, sans-serif",
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      <button onClick={() => router.back()} style={backBtn(palette)}>
        ← back
      </button>

      <div style={{ marginTop: '12px', marginBottom: '28px' }}>
        <p style={miniLabel(palette)}>customizing</p>
        <h2
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 300,
            fontSize: '38px',
            margin: '4px 0 0',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {drink.name.toLowerCase()}
        </h2>
        <p
          style={{
            color: palette.brass,
            fontSize: '13px',
            margin: '6px 0 0',
            fontStyle: 'italic',
            opacity: 0.8,
          }}
        >
          {drink.note}
        </p>
      </div>

      {matchingFavorites.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {matchingFavorites.map((fav) => (
            <button
              key={fav.id}
              onClick={() => applyFavorite(fav)}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'transparent',
                border: `1px dashed ${palette.brass}66`,
                borderRadius: '2px',
                color: palette.cream,
                fontFamily: "'Manrope', sans-serif",
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <span>
                <span style={{ color: palette.brass, fontStyle: 'italic' }}>the usual?</span>
                <span style={{ marginLeft: '8px', opacity: 0.7, fontSize: '12px' }}>
                  {fav.temp}
                  {fav.milk ? ` · ${fav.milk}` : ''}
                  {fav.syrups?.length ? ` · ${fav.syrups.join(', ')}` : ''}
                </span>
              </span>
              <span
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: '10px',
                  letterSpacing: '0.15em',
                  color: palette.brass,
                  textTransform: 'uppercase',
                }}
              >
                tap →
              </span>
            </button>
          ))}
        </div>
      )}

      <Section label="name" palette={palette}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dez"
          style={{
            width: '100%',
            background: 'transparent',
            border: `1px solid ${palette.brass}55`,
            borderRadius: '2px',
            padding: '10px 12px',
            color: palette.cream,
            fontFamily: "'Manrope', sans-serif",
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        />
      </Section>

      {!isCocktail && (
        <>
          <Section label="temperature" palette={palette}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['hot', 'iced'] as const).map((t) => (
                <Pill key={t} active={temp === t} onClick={() => setTemp(t)} palette={palette}>
                  {t}
                </Pill>
              ))}
            </div>
          </Section>

          {isMilkDrink && (
            <Section label="milk" palette={palette}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {MILKS.map((m) => (
                  <Pill
                    key={m.id}
                    active={milk === m.id}
                    onClick={() => setMilk(m.id)}
                    palette={palette}
                  >
                    {m.label}
                  </Pill>
                ))}
              </div>
            </Section>
          )}

          <Section label="syrups" palette={palette}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SYRUPS.map((s) => (
                <Pill
                  key={s.id}
                  active={syrups.includes(s.id)}
                  onClick={() => toggleArr(syrups, setSyrups, s.id)}
                  palette={palette}
                >
                  {s.label}
                  {'seasonal' in s && s.seasonal && (
                    <span
                      style={{
                        fontSize: '9px',
                        marginLeft: '6px',
                        color: palette.accent,
                        letterSpacing: '0.1em',
                      }}
                    >
                      ◆ SEASONAL
                    </span>
                  )}
                </Pill>
              ))}
            </div>
            {syrups.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ ...miniLabel(palette), fontSize: '9px', marginBottom: '8px' }}>sweetness</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {SWEETNESS_LEVELS.map((s) => (
                    <Pill
                      key={s.id}
                      active={sweetness === s.id}
                      onClick={() => setSweetness(s.id)}
                      palette={palette}
                    >
                      <span>{s.label}</span>
                      <span style={{ fontSize: '9px', marginLeft: '6px', opacity: 0.7 }}>
                        {s.pumps}
                      </span>
                    </Pill>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section label="extras" palette={palette}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {EXTRAS.map((e) => (
                <Pill
                  key={e.id}
                  active={extras.includes(e.id)}
                  onClick={() => toggleArr(extras, setExtras, e.id)}
                  palette={palette}
                >
                  {e.label}
                </Pill>
              ))}
            </div>
          </Section>
        </>
      )}

      {isCocktail && (
        <>
          {isHighball && (
            <Section label="spirit" palette={palette}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {HIGHBALL_SPIRITS.map((s) => (
                  <Pill
                    key={s.id}
                    active={spirit === s.id}
                    onClick={() => setSpirit(s.id)}
                    palette={palette}
                  >
                    {s.label}
                  </Pill>
                ))}
              </div>
            </Section>
          )}

          <Section label="strength" palette={palette}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {STRENGTH_LEVELS.map((s) => (
                <Pill
                  key={s.id}
                  active={strength === s.id}
                  onClick={() => setStrength(s.id as 'light' | 'standard' | 'strong')}
                  palette={palette}
                >
                  <span>{s.label}</span>
                  <span style={{ fontSize: '9px', marginLeft: '6px', opacity: 0.7 }}>
                    {s.note}
                  </span>
                </Pill>
              ))}
            </div>
          </Section>

          <Section label="quantity" palette={palette}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'transparent',
                  border: `1px solid ${palette.brass}66`,
                  borderRadius: '2px',
                  color: palette.cream,
                  fontSize: '20px',
                  fontFamily: "'Geist Mono', monospace",
                  cursor: quantity <= 1 ? 'default' : 'pointer',
                  opacity: quantity <= 1 ? 0.4 : 1,
                }}
              >
                −
              </button>
              <span
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: '28px',
                  fontWeight: 300,
                  color: palette.cream,
                  minWidth: '32px',
                  textAlign: 'center',
                }}
              >
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(4, q + 1))}
                disabled={quantity >= 4}
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'transparent',
                  border: `1px solid ${palette.brass}66`,
                  borderRadius: '2px',
                  color: palette.cream,
                  fontSize: '20px',
                  fontFamily: "'Geist Mono', monospace",
                  cursor: quantity >= 4 ? 'default' : 'pointer',
                  opacity: quantity >= 4 ? 0.4 : 1,
                }}
              >
                +
              </button>
              {quantity > 1 && (
                <span
                  style={{
                    fontSize: '12px',
                    color: palette.brass,
                    fontStyle: 'italic',
                    marginLeft: '8px',
                  }}
                >
                  {quantity} drinks
                </span>
              )}
            </div>
          </Section>
        </>
      )}

      <Section label="notes" palette={palette}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={placeholders[phIndex]}
          style={{
            width: '100%',
            minHeight: '60px',
            background: 'transparent',
            border: `1px solid ${palette.brass}55`,
            borderRadius: '2px',
            padding: '10px 12px',
            color: palette.cream,
            fontFamily: "'Manrope', sans-serif",
            fontSize: '13px',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </Section>

      <button
        onClick={() => setSaveAsFav(!saveAsFav)}
        style={{
          width: '100%',
          padding: '12px',
          marginBottom: '16px',
          background: saveAsFav ? palette.brass + '22' : 'transparent',
          border: `1px dashed ${palette.brass}77`,
          borderRadius: '2px',
          color: palette.cream,
          fontFamily: "'Manrope', sans-serif",
          fontSize: '13px',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '2px',
            border: `1px solid ${palette.brass}`,
            background: saveAsFav ? palette.brass : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: palette.bg,
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {saveAsFav ? '✓' : ''}
        </span>
        save as a usual
      </button>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          right: '20px',
          maxWidth: '440px',
          marginLeft: 'auto',
          marginRight: 'auto',
          background: palette.cream,
          color: palette.bg,
          border: 'none',
          padding: '16px',
          fontFamily: "'Geist Mono', monospace",
          fontSize: '13px',
          letterSpacing: '0.25em',
          fontWeight: 600,
          textTransform: 'uppercase',
          borderRadius: '2px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          cursor: submitting ? 'wait' : 'pointer',
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? 'sending…' : 'send order →'}
      </button>
    </div>
  );
}

function Section({
  label,
  palette,
  children,
}: {
  label: string;
  palette: any;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '26px' }}>
      <p style={miniLabel(palette)}>{label}</p>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  palette,
  children,
}: {
  active: boolean;
  onClick: () => void;
  palette: any;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? palette.cream : 'transparent',
        color: active ? palette.bg : palette.cream,
        border: `1px solid ${active ? palette.cream : palette.brass + '66'}`,
        padding: '8px 14px',
        fontFamily: "'Manrope', sans-serif",
        fontSize: '13px',
        borderRadius: '2px',
        textTransform: 'lowercase',
        letterSpacing: '0.02em',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {children}
    </button>
  );
}

const miniLabel = (palette: any) => ({
  fontFamily: "'Geist Mono', monospace",
  fontSize: '10px',
  letterSpacing: '0.2em',
  color: palette.brass,
  textTransform: 'uppercase' as const,
  margin: '0 0 10px',
});

const backBtn = (palette: any) => ({
  background: 'transparent',
  border: 'none',
  color: palette.brass,
  fontFamily: "'Geist Mono', monospace",
  fontSize: '11px',
  letterSpacing: '0.15em',
  padding: '8px 0',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
});
