'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adviseDialIn,
  adviseEveryday,
  dayOff,
  fmtGrind,
  parseNext,
  recipeOf,
  usualLoss,
  usualRange,
  type Advice,
  type Body,
  type Taste,
} from '@/lib/beans';
import { useBeans } from '@/components/beans/useBeans';
import { Btn, Card, Label, Note, P, SANS, Seg, Stepper, TopBar, mono } from '@/components/beans/ui';

const r1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

/**
 * Log a shot in ten seconds. Steppers start where the last shot ended (or at
 * the carried-over next step). One taste tap. The extras he only sometimes
 * tracks stay folded. ?order=ID logs the shot for that order (from "log the
 * whole shot" on the order page) and goes back to it; ?s= prefills seconds.
 */
export default function LogShotPage() {
  const router = useRouter();
  const { data } = useBeans();
  const [orderId, setOrderId] = useState<number | null>(null);
  const [secondsHint, setSecondsHint] = useState<number | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('order')) setOrderId(Number(q.get('order')));
    if (q.get('s')) setSecondsHint(Number(q.get('s')));
  }, []);

  const [ready, setReady] = useState(false);
  const [grind, setGrind] = useState(12);
  const [dose, setDose] = useState(18);
  const [yieldG, setYieldG] = useState(40);
  const [seconds, setSeconds] = useState(28);
  const [taste, setTaste] = useState<Taste | null>(null);
  const [body, setBody] = useState<Body | null>(null);
  const [more, setMore] = useState(false);
  const [pressure, setPressure] = useState<number | null>(null);
  const [afterEco, setAfterEco] = useState(false);
  const [beansIn, setBeansIn] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Advice | null | undefined>(undefined);

  const bag = data?.hopper ?? null;
  const shots = data?.shots ?? [];
  const recipe = recipeOf(shots);
  const handLogged = shots.filter((s) => s.order_id == null);
  const loss = usualLoss(shots);

  // Starting values: for an order, the recipe; otherwise the open thread,
  // then the last shot, then the recipe
  useEffect(() => {
    if (!data || ready) return;
    const next = parseNext(data.hopper?.next_step);
    const last = handLogged[0] ?? shots[0];
    const base = orderId && recipe ? recipe : null;
    setGrind(base?.grind ?? next?.grind ?? last?.grind ?? recipe?.grind ?? 12);
    setDose(base?.dose_g ?? next?.dose ?? last?.dose_g ?? recipe?.dose_g ?? 18);
    setYieldG(base?.yield_g ?? next?.yield ?? last?.yield_g ?? recipe?.yield_g ?? 40);
    setSeconds(secondsHint ?? base?.seconds ?? last?.seconds ?? recipe?.seconds ?? 28);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, orderId, secondsHint]);

  const input = { grind, dose_g: dose, yield_g: yieldG, seconds, pressure_seconds: pressure, after_eco: afterEco, taste };
  const range = useMemo(
    () => usualRange((data?.keyShots ?? []).filter((s) => data?.bags.find((b) => b.id === s.bean_id)?.name.toLowerCase() === bag?.name.toLowerCase())),
    [data, bag]
  );
  const preview: Advice | null =
    taste ? adviseDialIn(input, handLogged, range)
    : recipe ? adviseEveryday(input, recipe, { day: bag ? dayOff(bag) : null })
    : null;

  const back = () => router.push(orderId ? `/barista/order/${orderId}` : '/barista?tab=beans');

  const save = async (asRecipe: boolean) => {
    if (!bag || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/shots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bean_id: bag.id, order_id: orderId, grind, dose_g: dose, yield_g: yieldG, seconds,
          pressure_seconds: pressure, after_eco: afterEco, beans_in_g: beansIn, taste, body,
          note, is_recipe: asRecipe,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSaved(d.advice ?? null);
    } catch {
      setSaved(undefined);
      alert('Couldn’t save the shot. Check the connection and try again.');
    }
    setSaving(false);
  };

  const wrap = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: P.cream, color: P.bg, fontFamily: SANS }}>
      <TopBar back={orderId ? 'order' : 'beans'} onBack={back} title="log a shot" right={bag ? `shot ${shots.length + 1}` : ''} />
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px', paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </div>
  );

  if (!data) return wrap(<p style={mono({ opacity: 0.6 })}>loading…</p>);
  if (!bag) {
    return wrap(
      <>
        <Note tone="note">There&apos;s no bag in the hopper yet. Add it first, then shots land on it.</Note>
        <Btn onClick={() => router.push('/barista/bean')}>add the bag</Btn>
      </>
    );
  }

  if (saved !== undefined) {
    return wrap(
      <>
        <Note tone={saved?.offerRecipe || !saved?.next ? 'keep' : 'change'}>
          <b style={{ display: 'block', marginBottom: '2px' }}>Saved.</b>
          {saved?.text ?? 'Ran as the recipe. Nothing to change.'}
        </Note>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Btn line onClick={() => location.reload()}>log another</Btn>
          <Btn onClick={back}>{orderId ? 'back to order' : 'back to beans'}</Btn>
        </div>
      </>
    );
  }

  return wrap(
    <>
      <Card>
        <Label>{orderId ? 'this order’s shot' : 'starts at the last shot'} · hold for 0.05</Label>
        <Stepper id="grind" label="grind" value={grind} onChange={setGrind} step={0.25} fine={0.05} min={0} max={50} format={fmtGrind} />
        <Stepper id="dose" label="in the basket, g" value={dose} onChange={setDose} step={0.1} min={5} max={30} format={r1} />
        <Stepper id="yield" label="out, g" value={yieldG} onChange={setYieldG} step={1} fine={0.1} min={5} max={120} format={(v) => (Number.isInteger(v) ? String(v) : r1(v))} />
        <div style={{ borderBottom: 'none' }}>
          <Stepper id="seconds" label="seconds" value={seconds} onChange={setSeconds} step={1} min={1} max={120} />
        </div>
        <div style={{ color: `${P.bg}99`, marginTop: '8px', fontSize: '13px' }}>
          1 : {(yieldG / dose).toFixed(1)} · timed from pump on
        </div>
        <button
          onClick={() => setMore(!more)}
          style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', borderTop: `1px solid ${P.bg}12`, marginTop: '8px', color: `${P.bg}99`, fontSize: '13px', cursor: 'pointer' }}
        >
          <span>pressure time, after eco, beans in, note</span>
          <span style={mono()}>{more ? 'less ▴' : 'more ▾'}</span>
        </button>
        {more && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {pressure == null ? (
              <Optional label="seconds to reach pressure" onAdd={() => setPressure(7)} />
            ) : (
              <Stepper id="pressure" label="seconds to pressure" value={pressure} onChange={setPressure} step={1} min={0} max={60} />
            )}
            {beansIn == null ? (
              <Optional label="beans in, g (before the grinder)" onAdd={() => setBeansIn(Math.round((dose + (loss ?? 0.25)) * 10) / 10)} />
            ) : (
              <Stepper id="beansin" label="beans in, g" value={beansIn} onChange={setBeansIn} step={0.1} min={5} max={30} format={r1} />
            )}
            <button
              onClick={() => setAfterEco(!afterEco)}
              style={{ all: 'unset', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '48px', borderBottom: `1px solid ${P.bg}12`, fontSize: '13px', cursor: 'pointer' }}
            >
              <span>first shot after eco mode</span>
              <span style={{ ...mono({ fontWeight: 600 }), padding: '6px 12px', borderRadius: '20px', background: afterEco ? P.bg : `${P.bg}14`, color: afterEco ? P.cream : P.bg }}>{afterEco ? 'yes' : 'no'}</span>
            </button>
            <input
              id="shot-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="note: slow start, smooth after"
              style={{ width: '100%', boxSizing: 'border-box', marginTop: '8px', border: `1px solid ${P.bg}22`, borderRadius: '10px', padding: '12px', fontSize: '16px', fontFamily: SANS, color: P.bg, background: '#fff', outline: 'none' }}
            />
          </div>
        )}
      </Card>

      <Card>
        <Label>how did it taste?</Label>
        <Seg options={['sour', 'balanced', 'bitter'] as Taste[]} value={taste} onChange={setTaste} />
        <div style={{ marginTop: '12px' }}><Label>body, optional</Label></div>
        <Seg options={['thin', 'right', 'heavy'] as Body[]} value={body} onChange={setBody} />
        {!taste && <div style={{ color: `${P.bg}88`, marginTop: '10px', fontSize: '13px' }}>no taste picked: it saves as not tasted</div>}
      </Card>

      {preview && <Note tone={preview.offerRecipe ? 'keep' : 'change'}>{preview.text}</Note>}

      {taste === 'balanced' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Btn line disabled={saving} onClick={() => save(false)}>just save</Btn>
          <Btn disabled={saving} onClick={() => save(true)}>save as recipe</Btn>
        </div>
      ) : (
        <Btn disabled={saving} onClick={() => save(false)}>{saving ? 'saving…' : taste ? 'save shot' : 'save, not tasted'}</Btn>
      )}
    </>
  );
}

function Optional({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      style={{ all: 'unset', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '48px', borderBottom: `1px solid ${P.bg}12`, fontSize: '13px', cursor: 'pointer', color: P.bg }}
    >
      <span>{label}</span>
      <span style={mono({ color: '#8A6D3B' })}>+ add</span>
    </button>
  );
}
