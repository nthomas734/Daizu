// The next bag from RoosRoast. Pure: no imports from the server.
//
// Home (repo `home`) reads his RoosRoast emails and saves them to the shared
// home_kv row `roos_coffee` (shape below). daizu only reads it. When that row
// is missing or stale, the subscription cadence below stands in: every two
// weeks, the next one on Nov 23 2026. RoosRoast ships the day the order goes
// in (Michigan time), so the ship day is the roast day near enough. Delivery
// has taken 4 to 8 days; once three bags have both dates, his own range wins.

import { beanKey, homeDate, type Bean } from './beans';

export const ROOS_KV = 'roos_coffee';
export const ROOS_ANNOUNCED_KV = 'daizu_roos_announced';
export const ROOS_CADENCE = { anchor: '2026-11-23', everyDays: 14, shipDays: [4, 8] as [number, number] };
/** A delivery older than this is history, not news. */
const FRESH_DAYS = 21;

export type RoosOrder = {
  number: string;
  item: string | null;
  size: string | null;
  confirmedAt: string | null;
  shippedAt: string | null;
  outAt: string | null;
  deliveredAt: string | null;
  estimate: string | null;
};
export type RoosRecord = { checkedAt: string; scheduled: string[]; orders: RoosOrder[] };

export type Stage = 'scheduled' | 'ordered' | 'shipped' | 'out' | 'delivered';
export type NextBag = {
  stage: Stage;
  shipOn: string;            // YYYY-MM-DD, Michigan date
  arriveFrom: string;        // YYYY-MM-DD, San Diego dates
  arriveTo: string;
  deliveredOn: string | null;
  item: string | null;       // "Lobster Butter Love"
  grams: number | null;
  orderNumber: string | null;
  fromEmail: boolean;
};

const DAY = 86_400_000;
const num = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) / DAY;
const ymd = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => ymd(num(d) + n);
export const daysFrom = (a: string, b: string) => Math.round(num(b) - num(a));

/** YYYY-MM-DD in Michigan, where RoosRoast ships from. */
function roosDate(at: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Detroit', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(at));
}

export function gramsFromSize(size: string | null): number | null {
  if (!size) return null;
  const s = size.toLowerCase();
  if (/full pound|16\s*oz|1\s*lb\b/.test(s)) return 454;
  if (/half pound|8\s*oz/.test(s)) return 227;
  if (/12\s*oz/.test(s)) return 340;
  if (/5\s*lb/.test(s)) return 2268;
  return null;
}

/** His delivery range from bags with both dates, once there are three. */
export function shipRange(orders: RoosOrder[]): [number, number] {
  const days = orders
    .filter((o) => o.deliveredAt && (o.shippedAt || o.confirmedAt))
    .map((o) => daysFrom(roosDate((o.shippedAt ?? o.confirmedAt)!), homeDate(o.deliveredAt!)))
    .filter((d) => d >= 1 && d <= 21);
  if (days.length < 3) return ROOS_CADENCE.shipDays;
  return [Math.min(...days), Math.max(...days)];
}

/**
 * Where the next bag stands. `hopper` decides whether a delivered bag is
 * still waiting: once a bag was opened on or after the delivery day, that
 * delivery is done and the next scheduled one shows.
 */
