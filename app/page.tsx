'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { FlapRow, TileSize } from '@/components/SplitFlap';
import { GlassIcon } from '@/components/GlassIcon';
import {
  COCKTAILS,
  COCKTAIL_RECIPES,
  COLORS,
  DRINKS,
  GlassType,
  RECIPES,
} from '@/lib/menu';
import { useViewport } from '@/lib/useViewport';

export default function MenuPage() {
  const router = useRouter();
  const viewport = useViewport();
  const isTablet = viewport === 'tablet';

  const [mode, setMode] = useState<'cafe' | 'bar'>('cafe');
  const [isKiosk, setIsKiosk] = useState(false);
  const [screenH, setScreenH] = useState(1000);
  useEffect(() => {
    const update = () => setScreenH(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const [bouncing, setBouncing] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBeanTap = () => {
    tapCountRef.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      setBouncing(true);
      setTimeout(() => setBouncing(false), 2200);
    } else {
      tapTimer.current = setTimeout(() => { tapCountRef.current = 0; }, 700);
    }
  };

  // On mount, read ?mode=bar from the URL or /bar pathname to initialize bar/kiosk mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isBarRoute = window.location.pathname.startsWith('/bar');
    if (params.get('mode') === 'bar' || isBarRoute) setMode('bar');
    if (isBarRoute) setIsKiosk(true);
  }, []);
  const [lang, setLang] = useState<'jp' | 'en'>('jp');
  const [outOfStock, setOutOfStock] = useState<{ drinks: string[] }>({ drinks: [] });
  const [refreshKey, setRefreshKey] = useState(0);
  // Tablet-only: which drink is being previewed (null = idle, centered board)
  const [selectedDrink, setSelectedDrink] = useState<string | null>(null);

  const palette = mode === 'cafe' ? COLORS.cafe : COLORS.bar;
  const BOARD_WIDTH = 16;

  // First-load Japanese flourish: starts in JP, flips to EN after 1.4s
  useEffect(() => {
    const t = setTimeout(() => setLang('en'), 1400);
    return () => clearTimeout(t);
  }, []);

  // Bump refresh key when language OR mode changes so tiles re-flip
  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [lang, mode]);

  // Clear selection when toggling modes — selected drink doesn't carry over
  useEffect(() => {
    setSelectedDrink(null);
  }, [mode]);

  // Update the iOS status bar / theme color to match the current mode.
  useEffect(() => {
    const color = mode === 'cafe' ? '#1B3A2F' : '#1A2A3F';
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [mode]);

  // Load out-of-stock list once
  useEffect(() => {
    fetch('/api/out-of-stock')
      .then((r) => r.json())
      .then((d) => {
        if (d.outOfStock) setOutOfStock(d.outOfStock);
      })
      .catch(() => {});
  }, []);

  const formatRow = (name: string, price: string) => {
    const space = BOARD_WIDTH - name.length - price.length;
    if (space <= 1) return (name + ' ' + price).slice(0, BOARD_WIDTH);
    if (space === 2) return name + ' ' + price;
    return name + ' ' + '·'.repeat(space - 2) + ' ' + price;
  };

  const formatBarRow = (name: string) => (' ' + name).padEnd(BOARD_WIDTH, ' ').slice(0, BOARD_WIDTH);

  type MenuItem = {
    name: string;
    jp: string;
    glass?: GlassType;
    rowText: string;
    jpRowText: string;
  };

  const items: MenuItem[] =
    mode === 'cafe'
      ? DRINKS.filter((d) => !outOfStock.drinks.includes(d.name)).map((d) => ({
          name: d.name,
          jp: d.jp,
          rowText: formatRow(d.name, d.price),
          jpRowText: (d.jp + ' ' + d.price).slice(0, BOARD_WIDTH).padEnd(BOARD_WIDTH, ' '),
        }))
      : COCKTAILS.filter((c) => !outOfStock.drinks.includes(c.name)).map((c) => ({
          name: c.name,
          jp: c.jp,
          glass: c.glass,
          rowText: formatBarRow(c.display),
          jpRowText: c.jp.padEnd(BOARD_WIDTH, ' ').slice(0, BOARD_WIDTH),
        }));

  // Determine tile size based on viewport + selection state + screen height
  const tileSize: TileSize = !isTablet ? 'sm' : selectedDrink ? 'md' : screenH >= 900 ? 'xl' : 'lg';

  // On tablet, show more display tiles to fill the screen (text still pads to BOARD_WIDTH)
  const BOARD_DISPLAY_WIDTH = isTablet ? 20 : BOARD_WIDTH;

  // Center a label within a fixed tile width (used for header + footer rows)
  const centerRow = (text: string, width: number) => {
    const t = text.trim();
    const total = Math.max(0, width - t.length);
    const left = Math.floor(total / 2);
    return ' '.repeat(left) + t + ' '.repeat(total - left);
  };

  const headerText = (() => {
    if (mode === 'cafe') return centerRow(lang === 'en' ? 'MENU' : 'メニュー', BOARD_DISPLAY_WIDTH);
    return centerRow(lang === 'en' ? 'COCKTAIL MENU' : 'カクテル', BOARD_DISPLAY_WIDTH);
  })();

  // Click handler: phone navigates immediately; tablet sets selection
  const handleDrinkTap = (drinkName: string) => {
    const customizeUrl = `/customize/${encodeURIComponent(drinkName)}${mode === 'bar' ? '?from=bar' : ''}`;
    if (isTablet) {
      // If tapping the same drink that's already selected, navigate to customize
      if (selectedDrink === drinkName) {
        router.push(customizeUrl);
      } else {
        setSelectedDrink(drinkName);
      }
    } else {
      router.push(customizeUrl);
    }
  };

  // The board itself, factored out so it can be placed inside either layout
  const board = (
    <div
      style={{
        background: palette.board,
        borderRadius: '6px',
        padding: isTablet ? '24px 20px' : '18px 12px',
        border: `1px solid ${palette.brass}33`,
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        width: isTablet ? 'fit-content' : undefined,
        gap: isTablet && !selectedDrink ? (tileSize === 'lg' ? '5px' : '8px') : '6px',
      }}
    >
      <div
        style={{
          paddingBottom: '6px',
          borderBottom: `1px solid ${palette.brass}22`,
          marginBottom: '4px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <FlapRow
          text={headerText}
          width={BOARD_DISPLAY_WIDTH}
          startDelay={0}
          palette={palette}
          jp={lang === 'jp'}
          refreshKey={refreshKey}
          tileSize={tileSize}
        />
      </div>

      {items.map((d, i) => {
        const text = lang === 'jp' ? d.jpRowText : d.rowText;
        const isSelected = isTablet && selectedDrink === d.name;
        const tileW = tileSize === 'xl' ? 36 : tileSize === 'lg' ? 30 : tileSize === 'md' ? 28 : 21;
        const tileGap = tileSize === 'md' ? 3 : tileSize === 'xl' ? 3 : tileSize === 'lg' ? 3 : 2;
        return (
          <button
            key={d.name}
            onClick={() => handleDrinkTap(d.name)}
            style={{
              background: isSelected ? `${palette.brass}1A` : 'transparent',
              border: 'none',
              borderLeft: isSelected ? `2px solid ${palette.brass}` : '2px solid transparent',
              padding: isSelected ? '4px 6px' : '4px 8px',
              borderRadius: '2px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              transition: 'background 200ms ease, border-left 200ms ease',
            }}
          >
            <FlapRow
              text={text}
              width={BOARD_DISPLAY_WIDTH}
              startDelay={300 + i * 80}
              palette={palette}
              jp={lang === 'jp'}
              refreshKey={refreshKey}
              tileSize={tileSize}
            />
            
          </button>
        );
      })}

      <div
        style={{
          paddingTop: '6px',
          borderTop: `1px solid ${palette.brass}22`,
          marginTop: '4px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <FlapRow
          text={centerRow(lang === 'en' ? 'TAP TO ORDER' : 'ご注文どうぞ', BOARD_DISPLAY_WIDTH)}
          width={BOARD_DISPLAY_WIDTH}
          startDelay={1100}
          palette={palette}
          jp={lang === 'jp'}
          refreshKey={refreshKey}
          tileSize={tileSize}
        />
      </div>
    </div>
  );

  const header = (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '12px',
        paddingBottom: '4px',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          onClick={handleBeanTap}
          style={{
            cursor: 'pointer',
            animation: bouncing ? 'beanBounce 2200ms ease both' : 'none',
            display: 'inline-flex',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Logo size={isTablet ? 48 : 42} color={palette.brass} stroke={6} />
        </div>
        <style>{`@keyframes beanBounce{0%{transform:translateY(0)}10%{transform:translateY(-14px)}20%{transform:translateY(0)}30%{transform:translateY(-9px)}40%{transform:translateY(0)}50%{transform:translateY(-5px)}60%{transform:translateY(0)}70%{transform:translateY(-2.5px)}80%{transform:translateY(0)}90%{transform:translateY(-1px)}100%{transform:translateY(0)}}`}</style>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 300,
              fontSize: isTablet ? '38px' : '32px',
              color: palette.cream,
              letterSpacing: '-0.02em',
              margin: 0,
              lineHeight: 1,
            }}
          >
            daizu
          </h1>
          <span
            style={{
              fontFamily: "'Noto Serif JP', serif",
              fontSize: isTablet ? '22px' : '18px',
              color: palette.brass,
              fontWeight: 400,
            }}
          >
            大豆
          </span>
        </div>
      </div>
      {!isKiosk && (
      <button
        onClick={() => setMode(mode === 'cafe' ? 'bar' : 'cafe')}
        style={{
          background: 'transparent',
          border: `1px solid ${palette.brass}`,
          color: palette.brass,
          fontFamily: "'Geist Mono', monospace",
          fontSize: isTablet ? '12px' : '10px',
          letterSpacing: '0.15em',
          padding: isTablet ? '7px 12px' : '5px 9px',
          borderRadius: '2px',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        {mode === 'cafe' ? '→ bar' : '→ cafe'}
      </button>
      )}
    </header>
  );

  // ───────────────────────────────────────────────────────────────────────────
  // PHONE LAYOUT — unchanged from original
  // ───────────────────────────────────────────────────────────────────────────
  if (!isTablet) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: palette.bg,
          padding: '28px 16px 60px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          transition: 'background 600ms ease',
          position: 'relative',
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        {header}
        {board}
        <p
          style={{
            textAlign: 'center',
            fontFamily: "'Geist Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.2em',
            color: palette.brass,
            opacity: 0.6,
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          — for bean&apos;s favorite human —
        </p>
        <BaristaDot onOpen={() => router.push('/barista')} palette={palette} />
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TABLET LAYOUT — centered idle, two-column when a drink is selected
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: palette.bg,
        padding: '40px 60px 60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px',
        transition: 'background 600ms ease',
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {header}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedDrink ? '1.3fr 1fr' : '1fr',
          gap: '40px',
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          transition: 'grid-template-columns 350ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          alignItems: 'start',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            transition: 'transform 350ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>{board}</div>
        </div>

        {selectedDrink && (
          <PreviewPane
            drinkName={selectedDrink}
            mode={mode}
            palette={palette}
            onCustomize={() =>
              router.push(`/customize/${encodeURIComponent(selectedDrink)}${mode === 'bar' ? '?from=bar' : ''}`)
            }
            onDismiss={() => setSelectedDrink(null)}
          />
        )}
      </div>

      <p
        style={{
          textAlign: 'center',
          fontFamily: "'Geist Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.25em',
          color: palette.brass,
          opacity: 0.6,
          textTransform: 'uppercase',
          margin: 0,
        }}
      >
        — for bean&apos;s favorite human —
      </p>

      <BaristaDot onOpen={() => router.push('/barista')} palette={palette} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PreviewPane — tablet-only right column showing the selected drink's details
// ─────────────────────────────────────────────────────────────────────────────
function PreviewPane({
  drinkName,
  mode,
  palette,
  onCustomize,
  onDismiss,
}: {
  drinkName: string;
  mode: 'cafe' | 'bar';
  palette: typeof COLORS.cafe;
  onCustomize: () => void;
  onDismiss: () => void;
}) {
  const cocktail = mode === 'bar' ? COCKTAILS.find((c) => c.name === drinkName) : null;
  const coffee = mode === 'cafe' ? DRINKS.find((d) => d.name === drinkName) : null;
  const cocktailRecipe = cocktail ? COCKTAIL_RECIPES[cocktail.name] : null;
  const coffeeRecipe = coffee ? RECIPES[coffee.name] : null;

  if (!cocktail && !coffee) return null;

  const displayName = (cocktail?.name ?? coffee?.name ?? '').toLowerCase();
  const tagline = cocktail?.note ?? coffee?.note ?? '';

  return (
    <div
      style={{
        padding: '12px 4px',
        animation: 'previewFadeIn 350ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '10px',
              letterSpacing: '0.25em',
              color: palette.brass,
              textTransform: 'uppercase',
              margin: '0 0 4px',
              opacity: 0.7,
            }}
          >
            selected
          </p>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 300,
              fontSize: '40px',
              color: palette.cream,
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            {displayName}
          </h2>
          <p
            style={{
              fontStyle: 'italic',
              fontSize: '14px',
              color: palette.brass,
              opacity: 0.8,
              margin: '6px 0 0',
            }}
          >
            {tagline}
          </p>
        </div>
        <button
          onClick={onDismiss}
          aria-label="dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: palette.brass,
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px',
            opacity: 0.5,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {cocktailRecipe && (
        <>
          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: `1px solid ${palette.brass}22`,
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <GlassIcon
              type={cocktailRecipe.glass}
              size={48}
              color={palette.brass}
              stroke={2}
            />
            <div>
              <p
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: '10px',
                  letterSpacing: '0.2em',
                  color: palette.brass,
                  textTransform: 'uppercase',
                  margin: 0,
                  opacity: 0.7,
                }}
              >
                glassware
              </p>
              <p style={{ margin: '2px 0 6px', fontSize: '14px', color: palette.cream }}>
                {cocktailRecipe.glassLabel}
              </p>
              <p
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: '10px',
                  letterSpacing: '0.2em',
                  color: palette.brass,
                  textTransform: 'uppercase',
                  margin: 0,
                  opacity: 0.7,
                }}
              >
                garnish
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '14px', color: palette.cream }}>
                {cocktailRecipe.garnish}
              </p>
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${palette.brass}22` }}>
            <p
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '10px',
                letterSpacing: '0.2em',
                color: palette.brass,
                textTransform: 'uppercase',
                margin: '0 0 8px',
                opacity: 0.7,
              }}
            >
              ingredients
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {cocktailRecipe.ingredients.map((ing, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: '13px',
                    color: palette.cream,
                    padding: '4px 0',
                    opacity: 0.9,
                  }}
                >
                  · {ing}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {coffeeRecipe && (
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${palette.brass}22` }}>
          <p
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '10px',
              letterSpacing: '0.2em',
              color: palette.brass,
              textTransform: 'uppercase',
              margin: '0 0 8px',
              opacity: 0.7,
            }}
          >
            ratio · {coffeeRecipe.ratio}
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {coffeeRecipe.base.map((ing, i) => (
              <li
                key={i}
                style={{
                  fontSize: '13px',
                  color: palette.cream,
                  padding: '4px 0',
                  opacity: 0.9,
                }}
              >
                · {ing}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onCustomize}
        style={{
          width: '100%',
          marginTop: '24px',
          background: palette.cream,
          color: palette.bg,
          border: 'none',
          padding: '14px',
          fontFamily: "'Geist Mono', monospace",
          fontSize: '12px',
          letterSpacing: '0.25em',
          fontWeight: 600,
          textTransform: 'uppercase',
          borderRadius: '2px',
          cursor: 'pointer',
        }}
      >
        customize order →
      </button>

      <style>{`
        @keyframes previewFadeIn {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BaristaDot — long-press the brass shaker to enter /barista
// ─────────────────────────────────────────────────────────────────────────────
function BaristaDot({
  onOpen,
  palette,
}: {
  onOpen: () => void;
  palette: { brass: string };
}) {
  const [pressing, setPressing] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPress = () => {
    setPressing(true);
    pressTimer.current = setTimeout(() => {
      onOpen();
      setPressing(false);
    }, 350); // long-press = 350ms
  };

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
    setPressing(false);
  };

  return (
    <button
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      aria-label="barista access (long press)"
      style={{
        position: 'fixed',
        bottom: '14px',
        right: '14px',
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: 'transparent',
        border: 'none',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 50,
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke={palette.brass}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          opacity: pressing ? 0.9 : 0.35,
          transform: pressing ? 'scale(1.15)' : 'scale(1)',
          transition: 'opacity 200ms ease, transform 200ms ease',
        }}
        aria-hidden="true"
      >
        <path d="M9 3 L15 3 L15 6 L9 6 Z" />
        <path d="M8 6 L16 6 L15 21 L9 21 Z" />
        <path d="M10 11 L14 11" />
      </svg>
    </button>
  );
}
