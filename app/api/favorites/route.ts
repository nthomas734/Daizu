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

/** DELETE ?id= removes one usual (long-press on "the usual?"). */
export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  const { error } = await supabaseAdmin().from('daizu_favorites').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'database_error' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
