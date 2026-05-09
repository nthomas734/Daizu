import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('daizu_favorites')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'database_error' }, { status: 500 });
  return NextResponse.json({ favorites: data });
}
