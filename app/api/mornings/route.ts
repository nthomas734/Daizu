import { NextRequest, NextResponse } from 'next/server';
import { readMornings, saveMornings } from '@/lib/ahead-server';

export const runtime = 'nodejs';

// His morning settings for order ahead (home_kv 'daizu_mornings'): when
// he's up, how long the machine warms, how long a drink takes. Both sides
// read it; the hub's more tab writes it.
export async function GET() {
  return NextResponse.json({ mornings: await readMornings() });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ mornings: await saveMornings(await req.json().catch(() => ({}))) });
}
