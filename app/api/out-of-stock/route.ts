import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('daizu_out_of_stock').select('*');
  if (error) return NextResponse.json({ error: 'database_error' }, { status: 500 });
  // Reshape into { drinks: [...], milks: [...], syrups: [...] }
  const out = { drinks: [] as string[], milks: [] as string[], syrups: [] as string[] };
  for (const row of data || []) {
    if (row.category in out) {
      (out as any)[row.category].push(row.item_id);
    }
  }
  return NextResponse.json({ outOfStock: out });
}

// Toggle a single item — body: { category: 'drinks'|'milks'|'syrups', itemId: string }
export async function POST(req: NextRequest) {
  const { category, itemId } = await req.json();
  if (!['drinks', 'milks', 'syrups'].includes(category)) {
    return NextResponse.json({ error: 'invalid_category' }, { status: 400 });
  }
  const sb = supabaseAdmin();

  // Try to delete first; if nothing was deleted, insert (toggle behavior)
  const { data: existing } = await sb
    .from('daizu_out_of_stock')
    .select('id')
    .eq('category', category)
    .eq('item_id', itemId)
    .maybeSingle();

  if (existing) {
    await sb.from('daizu_out_of_stock').delete().eq('id', existing.id);
    return NextResponse.json({ active: false });
  } else {
    await sb.from('daizu_out_of_stock').insert({ category, item_id: itemId });
    return NextResponse.json({ active: true });
  }
}
