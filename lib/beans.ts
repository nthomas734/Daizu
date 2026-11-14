// Beans: the bag in the hopper, every shot pulled from it, and the next
// single change. Pure functions only, shared by the beans tab, the shot log,
// the order page and the API routes, so the advice is the same everywhere
// and works without a network.
//
// The method is Nathan's, from his own espresso notes:
//   - Taste decides. Time is evidence, never a target. A shot he called
//     balanced is kept, whatever the time.
//   - One variable at a time. Grind first, in quarter steps on the Niche
//     (lower number = finer).
//   - Every piece of advice gives its reason.
//   - It never diagnoses channeling. It can't see the puck.
//   - Dose is what lands in the basket. Brew temperature is fixed at 95°C.
//   - Everyday shots can't be re-pulled, so their advice is for the next shot.

export type Taste = 'sour' | 'balanced' | 'bitter';
export type Body = 'thin' | 'right' | 'heavy';

export type Bean = {
  id: number;
  name: string;
  roaster: string | null;
  roast_date: string | null; // YYYY-MM-DD
  bag_grams: number;
  note: string | null;
  in_hopper: boolean;
  opened_on: string | null;
  finished_on: string | null;
  next_step: string | null; // JSON NextStep
  created_at: string;
};

export type Shot = {
  id: number;
  bean_id: number;
  order_id: number | null;
  pulled_at: string;
  grind: number | null;
  dose_g: number;
  beans_in_g: number | null;
  yield_g: number | null;
  seconds: number | null;
  pressure_seconds: number | null;
  after_eco: boolean;
  taste: Taste | null;
  body: Body | null;
  is_recipe: boolean;
  note: string | null;
};

/** What the next shot should be: the open thread on the beans tab. */
export type NextStep = { text: string; grind?: number; dose?: number; yield?: number };

export type Advice = {
  text: string;
  /** carried to the next shot; null clears the thread */
  next: NextStep | null;
  /** balanced shot: offer "save as recipe" */
  offerRecipe?: boolean;
};

export type ShotInput = Pick<
  Shot,
  'grind' | 'dose_g' | 'yield_g' | 'seconds' | 'pressure_seconds' | 'after_eco' | 'taste'
>;

export const DEFAULT_RANGE: [number, number] = [24, 32];
export const SLOW_PRESSURE_S = 12;
export const LOW_DOUBLES = 4;
const DAY = 86_400_000;

// ── formatting ───────────────────────────────────────────────────────────────

/** 12 → "12.0", 12.25 → "12.25", 15.15 → "15.15" */
export function fmtGrind(g: number | null | undefined): string {
  if (g == null) return '–';
  const s = (Math.round(g * 100) / 100).toFixed(2);
  return s.endsWith('0') ? s.slice(0, -1) : s;
}

/** 18 → "18", 17.2 → "17.2" */
export function fmtG(g: number | null | undefined): string {
  if (g == null) return '–';
  return String(Math.round(g * 10) / 10);
}

export const roundQuarter = (g: number) => Math.round(g * 4) / 4;

export function parseNext(raw: string | null | undefined): NextStep | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v.text === 'string' ? v : null;
  } catch {
    return { text: raw };
  }
}

// ── dates ────────────────────────────────────────────────────────────────────

/** YYYY-MM-DD of a moment in San Diego */
export function homeDate(at: Date | string = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(typeof at === 'string' ? new Date(at) : at);
}

const dayNum = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) / DAY;

/** Days off roast on a given moment, or null without a roast date. */
export function dayOff(bean: Pick<Bean, 'roast_date'>, at: Date | string = new Date()): number | null {
  if (!bean.roast_date) return null;
  return Math.round(dayNum(homeDate(at)) - dayNum(bean.roast_date));
}

export function daysBetween(a: string, b: Date | string = new Date()): number {
  return Math.round(dayNum(homeDate(b)) - dayNum(homeDate(a)));
}

// ── the bag ──────────────────────────────────────────────────────────────────

/**
 * His usual loss on the Niche (beans in minus basket), once at least three
 * shots have both weighed. Null until then.
 */
export function usualLoss(shots: Shot[]): number | null {
  const both = shots.filter((s) => s.beans_in_g != null && s.dose_g != null);
  if (both.length < 3) return null;
  const avg = both.reduce((a, s) => a + (s.beans_in_g! - s.dose_g), 0) / both.length;
  return Math.max(0, Math.round(avg * 10) / 10);
}

export function beansUsed(shot: Shot, loss: number | null): number {
  return shot.beans_in_g ?? shot.dose_g + (loss ?? 0);
}

