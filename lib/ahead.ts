// Order ahead: she orders the night before and says when she wants it;
// this works backwards to when the machine goes on and when he starts.
// Pure: no server imports, so the customer screens, the hub and the
// every-minute job all share the same sums.
//
//   want    when she wants it ready
//   − make  = start by     (shot only, or longer with steamed milk)
//   − warm  = machine on by
//   − 5     = be up by     (only shown when earlier than his usual)
//
// A late "it's on" pushes the start, and so the ready time, back.

import { MILK_DRINKS } from './menu';

export const MORNINGS_KV = 'daizu_mornings';
export const HOME_TZ = 'America/Los_Angeles';
export const BARISTA_NAME = 'Nathan';
/** Minutes from waking to having the machine on. */
export const GET_UP_MIN = 5;
/** Before this hour "the morning" still means today. */
const NIGHT_ENDS_HOUR = 4;

export type Mornings = {
  on: boolean;         // take orders for the morning at all
  upWeekday: string;   // "06:30": when he is usually up
  upWeekend: string;
  warmup: number;      // minutes, switch on to first shot
  shot: number;        // minutes to make a drink with no steamed milk
  milk: number;        // minutes to make one with steamed milk
};
export const MORNINGS_DEFAULT: Mornings = { on: true, upWeekday: '06:30', upWeekend: '07:30', warmup: 22, shot: 4, milk: 8 };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const mins = (v: unknown, d: number) => (typeof v === 'number' && v >= 0 && v <= 120 ? Math.round(v) : d);
export function cleanMornings(v: unknown): Mornings {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const d = MORNINGS_DEFAULT;
  return {
    on: typeof o.on === 'boolean' ? o.on : d.on,
    upWeekday: typeof o.upWeekday === 'string' && HHMM.test(o.upWeekday) ? o.upWeekday : d.upWeekday,
    upWeekend: typeof o.upWeekend === 'string' && HHMM.test(o.upWeekend) ? o.upWeekend : d.upWeekend,
    warmup: mins(o.warmup, d.warmup),
    shot: mins(o.shot, d.shot),
    milk: mins(o.milk, d.milk),
  };
}

const MIN = 60_000;

// ── Home time (Vercel runs in UTC; the cafe is in San Diego) ─────────────
function homeParts(at: number) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: HOME_TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
  }).formatToParts(new Date(at));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return { ymd: `${g('year')}-${g('month')}-${g('day')}`, hour: +g('hour'), minute: +g('minute'), weekday: g('weekday') };
}
/** The instant that reads `hhmm` on `ymd` at home. */
export function homeTime(ymd: string, hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const want = Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10), h, m);
  let guess = want;
  for (let i = 0; i < 2; i++) {
    const p = homeParts(guess);
    const shown = Date.UTC(+p.ymd.slice(0, 4), +p.ymd.slice(5, 7) - 1, +p.ymd.slice(8, 10), p.hour, p.minute);
    guess += want - shown;
  }
  return guess;
}
/** "7:30" */
export function fmtClock(at: number | string): string {
  const p = homeParts(typeof at === 'string' ? Date.parse(at) : at);
  return `${p.hour % 12 || 12}:${String(p.minute).padStart(2, '0')}`;
}
/** "Mon" */
export const fmtWeekday = (at: number | string) => homeParts(typeof at === 'string' ? Date.parse(at) : at).weekday;
/** "07:30" for a time input */
export function hhmmOf(at: number | string): string {
  const p = homeParts(typeof at === 'string' ? Date.parse(at) : at);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

// ── The morning she is ordering for ──────────────────────────────────────
export type Morning = { ymd: string; weekday: string; long: string; weekend: boolean };
export function nextMorning(now = Date.now()): Morning {
  const p = homeParts(now);
  // Noon keeps the date sums clear of daylight-saving edges
  const noon = homeTime(p.ymd, '12:00') + (p.hour < NIGHT_ENDS_HOUR ? 0 : 24 * 60 * MIN);
  const t = homeParts(noon);
  const long = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TZ, weekday: 'long' }).format(new Date(noon));
  return { ymd: t.ymd, weekday: t.weekday, long, weekend: t.weekday === 'Sat' || t.weekday === 'Sun' };
}

