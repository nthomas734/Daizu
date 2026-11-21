// Beans, server side: reading the hopper and logging a shot. Only import
// from API routes (Node runtime: it can send the four-doubles push).

import { supabaseAdmin } from '@/lib/supabase';
import { sendToRole } from '@/lib/push-server';
import {
  Advice,
  Bean,
  LOW_DOUBLES,
  Shot,
  adviseDialIn,
  adviseEveryday,
  beanKey,
  dayOff,
  doublesLeft,
  fmtG,
  fmtGrind,
  recipeOf,
  usualRange,
} from '@/lib/beans';
import { ROOS_KV, nextBag, nextBagLine, type RoosRecord } from '@/lib/supply';

const num = (v: unknown) => (v == null || v === '' ? null : Number(v));

// numeric columns can arrive as strings; make every shot plain numbers
export function normShot(r: any): Shot {
  return {
    ...r,
    grind: num(r.grind),
    dose_g: num(r.dose_g) ?? 18,
    beans_in_g: num(r.beans_in_g),
    yield_g: num(r.yield_g),
    seconds: num(r.seconds),
    pressure_seconds: num(r.pressure_seconds),
  };
}

export async function hopper(): Promise<Bean | null> {
  const { data } = await supabaseAdmin().from('daizu_beans').select('*').eq('in_hopper', true).maybeSingle();
  return (data as Bean) ?? null;
}

export async function shotsFor(beanId: number): Promise<Shot[]> {
  const { data } = await supabaseAdmin()
    .from('daizu_shots')
    .select('*')
    .eq('bean_id', beanId)
    .order('pulled_at', { ascending: false })
    .limit(500);
  return (data ?? []).map(normShot);
}

/** Balanced and recipe shots on every bag with this bean's name. */
export async function keyShotsForName(name: string): Promise<Shot[]> {
  const sb = supabaseAdmin();
  const key = beanKey(name);
  const { data: bags } = await sb.from('daizu_beans').select('id, name');
  const ids = (bags ?? []).filter((b) => beanKey(b.name) === key).map((b) => b.id);
  if (ids.length === 0) return [];
  const { data } = await sb
    .from('daizu_shots')
    .select('*')
    .in('bean_id', ids)
    .or('is_recipe.eq.true,taste.eq.balanced')
    .order('pulled_at', { ascending: false });
  return (data ?? []).map(normShot);
}

/** RoosRoast shipping news, saved by Home into home_kv. Null when missing. */
export async function readRoos(): Promise<RoosRecord | null> {
  const { data } = await supabaseAdmin().from('home_kv').select('value').eq('key', ROOS_KV).maybeSingle();
  return (data?.value as RoosRecord | undefined) ?? null;
}

export type ShotRow = Partial<Omit<Shot, 'id'>> & { bean_id: number };

/**
 * Insert a shot, work out the advice, carry it on the bag as the open
 * thread, and push "about 4 doubles left" once when the count crosses 4.
 */
export async function logShot(
  row: ShotRow,
  opts: { fromOrder?: boolean; inMilk?: boolean; sameAsLast?: boolean } = {}
): Promise<{ shot: Shot; advice: Advice | null } | null> {
  const sb = supabaseAdmin();
  const { data: beanRow } = await sb.from('daizu_beans').select('*').eq('id', row.bean_id).maybeSingle();
  if (!beanRow) return null;
  const bean = beanRow as Bean;
  const before = await shotsFor(bean.id);

  const { data: inserted, error } = await sb.from('daizu_shots').insert(row).select().single();
  if (error || !inserted) {
    console.error('shot insert failed:', error);
    return null;
  }
  const shot = normShot(inserted);
  const after = [shot, ...before];

  // A new recipe replaces the old one, so there is only ever one
  if (shot.is_recipe) {
    await sb.from('daizu_shots').update({ is_recipe: false }).eq('bean_id', bean.id).neq('id', shot.id).eq('is_recipe', true);
  }

  // "Pulled one, same as last": a count, not a taste. No advice, and the
  // open next shot carries on untouched.
  const recipe = recipeOf(after);
  let advice: Advice | null;
  if (opts.sameAsLast) {
    advice = null;
  } else if (shot.is_recipe) {
    advice = { text: `Saved as this bag's recipe: ${fmtGrind(shot.grind)}, ${fmtG(shot.dose_g)}g in${shot.yield_g != null ? `, ${fmtG(shot.yield_g)}g out` : ''}${shot.seconds != null ? `, ${shot.seconds}s` : ''}.`, next: null };
  } else if (shot.taste || !recipe) {
    const range = usualRange(await keyShotsForName(bean.name));
    const handLogged = before.filter((s) => s.order_id == null);
    advice = adviseDialIn(shot, handLogged, range);
  } else {
    advice = adviseEveryday(shot, recipe, { ...opts, day: dayOff(bean, shot.pulled_at) });
  }

  // The open thread: set by advice that names a next shot, cleared once a
  // shot is logged without one (it ran as usual, or it was balanced)
  if (!opts.sameAsLast) {
    const next = advice?.next ?? null;
    await sb.from('daizu_beans').update({ next_step: next ? JSON.stringify(next) : null }).eq('id', bean.id);
  }

  const was = doublesLeft(bean, before);
  const now = doublesLeft(bean, after);
  if (was > LOW_DOUBLES && now <= LOW_DOUBLES) {
    await sendToRole('barista', {
      title: '☕ beans',
      body: `About ${now} doubles left of ${bean.name}. ${nextBagLine(nextBag(await readRoos().catch(() => null), bean))}`,
      url: '/barista?tab=beans',
      tag: `daizu-beans-${bean.id}`,
    });
  }

  return { shot, advice };
}