export function gramsLeft(bean: Bean, shots: Shot[]): number {
  const loss = usualLoss(shots);
  const used = shots.reduce((a, s) => a + beansUsed(s, loss), 0);
  return Math.max(0, Math.round(bean.bag_grams - used));
}

/** Doubles left at the recipe's (or the last shot's) dose. */
export function doublesLeft(bean: Bean, shots: Shot[]): number {
  const loss = usualLoss(shots) ?? 0;
  const per = (recipeOf(shots)?.dose_g ?? shots[0]?.dose_g ?? 18) + loss;
  return Math.floor(gramsLeft(bean, shots) / per);
}

/** The bag's recipe: the latest shot saved as one. Shots newest first. */
export function recipeOf(shots: Shot[]): Shot | null {
  return shots.find((s) => s.is_recipe) ?? null;
}

/**
 * His usual time range on this bean, from his own balanced shots across
 * every bag of it, once there are two. Until then 24 to 32 seconds.
 */
export function usualRange(keyShots: Shot[]): [number, number] {
  const secs = keyShots.filter((s) => s.taste === 'balanced' && s.seconds != null).map((s) => s.seconds!);
  if (secs.length < 2) return DEFAULT_RANGE;
  return [Math.min(...secs) - 2, Math.max(...secs) + 2];
}

const pace = (seconds: number | null, [lo, hi]: [number, number]) =>
  seconds == null ? 'normal' : seconds < lo ? 'fast' : seconds > hi ? 'slow' : 'normal';

const keep = (s: ShotInput) => `Keep ${fmtG(s.dose_g)}g${s.yield_g != null ? ` and ${fmtG(s.yield_g)}g` : ''}.`;

const same = (s: ShotInput, text: string): NextStep => ({
  text,
  grind: s.grind ?? undefined,
  dose: s.dose_g,
  yield: s.yield_g ?? undefined,
});

// ── B3: advice while dialing in ──────────────────────────────────────────────

/**
 * One sentence after a tasted (or not tasted) shot. `prev` is the earlier
 * shots on this bag, newest first, logged by hand (not from orders).
 */
export function adviseDialIn(s: ShotInput, prev: Shot[], range: [number, number]): Advice {
  const g = s.grind;

  if ((s.pressure_seconds != null && s.pressure_seconds > SLOW_PRESSURE_S) || s.after_eco) {
    const text = "Slow to reach pressure, likely a cold group after eco mode. Don't adjust from this shot. Flush the group and pull it again.";
    return { text, next: same(s, 'Pull the same shot again with a warm group.') };
  }

  if (!s.taste) {
    const inRange = s.seconds != null && s.seconds >= range[0] && s.seconds <= range[1];
    const text = inRange
      ? `Looked right at ${s.seconds}s. Taste the next one before saving it as the recipe.`
      : `Not tasted${s.seconds != null ? `, at ${s.seconds}s` : ''}. Taste the next one before changing anything.`;
    return { text, next: same(s, 'Same shot, and taste it.') };
  }

  if (s.taste === 'balanced') {
    return { text: "Keep it. Save as this bag's recipe?", next: null, offerRecipe: true };
  }

  // Bracketed: the last shot went the other way, half a step to a step apart
  const p = prev[0];
  if (p && g != null && p.grind != null && p.taste && p.taste !== 'balanced' && p.taste !== s.taste) {
    const sourG = s.taste === 'sour' ? g : p.grind;
    const bitterG = s.taste === 'bitter' ? g : p.grind;
    const gap = sourG - bitterG; // sour should be the coarser (higher) number
    if (gap >= 0.49 && gap <= 1.01) {
      const mid = roundQuarter((sourG + bitterG) / 2);
      if (mid !== sourG && mid !== bitterG) {
        const text = `${fmtGrind(sourG)} was sour, ${fmtGrind(bitterG)} was bitter. Try ${fmtGrind(mid)}. ${keep(s)}`;
        return { text, next: { ...same(s, `Try ${fmtGrind(mid)}, ${fmtG(s.dose_g)}g in${s.yield_g != null ? `, ${fmtG(s.yield_g)}g out` : ''}.`), grind: mid } };
      }
    }
  }

  const t = pace(s.seconds, range);

  if ((s.taste === 'sour' && t === 'slow') || (s.taste === 'bitter' && t === 'fast')) {
    const text = "These don't agree, so one shot isn't enough to act on. Pull the same shot again before changing anything.";
    return { text, next: same(s, 'Pull the same shot again.') };
  }

  if (t !== 'normal' && g != null) {
    const finer = s.taste === 'sour'; // fast and sour → finer; slow and bitter → coarser
    // Same advice twice running with no change in the cup: take a half step
    const followed =
      p && p.grind != null && p.taste === s.taste && pace(p.seconds, range) === t &&
      Math.abs((finer ? p.grind - g : g - p.grind) - 0.25) < 0.01;
    const step = followed ? 0.5 : 0.25;
    const to = Math.round((finer ? g - step : g + step) * 100) / 100;
    const why = finer
      ? 'Fast and sour: the water got through before it could pull the sweetness out.'
      : 'Slow and bitter: too much contact time.';
    const move = followed
      ? `Two quarter steps haven't moved it. Go a half step ${finer ? 'finer' : 'coarser'}, to ${fmtGrind(to)}.`
      : `Go 0.25 ${finer ? 'finer' : 'coarser'}, to ${fmtGrind(to)}.`;
    return {
      text: `${why} ${move} ${keep(s)}`,
      next: { ...same(s, `Try ${fmtGrind(to)}, ${fmtG(s.dose_g)}g in${s.yield_g != null ? `, ${fmtG(s.yield_g)}g out` : ''}.`), grind: to },
    };
  }

  // Time in his usual range: keep the grind, move the yield
  const y = s.yield_g ?? 40;
  if (s.taste === 'sour') {
    const to = y + 2;
    return {
      text: `Time looks normal but it is sharp. Keep the grind and pull longer: ${fmtG(to)}g out.`,
      next: { ...same(s, `Same grind, pull to ${fmtG(to)}g out.`), yield: to },
    };
  }
  const to = y - 3;
  return {
    text: `Time looks normal but it is harsh. Keep the grind and stop sooner: ${fmtG(to)}g out.`,
    next: { ...same(s, `Same grind, stop at ${fmtG(to)}g out.`), yield: to },
  };
}

