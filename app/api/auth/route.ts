import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, AUTH_COOKIE_VALUE, AUTH_COOKIE_MAX_AGE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password !== process.env.DAIZU_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'wrong_password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, AUTH_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
  return res;
}
