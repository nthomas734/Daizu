'use client';

import { useEffect } from 'react';

// Registers the offline-shell service worker (public/sw.js).
// Rendered once from the root layout; renders nothing.
export function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') {
      // Dev builds have unhashed chunks — a caching SW would serve stale
      // code after edits. Make sure none is lingering, then bail.
      navigator.serviceWorker.getRegistrations?.().then((regs) => regs.forEach((r) => r.unregister()));
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline support is a nice-to-have — never block the app on it
    });
  }, []);
  return null;
}
