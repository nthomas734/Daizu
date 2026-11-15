'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Bean, Shot } from '@/lib/beans';
import type { RoosRecord } from '@/lib/supply';

export type BeansData = { hopper: Bean | null; shots: Shot[]; bags: Bean[]; keyShots: Shot[]; roos: RoosRecord | null };

/** Everything the beans screens read, from one GET /api/beans. */
export function useBeans() {
  const [data, setData] = useState<BeansData | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/beans', { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setData({ hopper: d.hopper ?? null, shots: d.shots ?? [], bags: d.bags ?? [], keyShots: d.keyShots ?? [], roos: d.roos ?? null });
      setError(false);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, error, reload: load };
}
