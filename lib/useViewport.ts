'use client';

import { useEffect, useState } from 'react';

// Tablet = the SHORT side is wider than a phone.
// A phone is always narrow on at least one axis (typically <500px wide in portrait,
// <500px tall in landscape). A tablet is wider than that on BOTH axes.
export type Viewport = 'phone' | 'tablet';

const SHORT_SIDE_BREAKPOINT = 600;

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>('phone');

  useEffect(() => {
    const update = () => {
      const shortSide = Math.min(window.innerWidth, window.innerHeight);
      setViewport(shortSide > SHORT_SIDE_BREAKPOINT ? 'tablet' : 'phone');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return viewport;
}
