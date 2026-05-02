'use client';

import { useEffect, useState } from 'react';

// Phone: ≤768px in BOTH dimensions. Tablet: any dimension >768px.
// This way a tablet in portrait still gets the tablet layout.
export type Viewport = 'phone' | 'tablet';

const BREAKPOINT = 768;

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>('phone');

  useEffect(() => {
    const update = () => {
      const longSide = Math.max(window.innerWidth, window.innerHeight);
      setViewport(longSide > BREAKPOINT ? 'tablet' : 'phone');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return viewport;
}