// ── B3b / B5: everyday shots against the recipe ──────────────────────────────

/**
 * An everyday shot (no taste) compared with the bag's recipe. Null when it
 * ran as usual. The advice is always for the next shot: this one is made.
 */
export function adviseEveryday(
  s: ShotInput,
  recipe: Shot,
  opts: { fromOrder?: boolean; inMilk?: boolean; day?: number | null } = {}
): Advice | null {
  if ((s.pressure_seconds != null && s.pressure_seconds > SLOW_PRESSURE_S) || s.after_eco) {
    return {
      text: "Slow to reach pressure, likely a cold group after eco mode. Don't change the grind for this one.",
      next: null,
    };
  }
  if (s.seconds == null || recipe.seconds == null) return null;
  if (s.grind != null && recipe.grind != null && Math.abs(s.grind - recipe.grind) > 0.01) return null;
  const diff = s.seconds - recipe.seconds;
  if (Math.abs(diff) <= 3) return null;
  const finer = diff < 0;
  const base = s.grind ?? recipe.grind;
  const to = base != null ? Math.round((finer ? base - 0.25 : base + 0.25) * 100) / 100 : undefined;
  const dir = finer ? 'finer' : 'coarser';
  const next: NextStep = {
    text: `Next shot: 0.25 ${dir}${to != null ? `, to ${fmtGrind(to)}` : ''}.`,
    grind: to,
    dose: recipe.dose_g,
    yield: recipe.yield_g ?? undefined,
  };
  if (opts.fromOrder) {
    const use = opts.inMilk ? 'This one is going in milk, so use it.' : "This one's made, so use it.";
    return { text: `Ran ${s.seconds}s against ${recipe.seconds}s. ${use} Next shot: 0.25 ${dir}.`, next };
  }
  const day = opts.day != null ? ` Day ${opts.day}.` : '';
  return { text: `${Math.abs(diff)}s ${finer ? 'faster' : 'slower'} than your recipe.${day} Try 0.25 ${dir}.`, next };
}

// ── B3b: before the first shot after a gap ───────────────────────────────────

export const GAP_DAYS = 2;

/**
 * Notes for the top of the beans tab, from his own log only. Each says
 * nothing until the log has grounds. `shots` = this bag, newest first.
 */
export function beforeYouPull(bean: Bean, shots: Shot[], now: Date = new Date()): string[] {
  const out: string[] = [];
  const recipe = recipeOf(shots);
  const last = shots[0];

  if (last) {
    const gap = daysBetween(last.pulled_at, now);
    if (gap > GAP_DAYS) {
      let line = `${gap} days since the last shot.`;
      if (recipe && last.seconds != null && recipe.seconds != null && last.id !== recipe.id) {
        const d = last.seconds - recipe.seconds;
        if (Math.abs(d) > 3) line += ` Last time it ran ${Math.abs(d)}s ${d < 0 ? 'fast' : 'slow'}.`;
      }
      out.push(line);
      out.push(`First shot in ${gap} days: let the group come fully up to temperature and flush it before you pull.`);
    }
  }

  const drift = driftNote(bean, shots, now);
  if (drift) out.push(drift);

  const gapPattern = afterGapPattern(shots);
  if (gapPattern) out.push(gapPattern);

  return out;
}

