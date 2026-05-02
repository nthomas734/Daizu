'use client';

import { useEffect, useState } from 'react';

// Phone: ≤768px. Tablet: >768px. We treat iPad and desktop browser as 'tablet' too.
export type Viewport = 'phone' | 'tablet';

const BREAKPOINT = 768;

export function useViewport(): Viewport {
  // Default to 'phone' for SSR — matches the conservative case
  const [viewport, setViewport] = useState<Viewport>('phone');

  useEffect(() => {
    const update = () => {
      setViewport(window.innerWidth > BREAKPOINT ? 'tablet' : 'phone');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return viewport;
}