export function makeMin(o: { drink: string; temp?: string | null }, m: Mornings): number {
  return MILK_DRINKS.includes(o.drink) && o.temp !== 'iced' ? m.milk : m.shot;
}
const isWeekend = (at: number) => ['Sat', 'Sun'].includes(homeParts(at).weekday);
/** When he is usually up on the day of `at`. */
export function usualUp(at: number, m: Mornings): number {
  return homeTime(homeParts(at).ymd, isWeekend(at) ? m.upWeekend : m.upWeekday);
}
/** The earliest ready time that doesn't get him up early. */
export function earliestWant(morning: Morning, o: { drink: string; temp?: string | null }, m: Mornings): number {
  return homeTime(morning.ymd, morning.weekend ? m.upWeekend : m.upWeekday) + (m.warmup + makeMin(o, m)) * MIN;
}
/** Half-hour choices around the earliest: one early one, then four on time. */
export function slots(morning: Morning, o: { drink: string; temp?: string | null }, m: Mornings): { at: number; early: boolean }[] {
  const first = earliestWant(morning, o, m);
  const half = 30 * MIN;
  const start = Math.ceil(first / half) * half;
  return [-1, 0, 1, 2, 3].map((i) => ({ at: start + i * half, early: start + i * half < first }));
}

// ── The plan for one order ───────────────────────────────────────────────
export type AheadOrder = { want_at?: string | null; on_at?: string | null; drink: string; temp?: string | null };
export type Plan = {
  want: number;
  startBy: number;   // start the drink by, to be on time
  onBy: number;      // machine on by
  upBy: number;      // be up by
  early: boolean;    // upBy is before his usual
  start: number;     // when to start, given when the machine really went on
  ready: number;     // when it will really be ready
  late: number;      // minutes behind what she asked for (0 when on time)
};
export function plan(o: AheadOrder, m: Mornings): Plan | null {
  if (!o.want_at) return null;
  const want = Date.parse(o.want_at);
  if (!Number.isFinite(want)) return null;
  const make = makeMin(o, m) * MIN;
  const startBy = want - make;
  const onBy = startBy - m.warmup * MIN;
  const upBy = onBy - GET_UP_MIN * MIN;
  const on = o.on_at ? Date.parse(o.on_at) : null;
  const start = on != null ? Math.max(startBy, on + m.warmup * MIN) : startBy;
  const ready = start + make;
  return { want, startBy, onBy, upBy, early: upBy < usualUp(want, m), start, ready, late: Math.max(0, Math.round((ready - want) / MIN)) };
}

// ── What the every-minute job should do for a waiting order ──────────────
export type Due = 'seen2' | 'on' | 'on2' | 'start';
export function due(
  o: AheadOrder & { created_at: string; seen_at?: string | null; ahead_sent?: string[] | null },
  m: Mornings,
  now = Date.now()
): Due[] {
  const p = plan(o, m);
  if (!p) return [];
  const sent = new Set(o.ahead_sent ?? []);
  // Time to make it: it joins the queue, and nothing else matters
  if (now >= p.start) return ['start'];
  const out: Due[] = [];
  // Not answered half an hour after she asked: ask once more, unless it's morning already
  if (!o.seen_at && !sent.has('seen2') && now >= Date.parse(o.created_at) + 30 * MIN && now < p.onBy) out.push('seen2');
  if (!o.on_at && now >= p.onBy) {
    if (!sent.has('on')) out.push('on');
    else if (!sent.has('on2') && now >= p.onBy + 5 * MIN) out.push('on2');
  }
  return out;
}

/** What her screen says under the steps. */
export function herLine(o: AheadOrder & { seen_at?: string | null }, m: Mornings, now = Date.now()): { text: string; strong?: string } {
  const p = plan(o, m);
  if (!p) return { text: '' };
  if (o.on_at) return p.late > 0
    ? { text: 'The machine went on a little late.', strong: `About ${Math.ceil(p.late / 5) * 5} minutes behind.` }
    : { text: 'The machine is warming.', strong: 'On time.' };
  if (now >= p.onBy + 15 * MIN) return { text: `${BARISTA_NAME} hasn’t turned the machine on yet.`, strong: 'It will be late.' };
  if (o.seen_at) return { text: `${BARISTA_NAME}’s got it.` };
  return { text: `Waiting for ${BARISTA_NAME} to see it.` };
}

// On her phone: the order waiting for the morning (so the menu can lead
// back to it) and the time she picked last.
export const AHEAD_ORDER_KEY = 'daizu-ahead-order';
export const AHEAD_TIME_KEY = 'daizu-ahead-time';