/**
 * Which way this bag moves with age, from at least four everyday shots at
 * the recipe's grind and dose: the slope of seconds against days. Says
 * nothing if the log doesn't show a clear direction.
 */
export function driftNote(bean: Bean, shots: Shot[], now: Date = new Date()): string | null {
  const recipe = recipeOf(shots);
  if (!recipe || recipe.grind == null || recipe.seconds == null) return null;
  const first = shots[shots.length - 1];
  const x = (s: Shot) => dayOff(bean, s.pulled_at) ?? daysBetween(first.pulled_at, s.pulled_at);
  const pts = shots
    .filter(
      (s) =>
        s.seconds != null && !s.after_eco && !(s.pressure_seconds != null && s.pressure_seconds > SLOW_PRESSURE_S) &&
        s.grind != null && Math.abs(s.grind - recipe.grind!) < 0.01 && Math.abs(s.dose_g - recipe.dose_g) < 0.15
    )
    .map((s) => ({ x: x(s), y: s.seconds! }));
  if (pts.length < 4) return null;
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n;
  const my = pts.reduce((a, p) => a + p.y, 0) / n;
  const sxx = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  const syy = pts.reduce((a, p) => a + (p.y - my) ** 2, 0);
  const sxy = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
  if (sxx === 0 || syy === 0) return null;
  const slope = sxy / sxx; // seconds per day
  const r = sxy / Math.sqrt(sxx * syy);
  const per2 = Math.abs(slope * 2);
  if (Math.abs(r) < 0.6 || per2 < 0.75) return null;
  let line = `On this bag, shots have run about ${Math.max(1, Math.round(per2))}s ${slope < 0 ? 'faster' : 'slower'} every 2 days.`;
  const today = dayOff(bean, now) ?? daysBetween(first.pulled_at, now);
  const predicted = my + slope * (today - mx);
  const off = predicted - recipe.seconds;
  if (Math.abs(off) > 3) {
    const dayLabel = bean.roast_date ? `Day ${today}: try` : 'Try';
    line += ` ${dayLabel} 0.25 ${off < 0 ? 'finer' : 'coarser'} before you pull.`;
  }
  return line;
}

/**
 * Whether the first shot after a few days off behaves differently from the
 * rest (old grounds in the chute, a cool group). Needs three of each.
 */
export function afterGapPattern(shots: Shot[]): string | null {
  const recipe = recipeOf(shots);
  if (!recipe || recipe.seconds == null) return null;
  const chrono = [...shots].reverse();
  const gapDiffs: number[] = [];
  const restDiffs: number[] = [];
  chrono.forEach((s, i) => {
    if (s.seconds == null || s.id === recipe.id) return;
    const d = s.seconds - recipe.seconds!;
    const prev = chrono[i - 1];
    if (prev && daysBetween(prev.pulled_at, s.pulled_at) >= GAP_DAYS) gapDiffs.push(d);
    else if (prev) restDiffs.push(d);
  });
  if (gapDiffs.length < 3 || restDiffs.length < 3) return null;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const delta = avg(gapDiffs) - avg(restDiffs);
  if (Math.abs(delta) < 3) return null;
  return `After a few days off, your first shot has run about ${Math.round(Math.abs(delta))}s ${delta < 0 ? 'faster' : 'slower'} than the rest.`;
}

// ── B5: a bean he's had before ───────────────────────────────────────────────

export type PastRecipe = { bean: Bean; recipe: Shot; day: number | null };

/** What earlier bags of this bean settled on, newest first. */
export function pastRecipes(name: string, bags: Bean[], keyShots: Shot[], exceptBeanId?: number): PastRecipe[] {
  const key = name.trim().toLowerCase();
  if (!key) return [];
  return bags
    .filter((b) => b.name.trim().toLowerCase() === key && b.id !== exceptBeanId)
    .map((bean) => {
      const recipe = keyShots.find((s) => s.bean_id === bean.id && s.is_recipe);
      return recipe ? { bean, recipe, day: dayOff(bean, recipe.pulled_at) } : null;
    })
    .filter((x): x is PastRecipe => x !== null);
}

export function pastRecipeLine(p: PastRecipe): string {
  const when = new Date(p.recipe.pulled_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'America/Los_Angeles' });
  const age = p.day != null ? ` on day ${p.day}` : '';
  return `${fmtGrind(p.recipe.grind)} with ${fmtG(p.recipe.dose_g)}g${p.recipe.seconds != null ? `, ${p.recipe.seconds}s` : ''}${age} (${when})`;
}
