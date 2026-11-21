'use client';

import { useRouter } from 'next/navigation';
import { homeDate, type Bean } from '@/lib/beans';
import { bagName, daysFrom, fmtDay, fmtWindow, nextBag, runsOutOn, type RoosRecord, type Stage } from '@/lib/supply';
import { Btn, Card, Label, P, Pill, mono } from './ui';

const STEPS: { label: string; on: Stage[] }[] = [
  { label: 'ordered', on: ['ordered', 'shipped', 'out', 'delivered'] },
  { label: 'shipped', on: ['shipped', 'out', 'delivered'] },
  { label: 'out today', on: ['out', 'delivered'] },
  { label: 'here', on: ['delivered'] },
];

/**
 * The next RoosRoast bag (option B of the next-bag mockups): when it ships,
 * when it lands, and whether the hopper lasts that long. When it's
 * delivered, one button opens the new-bag form already filled in.
 */
export function NextBagCard({ roos, hopper, bags, doubles, shotsOnBag }: {
  roos: RoosRecord | null;
  hopper: Bean | null;
  bags: Bean[];
  doubles: number | null;
  shotsOnBag: number;
}) {
  const router = useRouter();
  const today = homeDate();
  const nb = nextBag(roos, hopper, today);
  const name = bagName(nb.item, bags);
  const item = name || 'The next bag';

  const pill =
    nb.stage === 'scheduled'
      ? (() => {
          const d = daysFrom(today, nb.shipOn);
          return d <= 0 ? 'ships today' : d === 1 ? 'ships tomorrow' : `in ${d} days`;
        })()
      : nb.stage === 'out' ? 'out today' : nb.stage;

  const headline =
    nb.stage === 'scheduled' ? <>Ships <b>{fmtDay(nb.shipOn, true)}</b>, here {fmtWindow(nb.arriveFrom, nb.arriveTo)}</>
    : nb.stage === 'ordered' ? <>{item}, ordered <b>{fmtDay(nb.shipOn)}</b>, here {fmtWindow(nb.arriveFrom, nb.arriveTo)}</>
    : nb.stage === 'shipped' ? <>{item}, shipped <b>{fmtDay(nb.shipOn)}</b>, here {fmtWindow(nb.arriveFrom, nb.arriveTo)}</>
    : nb.stage === 'out' ? <>{item} is out for delivery today</>
    : <>{item} arrived {nb.deliveredOn === today ? 'today' : fmtDay(nb.deliveredOn!)}</>;

  // Home only reads the RoosRoast emails while it's open; say when it last did
  const checkedAgo = roos?.checkedAt ? daysFrom(homeDate(roos.checkedAt), today) : null;

  // Will the hopper last until it lands?
  let supply: { text: string; short: boolean } | null = null;
  if (nb.stage !== 'delivered' && hopper && doubles != null) {
    const out = runsOutOn({ openedOn: hopper.opened_on, shotsOnBag, doublesLeft: doubles, today });
    const n = `about ${doubles} double${doubles === 1 ? '' : 's'} left`;
    if (!out) supply = { text: n, short: false };
    else if (out < nb.arriveFrom) supply = { text: `${n} · out around ${fmtDay(out)}, before it lands`, short: true };
    else supply = { text: `${n} · lasts to about ${fmtDay(out)}`, short: false };
  }

  const add = () => {
    const q = new URLSearchParams();
    if (name) q.set('name', name);
    q.set('roaster', 'RoosRoast');
    q.set('roast', nb.shipOn);
    if (nb.grams) q.set('grams', String(nb.grams));
    router.push(`/barista/bean?${q}`);
  };

  return (
    <>
      <Card>
        <Label right={<Pill tone={nb.stage === 'scheduled' ? 'brass' : 'sage'}>{pill}</Pill>}>next bag · roosroast</Label>
        <div style={{ fontSize: '15px', lineHeight: 1.35 }}>{headline}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '10px' }}>
          {STEPS.map((s) => {
            const on = s.on.includes(nb.stage);
            return (
              <div key={s.label} style={{ ...mono({ fontSize: '9px', letterSpacing: '0.08em' }), textAlign: 'center', color: on ? P.bg : `${P.bg}77` }}>
                <i style={{ display: 'block', height: '6px', borderRadius: '3px', background: on ? '#7B9F8C' : `${P.bg}14`, marginBottom: '6px' }} />
                {s.label}
              </div>
            );
          })}
        </div>
        {supply && <div style={{ color: supply.short ? P.accent : `${P.bg}99`, marginTop: '8px', fontSize: '13px' }}>{supply.text}</div>}
        {checkedAgo != null && checkedAgo > 2 && <div style={{ color: `${P.bg}77`, marginTop: '8px', fontSize: '12px' }}>RoosRoast emails checked {checkedAgo} days ago</div>}
        {!roos && <div style={{ color: `${P.bg}77`, marginTop: '8px', fontSize: '12px' }}>from the every-two-weeks schedule; Home hasn&apos;t passed on any RoosRoast emails yet</div>}
      </Card>
      {nb.stage === 'delivered' && <Btn onClick={add}>add it · roasted {fmtDay(nb.shipOn).toLowerCase()}</Btn>}
    </>
  );
}
