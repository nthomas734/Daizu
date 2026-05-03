'use client';

import { useEffect, useState } from 'react';

// Use matchMedia which is more reliable than reading innerWidth directly,
// since iOS Safari sometimes reports wonky viewport sizes during page load.
// We treat as "tablet" only if BOTH dimensions are tablet-class.
export type Viewport = 'phone' | 'tablet';

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>('phone');

  useEffect(() => {
    // Tablet only if min-width AND min-height both exceed phone-class.
    // This rules out phones in any orientation while still capturing tablets.
    const mq = window.matchMedia('(min-width: 700px) and (min-height: 700px)');

    const update = () => setViewport(mq.matches ? 'tablet' : 'phone');
    update();

    // Modern browsers use addEventListener, older Safari uses addListener
    if (mq.addEventListener) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    } else {
      mq.addListener(update);
      return () => mq.removeListener(update);
    }
  }, []);

  return viewport;
}
