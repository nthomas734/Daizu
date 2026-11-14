'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  beforeYouPull,
  dayOff,
  doublesLeft,
  fmtG,
  fmtGrind,
  gramsLeft,
  parseNext,
  pastRecipeLine,
  pastRecipes,
  recipeOf,
  type Shot,
} from '@/lib/beans';
import { useBeans } from './useBeans';
import { Btn, Card, Label, Note, P, Pill, RecipeTiles, SERIF, mono } from './ui';

const TASTE_DOT: Record<string, string> = { sour: '#A84438', balanced: '#7B9F8C', bitter: '#8A6D3B' };

/**
 * The beans tab: the bag in the hopper, what's left, the recipe, the open
 * thread (the next change, carried until a shot is logged) and every shot.
 * Dialing in until a recipe is saved; everyday after that.
 */
export function BeansTab() {
  const router = useRouter();
  const { data, error, reload } = useBeans();
  const [armed, setArmed] = useState<number | null>(null);

  if (!data) {
    return (
      <div style={{ padding: '20px' }}>
        <p style={mono({ color: P.bg, opacity: 0.6 })}>{error ? 'couldn’t load the beans' : 'loading the beans…'}</p>
        {error && <div style={{ marginTop: '12px' }}><Btn line onClick={reload}>try again</Btn></div>}
      </div>
    );
  }

  const { hopper: bag, shots, bags, keyShots } = data;

  if (!bag) {
    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ padding: '44px 20px', textAlign: 'center', border: `1px dashed ${P.bg}33`, borderRadius: '14px' }}>
          <p style={{ fontFamily: SERIF, fontSize: '22px', fontWeight: 300, margin: 0, color: P.bg }}>no bag in the hopper.</p>
          <p style={{ fontSize: '13px', opacity: 0.6, margin: '8px 0 0', fontStyle: 'italic', color: P.bg }}>add the one you&apos;re pulling from, then every shot lands on it</p>
        </div>
        <Btn onClick={() => router.push('/barista/bean')}>add the bag</Btn>
      </div>
    );
  }

  const recipe = recipeOf(shots);
  const day = dayOff(bag);
  const left = gramsLeft(bag, shots);
  const doubles = doublesLeft(bag, shots);
  const next = parseNext(bag.next_step);
  const notes = beforeYouPull(bag, shots);
  const handCount = shots.filter((s) => s.order_id == null).length;
  const past = recipe ? [] : pastRecipes(bag.name, bags, keyShots, bag.id).slice(0, 2);
  const roasted = bag.roast_date
    ? new Date(`${bag.roast_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const remove = async (s: Shot) => {
    if (armed !== s.id) {
      setArmed(s.id);
      setTimeout(() => setArmed((a) => (a === s.id ? null : a)), 2500);
      return;
    }
    setArmed(null);
    await fetch(`/api/shots?id=${s.id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', color: P.bg }}>
      {notes.length > 0 && (
        <Note tone="note">
          <b style={{ display: 'block', color: P.bg, marginBottom: '2px' }}>{notes[0]}</b>
          {notes.slice(1).join(' ')}
        </Note>
      )}

      <Card>
        <button onClick={() => router.push(`/barista/bean?id=${bag.id}`)} style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}>
          <Label right={<Pill tone={recipe ? 'sage' : 'brass'}>{recipe ? 'recipe saved' : `dialing in · ${handCount} shot${handCount === 1 ? '' : 's'}`}</Pill>}>in the hopper</Label>
          <div style={{ fontFamily: SERIF, fontWeight: 300, fontSize: '26px', letterSpacing: '-0.02em', lineHeight: 1.05 }}>{bag.name.toLowerCase()}</div>
          <div style={{ color: `${P.bg}99`, marginTop: '4px', fontSize: '13px' }}>
            {[bag.roaster, roasted ? `roasted ${roasted}` : null, day != null ? `day ${day}` : null, `${bag.bag_grams}g`].filter(Boolean).join(' · ')}
            {!bag.roast_date && <span style={{ color: P.accent }}> · add the roast date</span>}
          </div>
        </button>
        <div style={{ height: '8px', borderRadius: '4px', background: `${P.bg}14`, overflow: 'hidden', marginTop: '10px' }}>
          <i style={{ display: 'block', height: '100%', width: `${Math.min(100, (left / bag.bag_grams) * 100)}%`, background: P.brass }} />
        </div>
        <div style={{ color: `${P.bg}99`, marginTop: '4px', fontSize: '13px' }}>
          {left > 0 ? `about ${doubles} double${doubles === 1 ? '' : 's'} left · ${left}g` : 'the bag should be empty'}
        </div>
      </Card>

      {recipe && (
        <Card>
          <Label>this bag&apos;s recipe{dayOff(bag, recipe.pulled_at) != null ? ` · day ${dayOff(bag, recipe.pulled_at)}` : ''}</Label>
          <RecipeTiles grind={recipe.grind} dose={recipe.dose_g} yieldG={recipe.yield_g} seconds={recipe.seconds} />
        </Card>
      )}

      {next && (
        <Card>
          <Label>next shot · carried over</Label>
          <RecipeTiles grind={next.grind} dose={next.dose} yieldG={next.yield} seconds={null} />
          <div style={{ color: `${P.bg}99`, marginTop: '8px', fontSize: '13px' }}>{next.text}</div>
        </Card>
      )}

      {past.length > 0 && (
        <Note tone="note">
          <b style={{ display: 'block', color: P.bg, marginBottom: '2px' }}>Earlier bags of {bag.name}</b>
          {past.map(pastRecipeLine).join('. ')}.
        </Note>
      )}

      {shots.length > 0 && (
        <Card>
          <Label>{recipe ? 'last shots' : 'shots on this bag'}</Label>
          {shots.slice(0, 10).map((s, i) => {
            const d = dayOff(bag, s.pulled_at);
            const delta = recipe && s.seconds != null && recipe.seconds != null && s.id !== recipe.id ? s.seconds - recipe.seconds : null;
            const right = s.taste
              ? <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6, background: TASTE_DOT[s.taste] }} />{s.taste}</span>
              : delta != null && Math.abs(delta) > 3
                ? <span style={{ color: P.accent }}>{delta > 0 ? '+' : '−'}{Math.abs(delta)}s</span>
                : <span style={{ opacity: 0.5 }}>{s.order_id ? 'order' : 'not tasted'}</span>;
            return (
              <button
                key={s.id}
                onClick={() => remove(s)}
                style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: '10px', alignItems: 'center', padding: '10px 0', minHeight: '44px', borderBottom: i < Math.min(shots.length, 10) - 1 ? `1px solid ${P.bg}12` : 'none', fontSize: '13px', fontVariantNumeric: 'tabular-nums', cursor: 'pointer' }}
              >
                <span style={mono({ color: `${P.bg}88`, letterSpacing: '0.08em' })}>{d != null ? `day ${d}` : `shot ${shots.length - i}`}</span>
                <span>
                  {armed === s.id ? <b style={{ color: P.accent }}>tap again to remove</b> : (
                    <>{fmtGrind(s.grind)} · {fmtG(s.dose_g)} → {fmtG(s.yield_g)}{s.seconds != null ? ` · ${s.seconds}s` : ''}{s.is_recipe ? ' · recipe' : ''}</>
                  )}
                </span>
                {right}
              </button>
            );
          })}
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Btn line onClick={() => router.push('/barista/bean')}>new bag</Btn>
        <Btn onClick={() => router.push('/barista/shot')}>log a shot</Btn>
      </div>
    </div>
  );
}
