import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SYRUPS } from '@/lib/menu';

// GET — when each syrup batch was made: { batches: { [syrupId]: 'YYYY-MM-DD' } }
export async function GET() {
  const { data, error } = await supabaseAdmin().from('daizu_syrup_batches').select('*');
  if (error) return NextResponse.json({ error: 'database_error' }, { status: 500 });
  const batches: Record<string, string> = {};
  for (const row of data || []) batches[row.syrup_id] = row.made_on;
  return NextResponse.json({ batches });
}

// POST — log a fresh batch. body: { syrupId, madeOn: 'YYYY-MM-DD' }
// The client sends its own calendar day so "today" is San Diego's, not UTC's.
export async function POST(req: NextRequest) {
  const { syrupId, madeOn } = await req.json();
  if (!SYRUPS.some((s) => s.id === syrupId) || !/^\d{4}-\d{2}-\d{2}$/.test(madeOn || '')) {
    return NextResponse.json({ error: 'invalid_batch' }, { status: 400 });
  }
  const { error } = await supabaseAdmin()
    .from('daizu_syrup_batches')
    .upsert({ syrup_id: syrupId, made_on: madeOn, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
