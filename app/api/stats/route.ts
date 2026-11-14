import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET — all-time numbers for the "more" tab. A drink counts as made once it
// was marked ready; cancelled and still-open orders don't count.
export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from('daizu_orders')
    .select('drink, temp, milk, syrups, notes, status, category, quantity, created_at')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: 'database_error' }, { status: 500 });

  const made = (data ?? []).filter((o) => o.status === 'ready');
  const qty = (o: { quantity: number | null }) => Math.max(1, o.quantity ?? 1);
  const day = (iso: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date(iso));

  const byDrink: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  let hot = 0, iced = 0, cocktails = 0;
  const milks: Record<string, number> = {};
  for (const o of made) {
    byDrink[o.drink] = (byDrink[o.drink] ?? 0) + qty(o);
    byDay[day(o.created_at)] = (byDay[day(o.created_at)] ?? 0) + qty(o);
    if (o.category === 'bar') cocktails += qty(o);
    else if (o.temp === 'iced') iced++;
    else hot++;
    if (o.milk) milks[o.milk] = (milks[o.milk] ?? 0) + 1;
  }
  const top = (r: Record<string, number>) => Object.entries(r).sort((a, b) => b[1] - a[1])[0] ?? null;
  const busiest = top(byDay);
  const fav = top(byDrink);

  return NextResponse.json({
    made: made.reduce((a, o) => a + qty(o), 0),
    firstOrder: data?.[0]?.created_at ?? null,
    busiest: busiest ? { day: busiest[0], drinks: busiest[1] } : null,
    favorite: fav ? { drink: fav[0], count: fav[1] } : null,
    hot, iced, cocktails, milks,
    kisses: made.filter((o) => /kiss|love|♡|heart/i.test(o.notes || '')).length,
  });
}
