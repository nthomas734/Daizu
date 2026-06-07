'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { FlapRow, TileSize } from '@/components/SplitFlap';
import { GlassIcon } from '@/components/GlassIcon';
import {
  ALL_BOTTLES,
  BABY_GUINNESS,
  COCKTAILS,
  COCKTAIL_RECIPES,
  COLORS,
  DRINKS,
  GlassType,
  RECIPES,
  SPIRITS_MIXERS,
} from '@/lib/menu';
import { useViewport } from '@/lib/useViewport';

export default function MenuPage() {
  const router = useRouter();
  const viewport = useViewport();
  const isTablet = viewport === 'tablet';

  const [mode, setMode]     = useState<'cafe' | 'bar'>('cafe');
  const [isKiosk, setIsKiosk] = useState(false);
  const [barTab, setBarTab] = useState<'cocktails' | 'bottles'>('cocktails');
  const [lang, setLang]     = useState<'jp' | 'en'>('jp');
  const [outOfStock, setOutOfStock] = useState<{ drinks: string[] }>({ drinks: [] });
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDrink, setSelectedDrink] = useState<string | null>(null);

  // Bottle quick-order sheet
  const [sheetItem, setSheetItem] = useState<{ name: string; note: string; isSpirit: boolean } | null>(null);
  const [sheetMixer, setSheetMixer] = useState('neat');
  const [guestName, setGuestName]   = useState('');
  const [sheetSubmitting, setSheetSubmitting] = useState(false);

  // Baby Guinness chamber easter egg
  const [chamberOpen, setChamberOpen]     = useState(false);
  const [podOpen, setPodOpen]             = useState(false);
  const [coreGlow, setCoreGlow]           = useState(false);
  const [pourActive, setPourActive]       = useState(false);
  const [msgVisible, setMsgVisible]       = useState(false);
  const [sendVisible, setSendVisible]     = useState(false);


  // Bean hold gesture state
  const [beanHolding, setBeanHolding] = useState(false);
  const beanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const palette = mode === 'cafe' ? COLORS.cafe : COLORS.bar;
  const BOARD_WIDTH = 16;

  // On mount — read URL params for initial mode and kiosk flag
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'bar') {
      setMode('bar');
      setIsKiosk(true);
    }
  }, []);

  // JP flourish on load
  useEffect(() => {
    const t = setTimeout(() => setLang('en'), 1400);
    return () => clearTimeout(t);
  }, []);

  // Re-flip tiles on language, mode, or sub-tab change
  useEffect(() => {
    setRefreshKey(k => k + 1);
  }, [lang, mode, barTab]);

  // Clear tablet selection on mode/tab switch
  useEffect(() => {
    setSelectedDrink(null);
  }, [mode, barTab]);

  // Theme color meta
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

  // Load out-of-stock list
  useEffect(() => {
    fetch('/api/out-of-stock')
      .then(r => r.json())
      .then(d => { if (d.outOfStock) setOutOfStock(d.outOfStock); })
      .catch(() => {});
  }, []);

  const formatRow = (name: string, price: string) => {
    const space = BOARD_WIDTH - name.length - price.length;
    if (space <= 1) return (name + ' ' + price).slice(0, BOARD_WIDTH);
    if (space === 2) return name + ' ' + price;
    return name + ' ' + '·'.repeat(space - 2) + ' ' + price;
  };
  const formatBarRow = (name: string) => name.padEnd(BOARD_WIDTH, ' ').slice(0, BOARD_WIDTH);

  // ── Build items list ──────────────────────────────────────────────────────

  type MenuItem = {
    name: string;
    jp: string;
    glass?: GlassType;
    rowText: string;
    jpRowText: string;
    isSpirit?: boolean;
    note?: string;
  };

  const items: MenuItem[] =
    mode === 'cafe'
      ? DRINKS.filter(d => !outOfStock.drinks.includes(d.name)).map(d => ({
          name: d.name, jp: d.jp,
          rowText: formatRow(d.name, d.price),
          jpRowText: (d.jp + ' ' + d.price).slice(0, BOARD_WIDTH).padEnd(BOARD_WIDTH, ' '),
        }))
      : barTab === 'cocktails'
      ? COCKTAILS.filter(c => !outOfStock.drinks.includes(c.name)).map(c => ({
          name: c.name, jp: c.jp, glass: c.glass,
          rowText: formatBarRow(c.display),
          jpRowText: c.jp.padEnd(BOARD_WIDTH, ' ').slice(0, BOARD_WIDTH),
        }))
      : ALL_BOTTLES.filter(b => !outOfStock.drinks.includes(b.name)).map(b => ({
          name: b.name, jp: b.jp,
          rowText: formatBarRow(b.display),
          jpRowText: b.jp.padEnd(BOARD_WIDTH, ' ').slice(0, BOARD_WIDTH),
          isSpirit: b.type === 'spirit',
          note: b.note,
        }));

  const headerText = (() => {
    if (mode === 'cafe') return lang === 'en' ? '     MENU     ' : '    メニュー   ';
    if (barTab === 'cocktails') return lang === 'en' ? ' COCKTAIL MENU ' : '    カクテル    ';
    return lang === 'en' ? '  BOTTLE LIST  ' : '  ビール・酒  ';
  })();

  // ── Drink tap handler ─────────────────────────────────────────────────────

  const handleDrinkTap = (item: MenuItem) => {
    if (mode === 'bar' && barTab === 'bottles') {
      setSheetItem({ name: item.name, note: item.note || '', isSpirit: !!item.isSpirit });
      setSheetMixer('neat');
      return;
    }
    const customizeUrl = `/customize/${encodeURIComponent(item.name)}${mode === 'bar' ? '?from=bar' : ''}`;
    if (isTablet) {
      if (selectedDrink === item.name) router.push(customizeUrl);
      else setSelectedDrink(item.name);
    } else {
      router.push(customizeUrl);
    }
  };

  // ── Bottle sheet submit ───────────────────────────────────────────────────

  const handleSheetSubmit = async () => {
    if (!sheetItem) return;
    setSheetSubmitting(true);
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'bar',
        subcategory: 'bottle',
        drink: sheetItem.name,
        mixer: sheetItem.isSpirit ? sheetMixer : null,
        customer: guestName.trim() || 'Guest',
        notes: '',
      }),
    });
    const data = await res.json();
    if (data.order) {
      setSheetItem(null);
      setGuestName('');
      router.push(`/confirm/${data.order.id}?from=bar`);
    } else {
      setSheetSubmitting(false);
      alert('Something went wrong placing the order.');
    }
  };

  // ── Bean long-press / chamber ─────────────────────────────────────────────

  const startBeanHold = (e: React.PointerEvent) => {
    e.preventDefault();
    setBeanHolding(true);
    beanTimer.current = setTimeout(openChamber, 1500);
  };

  const cancelBeanHold = () => {
    if (beanTimer.current) clearTimeout(beanTimer.current);
    beanTimer.current = null;
    setBeanHolding(false);
  };

  const openChamber = () => {
    setBeanHolding(false);
    setChamberOpen(true);
    setTimeout(() => setPodOpen(true),   150);
    setTimeout(() => setCoreGlow(true),  500);
    setTimeout(() => setPourActive(true), 900);
    setTimeout(() => setMsgVisible(true), 2100);
    setTimeout(() => setSendVisible(true), 2500);
  };

  const closeChamber = () => {
    setChamberOpen(false);
    setPodOpen(false); setCoreGlow(false); setPourActive(false);
    setMsgVisible(false); setSendVisible(false);
  };

  const handleChamberSubmit = () => {}; // reserved — Baby Guinness disabled (no Baileys)

  // Ring animation values — fills over 1.5s when holding
  const RING_C = 126; // circumference: 2π × 20
  const ringStyle = {
    strokeDashoffset: beanHolding ? 0 : RING_C,
    transition: beanHolding
      ? 'stroke-dashoffset 1.5s linear'
      : 'stroke-dashoffset 0s',
  };

  // ── Board JSX (shared between phone and tablet) ───────────────────────────

  const tileSize: TileSize = !isTablet ? 'sm' : selectedDrink ? 'lg' : 'md';

  const board = (
    <div
      style={{
        background: palette.board,
        borderRadius: '6px',
        padding: isTablet ? '24px 20px' : '18px 12px',
        border: `1px solid ${palette.brass}33`,
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
        gap: isTablet && !selectedDrink ? '8px' : '6px',
      }}
    >
      {/* Sub-tab for bar mode */}
      {mode === 'bar' && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          {(['cocktails', 'bottles'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setBarTab(tab)}
              style={{
                flex: 1,
                fontFamily: "'Geist Mono', monospace",
                fontSize: tileSize === 'sm' ? '9px' : '10px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                padding: '7px 0',
                borderRadius: '2px',
                border: `1px solid ${barTab === tab ? palette.brass : palette.brass + '44'}`,
                background: barTab === tab ? palette.brass : 'transparent',
                color: barTab === tab ? palette.board : palette.brass,
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Header row */}
      <div style={{ paddingBottom: '6px', borderBottom: `1px solid ${palette.brass}22`, marginBottom: '4px', display: 'flex', justifyContent: 'center' }}>
        <FlapRow text={headerText} width={BOARD_WIDTH} startDelay={0} palette={palette} jp={lang === 'jp'} refreshKey={refreshKey} tileSize={tileSize} />
      </div>

      {/* Menu rows */}
      {items.map((d, i) => {
        const text = lang === 'jp' ? d.jpRowText : d.rowText;
        const isSelected = isTablet && selectedDrink === d.name;
        return (
          <button
            key={d.name}
            onClick={() => handleDrinkTap(d)}
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
              width: '100%',
              transition: 'background 200ms ease, border-left 200ms ease',
            }}
          >
            <FlapRow text={text} width={BOARD_WIDTH} startDelay={300 + i * 80} palette={palette} jp={lang === 'jp'} refreshKey={refreshKey} tileSize={tileSize} />
          </button>
        );
      })}

      {/* Footer */}
      <div style={{ paddingTop: '6px', borderTop: `1px solid ${palette.brass}22`, marginTop: '4px', display: 'flex', justifyContent: 'center' }}>
        <FlapRow text={lang === 'en' ? ' TAP TO ORDER ' : '  ご注文どうぞ  '} width={BOARD_WIDTH} startDelay={1100} palette={palette} jp={lang === 'jp'} refreshKey={refreshKey} tileSize={tileSize} />
      </div>
    </div>
  );

  // ── Bean logo (the long-press target) ─────────────────────────────────────

  const beanLogo = (
    <button
      onPointerDown={startBeanHold}
      onPointerUp={cancelBeanHold}
      onPointerLeave={cancelBeanHold}
      onPointerCancel={cancelBeanHold}
      style={{
        position: 'relative', width: '48px', height: '48px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
        WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
      }}
      aria-label="daizu logo"
    >
      {/* Progress ring */}
      <svg
        viewBox="0 0 44 44"
        width="48" height="48"
        style={{ position: 'absolute', top: '-2px', left: '-2px', transform: 'rotate(-90deg)' }}
      >
        <circle
          cx="22" cy="22" r="20"
          fill="none"
          stroke={palette.brass}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          style={ringStyle as React.CSSProperties}
          opacity={beanHolding ? 0.9 : 0}
        />
      </svg>
      <Logo
        size={isTablet ? 40 : 36}
        color={palette.brass}
        stroke={6}
        style={{
          filter: beanHolding ? `drop-shadow(0 0 6px ${palette.brass}99)` : 'none',
          transform: beanHolding ? 'scale(1.06)' : 'scale(1)',
          transition: 'filter 0.3s ease, transform 0.2s ease',
        }}
      />
    </button>
  );

  // ── Header (shared) ───────────────────────────────────────────────────────

  const header = (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', paddingBottom: '4px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {beanLogo}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, fontSize: isTablet ? '38px' : '32px', color: palette.cream, letterSpacing: '-0.02em', margin: 0, lineHeight: 1 }}>
            daizu
          </h1>
          <span style={{ fontFamily: "'Noto Serif JP', serif", fontSize: isTablet ? '22px' : '18px', color: palette.brass, fontWeight: 400 }}>
            大豆
          </span>
        </div>
      </div>
      {/* Mode toggle — hidden in kiosk mode */}
      {!isKiosk && (
        <button
          onClick={() => setMode(mode === 'cafe' ? 'bar' : 'cafe')}
          style={{
            background: 'transparent', border: `1px solid ${palette.brass}`,
            color: palette.brass, fontFamily: "'Geist Mono', monospace",
            fontSize: isTablet ? '12px' : '10px', letterSpacing: '0.15em',
            padding: isTablet ? '7px 12px' : '5px 9px', borderRadius: '2px',
            textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          {mode === 'cafe' ? '→ bar' : '→ cafe'}
        </button>
      )}
    </header>
  );

  // ── Bottle quick-order sheet ──────────────────────────────────────────────

  const sheet = sheetItem && (
    <div
      onClick={e => { if (e.target === e.currentTarget) setSheetItem(null); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end',
        transition: 'background 0.2s',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: '480px', margin: '0 auto',
          background: '#16263b',
          borderTop: `1px solid ${palette.brass}33`,
          borderRadius: '18px 18px 0 0',
          padding: '22px 20px 32px',
          animation: 'slideUp 280ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, fontSize: '30px', color: palette.cream, letterSpacing: '-0.02em', marginBottom: '2px' }}>
          {sheetItem.name.toLowerCase()}
        </div>
        <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: palette.brass, opacity: 0.8, letterSpacing: '0.1em', marginBottom: '18px', fontStyle: 'italic' }}>
          {sheetItem.note}
        </div>

        {sheetItem.isSpirit && (
          <div style={{ marginBottom: '18px' }}>
            <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: palette.brass, textTransform: 'uppercase', margin: '0 0 10px' }}>
              how do you take it?
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SPIRITS_MIXERS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSheetMixer(m.id)}
                  style={{
                    background: sheetMixer === m.id ? palette.cream : 'transparent',
                    color: sheetMixer === m.id ? palette.board : palette.cream,
                    border: `1px solid ${sheetMixer === m.id ? palette.cream : palette.brass + '55'}`,
                    padding: '9px 16px', borderRadius: '2px',
                    fontFamily: "'Manrope', sans-serif", fontSize: '13px',
                    cursor: 'pointer', transition: 'all 200ms ease',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: palette.brass, textTransform: 'uppercase', margin: '0 0 8px' }}>
            your name
          </p>
          <input
            type="text"
            value={guestName}
            onChange={e => setGuestName(e.target.value)}
            placeholder="your name"
            style={{
              width: '100%', background: 'transparent',
              border: `1px solid ${palette.brass}44`, borderRadius: '2px',
              padding: '10px 12px', color: palette.cream,
              fontFamily: "'Manrope', sans-serif", fontSize: '14px', boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          onClick={handleSheetSubmit}
          disabled={sheetSubmitting}
          style={{
            width: '100%', background: palette.cream, color: palette.board,
            border: 'none', padding: '16px',
            fontFamily: "'Geist Mono', monospace", fontSize: '13px',
            letterSpacing: '0.25em', fontWeight: 600, textTransform: 'uppercase',
            borderRadius: '2px', cursor: sheetSubmitting ? 'wait' : 'pointer',
            opacity: sheetSubmitting ? 0.7 : 1,
          }}
        >
          {sheetSubmitting ? 'sending…' : 'send order →'}
        </button>

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );

  // ── Baby Guinness chamber overlay ─────────────────────────────────────────

  const chamber = chamberOpen && (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: podOpen ? 'rgba(8,14,24,0.97)' : 'rgba(8,14,24,0)',
        transition: 'background 0.5s ease',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '24px',
        padding: '0 20px',
      }}
    >
      {/* × close */}
      {!chamberSubmitting && (
        <button
          onClick={closeChamber}
          style={{
            position: 'absolute', top: '20px', right: '20px',
            color: palette.brass, fontSize: '24px', opacity: 0.6, padding: '8px', lineHeight: 1,
          }}
        >
          ×
        </button>
      )}

      {/* vault / pour stage */}
      <div style={{ position: 'relative', width: '200px', height: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* outer brass ring */}
        <div style={{
          position: 'absolute', width: '180px', height: '180px', borderRadius: '50%',
          border: '1px solid rgba(200,169,126,0.3)',
          transform: coreGlow ? 'rotate(160deg) scale(1)' : 'rotate(0deg) scale(0.8)',
          opacity: coreGlow ? 1 : 0,
          transition: 'transform 2.2s 0.15s cubic-bezier(0.3,0,0.2,1), opacity 0.6s 0.15s',
        }} />
        {/* inner dashed ring */}
        <div style={{
          position: 'absolute', width: '130px', height: '130px', borderRadius: '50%',
          border: '1px dashed rgba(200,169,126,0.22)',
          transform: coreGlow ? 'rotate(-140deg) scale(1)' : 'rotate(0deg) scale(0.8)',
          opacity: coreGlow ? 1 : 0,
          transition: 'transform 2.0s 0.25s cubic-bezier(0.3,0,0.2,1), opacity 0.6s 0.25s',
        }} />
        {/* radial glow core */}
        <div style={{
          position: 'absolute', width: '40px', height: '40px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(247,243,234,0.85), rgba(200,169,126,0) 70%)',
          transform: coreGlow ? 'scale(5)' : 'scale(0.3)',
          opacity: coreGlow ? 0.45 : 0,
          transition: 'transform 1.0s 0.5s, opacity 0.8s 0.5s',
        }} />

        {/* the shot glass + pour */}
        <div style={{
          position: 'absolute', width: '64px', height: '120px',
          border: '2px solid rgba(200,169,126,0.55)', borderTop: 'none',
          borderRadius: '5px 5px 12px 12px', overflow: 'hidden',
          background: 'rgba(255,255,255,0.02)',
          opacity: pourActive ? 1 : 0,
          transition: 'opacity 0.4s',
          zIndex: 2,
        }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            height: pourActive ? '72%' : '0%',
            background: 'linear-gradient(#3a2418, #180c06)',
            transition: 'height 1.05s 0.15s cubic-bezier(0.45,0.05,0.3,1)',
          }} />
          <div style={{
            position: 'absolute', left: 0, right: 0, height: '22px',
            background: 'linear-gradient(#fff7e8, #ecd9b6)',
            borderRadius: '40% 40% 0 0 / 60% 60% 0 0',
            opacity: pourActive ? 1 : 0,
            transform: pourActive ? 'scaleY(1)' : 'scaleY(0.2)',
            transformOrigin: 'bottom',
            transition: 'opacity 0.5s 1.1s, transform 0.6s 1.1s',
          }} />
        </div>

        {/* the pod halves */}
        <div style={{ position: 'absolute', width: '110px', height: '140px', zIndex: 3, pointerEvents: 'none' }}>
          {/* left */}
          <div style={{
            position: 'absolute', left: 0, top: 0, width: '55px', height: '140px',
            border: '2.5px solid #C8A97E', borderRight: 'none',
            borderRadius: '120px 0 0 120px',
            transformOrigin: 'right center',
            transform: podOpen ? 'perspective(500px) rotateY(-130deg)' : 'rotateY(0deg)',
            opacity: podOpen ? 0.12 : 1,
            transition: 'transform 1.1s 0.35s cubic-bezier(0.5,0,0.2,1), opacity 0.6s 1.1s',
          }} />
          {/* right */}
          <div style={{
            position: 'absolute', right: 0, top: 0, width: '55px', height: '140px',
            border: '2.5px solid #C8A97E', borderLeft: 'none',
            borderRadius: '0 120px 120px 0',
            transformOrigin: 'left center',
            transform: podOpen ? 'perspective(500px) rotateY(130deg)' : 'rotateY(0deg)',
            opacity: podOpen ? 0.12 : 1,
            transition: 'transform 1.1s 0.35s cubic-bezier(0.5,0,0.2,1), opacity 0.6s 1.1s',
          }} />
          {/* sprout — fades as pod opens */}
          <svg
            style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', opacity: podOpen ? 0 : 1, transition: 'opacity 0.3s' }}
            width="32" height="24" viewBox="0 0 32 24" fill="none" stroke="#C8A97E" strokeWidth="2" strokeLinecap="round"
          >
            <path d="M9 22c-4-6 0-12 7-13" />
            <path d="M23 22c4-6 0-12-7-13" />
          </svg>
        </div>
      </div>

      {/* message */}
      <div style={{
        textAlign: 'center',
        opacity: msgVisible ? 1 : 0,
        transform: msgVisible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.7s, transform 0.7s',
      }}>
        <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '22px', color: '#F5EDE0', fontWeight: 300 }}>
          すべて、きみのために
        </div>
        <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.28em', color: '#C8A97E', textTransform: 'uppercase', marginTop: '8px' }}>
          everything, just for you
        </div>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, fontSize: '28px', marginTop: '18px', letterSpacing: '-0.02em', color: '#F5EDE0' }}>
          baby guinness
        </div>
      </div>

      {/* coming soon note — fades in last (no Baileys tonight) */}
      {sendVisible && (
        <div style={{ width: '100%', maxWidth: '280px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{
            fontFamily: "'Geist Mono', monospace", fontSize: '10px',
            letterSpacing: '0.22em', color: 'rgba(200,169,126,0.65)',
            textTransform: 'uppercase', margin: 0,
          }}>
            not tonight — but soon.
          </p>
          <button
            onClick={closeChamber}
            style={{
              background: 'transparent', color: '#F5EDE0',
              border: '1px solid rgba(245,237,224,0.25)', padding: '12px',
              fontFamily: "'Geist Mono', monospace", fontSize: '11px',
              letterSpacing: '0.2em', textTransform: 'uppercase',
              borderRadius: '2px', cursor: 'pointer',
            }}
          >
            close
          </button>
        </div>
      )}
    </div>
  );

  // ── Phone layout ──────────────────────────────────────────────────────────

  if (!isTablet) {
    return (
      <div style={{
        minHeight: '100vh', background: palette.bg,
        padding: '28px 16px 60px', display: 'flex', flexDirection: 'column', gap: '28px',
        transition: 'background 600ms ease', position: 'relative',
        maxWidth: '480px', margin: '0 auto',
      }}>
        {header}
        {board}
        <p style={{ textAlign: 'center', fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: palette.brass, opacity: 0.6, textTransform: 'uppercase', margin: 0 }}>
          — for bean&apos;s favorite human —
        </p>
        {/* BaristaDot hidden in kiosk — guests shouldn't stumble into the queue */}
        {!isKiosk && <BaristaDot onOpen={() => router.push('/barista')} palette={palette} />}
        {sheet}
        {chamber}
      </div>
    );
  }

  // ── Tablet layout ─────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh', background: palette.bg,
      padding: '40px 60px 60px', display: 'flex', flexDirection: 'column', gap: '32px',
      transition: 'background 600ms ease', position: 'relative', width: '100%', boxSizing: 'border-box',
    }}>
      {header}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedDrink && barTab === 'cocktails' ? '1.3fr 1fr' : '1fr',
        gap: '40px', maxWidth: '1200px', width: '100%', margin: '0 auto',
        transition: 'grid-template-columns 350ms cubic-bezier(0.4,0.0,0.2,1)', alignItems: 'start',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', transition: 'transform 350ms cubic-bezier(0.4,0.0,0.2,1)' }}>
          <div style={{ width: '100%', maxWidth: selectedDrink ? '600px' : '720px' }}>{board}</div>
        </div>
        {selectedDrink && barTab === 'cocktails' && (
          <PreviewPane
            drinkName={selectedDrink}
            mode={mode}
            palette={palette}
            onCustomize={() => router.push(`/customize/${encodeURIComponent(selectedDrink)}${mode === 'bar' ? '?from=bar' : ''}`)}
            onDismiss={() => setSelectedDrink(null)}
          />
        )}
      </div>
      <p style={{ textAlign: 'center', fontFamily: "'Geist Mono', monospace", fontSize: '11px', letterSpacing: '0.25em', color: palette.brass, opacity: 0.6, textTransform: 'uppercase', margin: 0 }}>
        — for bean&apos;s favorite human —
      </p>
      {!isKiosk && <BaristaDot onOpen={() => router.push('/barista')} palette={palette} />}
      {sheet}
      {chamber}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PreviewPane — tablet cocktail preview (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
function PreviewPane({
  drinkName, mode, palette, onCustomize, onDismiss,
}: {
  drinkName: string; mode: 'cafe' | 'bar'; palette: typeof COLORS.cafe;
  onCustomize: () => void; onDismiss: () => void;
}) {
  const cocktail = mode === 'bar' ? COCKTAILS.find(c => c.name === drinkName) : null;
  const coffee   = mode === 'cafe' ? DRINKS.find(d => d.name === drinkName) : null;
  const cocktailRecipe = cocktail ? COCKTAIL_RECIPES[cocktail.name] : null;
  const coffeeRecipe   = coffee   ? RECIPES[coffee.name] : null;
  if (!cocktail && !coffee) return null;

  return (
    <div style={{ padding: '12px 4px', animation: 'previewFadeIn 350ms cubic-bezier(0.4,0,0.2,1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.25em', color: palette.brass, textTransform: 'uppercase', margin: '0 0 4px', opacity: 0.7 }}>selected</p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, fontSize: '40px', color: palette.cream, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            {(cocktail?.name ?? coffee?.name ?? '').toLowerCase()}
          </h2>
          <p style={{ fontStyle: 'italic', fontSize: '14px', color: palette.brass, opacity: 0.8, margin: '6px 0 0' }}>
            {cocktail?.note ?? coffee?.note ?? ''}
          </p>
        </div>
        <button onClick={onDismiss} aria-label="dismiss" style={{ background: 'transparent', border: 'none', color: palette.brass, fontSize: '20px', cursor: 'pointer', padding: '4px 8px', opacity: 0.5, lineHeight: 1 }}>×</button>
      </div>

      {cocktailRecipe && (
        <>
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${palette.brass}22`, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <GlassIcon type={cocktailRecipe.glass} size={48} color={palette.brass} stroke={2} />
            <div>
              <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: palette.brass, textTransform: 'uppercase', margin: 0, opacity: 0.7 }}>glassware</p>
              <p style={{ margin: '2px 0 6px', fontSize: '14px', color: palette.cream }}>{cocktailRecipe.glassLabel}</p>
              <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: palette.brass, textTransform: 'uppercase', margin: 0, opacity: 0.7 }}>garnish</p>
              <p style={{ margin: '2px 0 0', fontSize: '14px', color: palette.cream }}>{cocktailRecipe.garnish}</p>
            </div>
          </div>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${palette.brass}22` }}>
            <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: palette.brass, textTransform: 'uppercase', margin: '0 0 8px', opacity: 0.7 }}>ingredients</p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {cocktailRecipe.ingredients.map((ing, i) => (
                <li key={i} style={{ fontSize: '13px', color: palette.cream, padding: '4px 0', opacity: 0.9 }}>· {ing}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      {coffeeRecipe && (
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${palette.brass}22` }}>
          <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: palette.brass, textTransform: 'uppercase', margin: '0 0 8px', opacity: 0.7 }}>ratio · {coffeeRecipe.ratio}</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {coffeeRecipe.base.map((ing, i) => (
              <li key={i} style={{ fontSize: '13px', color: palette.cream, padding: '4px 0', opacity: 0.9 }}>· {ing}</li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={onCustomize} style={{ width: '100%', marginTop: '24px', background: palette.cream, color: palette.bg, border: 'none', padding: '14px', fontFamily: "'Geist Mono', monospace", fontSize: '12px', letterSpacing: '0.25em', fontWeight: 600, textTransform: 'uppercase', borderRadius: '2px', cursor: 'pointer' }}>
        customize order →
      </button>
      <style>{`@keyframes previewFadeIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BaristaDot — long-press the brass shaker to enter /barista
// Hidden from kiosk/guests via the isKiosk check in the parent
// ─────────────────────────────────────────────────────────────────────────────
function BaristaDot({ onOpen, palette }: { onOpen: () => void; palette: { brass: string } }) {
  const [pressing, setPressing] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPress = () => {
    setPressing(true);
    pressTimer.current = setTimeout(() => { onOpen(); setPressing(false); }, 350);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
    setPressing(false);
  };

  return (
    <button
      onPointerDown={startPress} onPointerUp={cancelPress}
      onPointerLeave={cancelPress} onPointerCancel={cancelPress}
      aria-label="barista access (long press)"
      style={{
        position: 'fixed', bottom: '14px', right: '14px',
        width: '44px', height: '44px', borderRadius: '50%',
        background: 'transparent', border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 50,
        WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
        WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={palette.brass} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        style={{ opacity: pressing ? 0.9 : 0.35, transform: pressing ? 'scale(1.15)' : 'scale(1)', transition: 'opacity 200ms ease, transform 200ms ease' }}
        aria-hidden="true"
      >
        <path d="M9 3 L15 3 L15 6 L9 6 Z" /><path d="M8 6 L16 6 L15 21 L9 21 Z" /><path d="M10 11 L14 11" />
      </svg>
    </button>
  );
}