export function nextBag(rec: RoosRecord | null, hopper: Pick<Bean, 'opened_on'> | null, today = homeDate()): NextBag {
  const orders = rec?.orders ?? [];
  const [lo, hi] = shipRange(orders);
  const o = orders[0];
  const base = (o: RoosOrder) => ({
    item: o.item,
    grams: gramsFromSize(o.size),
    orderNumber: o.number,
    fromEmail: true,
  });

  if (o) {
    const shipAt = o.shippedAt ?? o.confirmedAt;
    const shipOn = shipAt ? roosDate(shipAt) : null;
    if (o.deliveredAt) {
      const deliveredOn = homeDate(o.deliveredAt);
      const opened = hopper?.opened_on ?? null;
      if (daysFrom(deliveredOn, today) <= FRESH_DAYS && (!opened || opened < deliveredOn)) {
        return { stage: 'delivered', shipOn: shipOn ?? deliveredOn, arriveFrom: deliveredOn, arriveTo: deliveredOn, deliveredOn, ...base(o) };
      }
    } else if (shipOn && daysFrom(shipOn, today) <= FRESH_DAYS) {
      if (o.outAt) {
        const d = homeDate(o.outAt);
        return { stage: 'out', shipOn, arriveFrom: d, arriveTo: d, deliveredOn: null, ...base(o) };
      }
      const from = addDays(shipOn, lo);
      return {
        stage: o.shippedAt ? 'shipped' : 'ordered',
        shipOn,
        arriveFrom: from < today ? today : from,
        arriveTo: addDays(shipOn, hi) < today ? today : addDays(shipOn, hi),
        deliveredOn: null,
        ...base(o),
      };
    }
  }

  // Nothing on the way: the next date on the schedule. A "get ready" email
  // names it; otherwise every two weeks from the last order (skips included),
  // or from the anchor before any email has been seen.
  const fromEmail = (rec?.scheduled ?? []).filter((d) => d >= today).sort()[0];
  let shipOn = fromEmail;
  if (!shipOn) {
    const lastShip = o && (o.shippedAt ?? o.confirmedAt) ? roosDate((o.shippedAt ?? o.confirmedAt)!) : ROOS_CADENCE.anchor;
    const start = lastShip > ROOS_CADENCE.anchor ? lastShip : ROOS_CADENCE.anchor;
    shipOn = start;
    while (shipOn < today) shipOn = addDays(shipOn, ROOS_CADENCE.everyDays);
  }
  return {
    stage: 'scheduled',
    shipOn,
    arriveFrom: addDays(shipOn, lo),
    arriveTo: addDays(shipOn, hi),
    deliveredOn: null,
    item: o?.item ?? null,
    grams: o ? gramsFromSize(o.size) : null,
    orderNumber: null,
    fromEmail: Boolean(fromEmail),
  };
}

/** "Lobster Butter Love" → "Lobster Butter" when an earlier bag went by the shorter name. */
export function bagName(item: string | null, bags: Pick<Bean, 'name'>[]): string {
  if (!item) return '';
  const key = beanKey(item);
  const hit = bags
    .map((b) => b.name)
    .filter((n) => beanKey(n) && key.startsWith(beanKey(n)))
    .sort((a, b) => beanKey(b).length - beanKey(a).length)[0];
  if (!hit) return item;
  // Prefer the plain version of the name (no emoji) for the new bag
  return hit.replace(/[^\p{L}\p{N}\s'&-]+/gu, '').replace(/\s+/g, ' ').trim();
}

/**
 * When the hopper runs out at his pace on this bag: doubles pulled per day
 * since it was opened. Null until there are 3 days and 4 shots to go on.
 */
export function runsOutOn(opts: { openedOn: string | null; shotsOnBag: number; doublesLeft: number; today?: string }): string | null {
  const today = opts.today ?? homeDate();
  if (!opts.openedOn) return null;
  const days = daysFrom(opts.openedOn, today);
  if (days < 3 || opts.shotsOnBag < 4) return null;
  const perDay = opts.shotsOnBag / days;
  return addDays(today, Math.floor(opts.doublesLeft / perDay));
}

export function fmtDay(d: string, weekday = false): string {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    ...(weekday ? { weekday: 'short' } : {}),
    month: 'short',
    day: 'numeric',
  });
}

/** "Nov 27–Dec 1", "Nov 27–30", or one day. */
export function fmtWindow(a: string, b: string): string {
  if (a === b) return fmtDay(a);
  const [ma, mb] = [fmtDay(a).split(' ')[0], fmtDay(b).split(' ')[0]];
  return ma === mb ? `${fmtDay(a)}–${fmtDay(b).split(' ')[1]}` : `${fmtDay(a)}–${fmtDay(b)}`;
}

/** One sentence for a push: where the next bag is. */
export function nextBagLine(nb: NextBag, today = homeDate()): string {
  switch (nb.stage) {
    case 'delivered': return `A new bag was delivered ${nb.deliveredOn === today ? 'today' : fmtDay(nb.deliveredOn!)}.`;
    case 'out': return 'The next bag is out for delivery today.';
    case 'ordered': return `The next bag was ordered ${fmtDay(nb.shipOn)} and lands around ${fmtWindow(nb.arriveFrom, nb.arriveTo)}.`;
    case 'shipped': return `The next bag shipped ${fmtDay(nb.shipOn)} and lands around ${fmtWindow(nb.arriveFrom, nb.arriveTo)}.`;
    default: return `Next bag ships ${fmtDay(nb.shipOn)} and lands around ${fmtWindow(nb.arriveFrom, nb.arriveTo)}.`;
  }
}
