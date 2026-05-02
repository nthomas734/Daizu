'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { FlapRow } from '@/components/SplitFlap';
import { GlassIcon } from '@/components/GlassIcon';
import { COCKTAILS, COLORS, DRINKS, GlassType } from '@/lib/menu';

export default function MenuPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'cafe' | 'bar'>('cafe');
  const [lang, setLang] = useState<'jp' | 'en'>('jp');
  const [outOfStock, setOutOfStock] = useState<{ drinks: string[] }>({ drinks: [] });
  const [refreshKey, setRefreshKey] = useState(0);
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

  // Format a bar row — cocktail name left-aligned, padded to full board width.
  // Glass icon is rendered separately to the right of the flap row.
  const formatBarRow = (name: string) => name.padEnd(BOARD_WIDTH, ' ').slice(0, BOARD_WIDTH);

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

  const headerText = (() => {
    if (mode === 'cafe') return lang === 'en' ? '     MENU     ' : '    メニュー   ';
    return lang === 'en' ? '     BAR      ' : '     バー     ';
  })();

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
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '12px',
          paddingBottom: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size={42} color={palette.brass} stroke={6} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 300,
                fontSize: '32px',
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
                fontSize: '18px',
                color: palette.brass,
                fontWeight: 400,
              }}
            >
              大豆
            </span>
          </div>
        </div>
        <button
          onClick={() => setMode(mode === 'cafe' ? 'bar' : 'cafe')}
          style={{
            background: 'transparent',
            border: `1px solid ${palette.brass}`,
            color: palette.brass,
            fontFamily: "'Geist Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.15em',
            padding: '5px 9px',
            borderRadius: '2px',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {mode === 'cafe' ? '→ bar' : '→ cafe'}
        </button>
      </header>

      <div
        style={{
          background: palette.board,
          borderRadius: '6px',
          padding: '18px 12px',
          border: `1px solid ${palette.brass}33`,
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div
          style={{
            paddingBottom: '6px',
            borderBottom: `1px solid ${palette.brass}22`,
            marginBottom: '4px',
          }}
        >
          <FlapRow
            text={headerText}
            width={BOARD_WIDTH}
            startDelay={0}
            palette={palette}
            jp={lang === 'jp'}
            refreshKey={refreshKey}
          />
        </div>

        {items.map((d, i) => {
          const text = lang === 'jp' ? d.jpRowText : d.rowText;
          return (
            <button
              key={d.name}
              onClick={() => router.push(`/customize/${encodeURIComponent(d.name)}`)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <FlapRow
                text={text}
                width={BOARD_WIDTH}
                startDelay={300 + i * 80}
                palette={palette}
                jp={lang === 'jp'}
                refreshKey={refreshKey}
              />
              {d.glass && (
                <div style={{ flexShrink: 0, width: '24px', display: 'flex', justifyContent: 'center' }}>
                  <GlassIcon type={d.glass} size={22} color={palette.brass} stroke={1.8} />
                </div>
              )}
            </button>
          );
        })}

        <div
          style={{
            paddingTop: '6px',
            borderTop: `1px solid ${palette.brass}22`,
            marginTop: '4px',
          }}
        >
          <FlapRow
            text={lang === 'en' ? ' TAP TO ORDER ' : '  ご注文どうぞ  '}
            width={BOARD_WIDTH}
            startDelay={1100}
            palette={palette}
            jp={lang === 'jp'}
            refreshKey={refreshKey}
          />
        </div>
      </div>

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

function BaristaDot({
  onOpen,
  palette,
}: {
  onOpen: () => void;
  palette: { brass: string };
}) {
  const [taps, setTaps] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = () => {
    setTaps((t) => {
      const next = t + 1;
      if (next >= 3) {
        if (tapTimer.current) clearTimeout(tapTimer.current);
        onOpen();
        return 0;
      }
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => setTaps(0), 800);
      return next;
    });
  };

  return (
    <button
      onClick={handleTap}
      aria-label="barista access"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: palette.brass,
        opacity: taps > 0 ? 0.5 : 0.18,
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        transition: 'opacity 150ms ease',
        zIndex: 50,
      }}
    />
  );
}
