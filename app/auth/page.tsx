'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { COLORS } from '@/lib/menu';

// Next 15 requires useSearchParams() to live inside a Suspense boundary.
export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/';
  const palette = COLORS.cafe;
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setSubmitting(true);
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push(next);
    } else {
      setError(true);
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: palette.bg,
        color: palette.cream,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: '320px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        <Logo size={64} color={palette.brass} stroke={5} />
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 300,
              fontSize: '32px',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            daizu
          </h1>
          <p
            style={{
              fontFamily: "'Noto Serif JP', serif",
              color: palette.brass,
              fontSize: '14px',
              margin: '4px 0 0',
            }}
          >
            大豆
          </p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          autoFocus
          style={{
            width: '100%',
            background: 'transparent',
            border: `1px solid ${palette.brass}66`,
            borderRadius: '2px',
            padding: '12px 14px',
            color: palette.cream,
            fontFamily: "'Manrope', sans-serif",
            fontSize: '15px',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <p
            style={{
              color: palette.accent,
              fontFamily: "'Geist Mono', monospace",
              fontSize: '11px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            wrong password
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            background: palette.cream,
            color: palette.bg,
            border: 'none',
            padding: '14px',
            fontFamily: "'Geist Mono', monospace",
            fontSize: '12px',
            letterSpacing: '0.25em',
            fontWeight: 600,
            textTransform: 'uppercase',
            borderRadius: '2px',
            cursor: submitting ? 'wait' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? '...' : 'enter'}
        </button>
      </form>
    </div>
  );
}
