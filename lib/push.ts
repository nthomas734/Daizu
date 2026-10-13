// Web push — client side.
//
// A device opts in once, as either the bartender (new orders + syrup
// reminders, from the hub's settings tab) or a customer ("ready" pings,
// from the confirm screen). The role sticks in localStorage so the app
// can self-heal the subscription on launch.
//
// iOS rules: push only exists in the installed home-screen PWA, and
// Notification.requestPermission() must run inside a tap handler —
// enablePush is only ever called from a button.

// Public half of the VAPID pair (the private half is in Supabase Vault).
export const VAPID_PUBLIC_KEY =
  'BAOaH63C9YaevEAD5o5ihBti6K7DGqQnZl8nvLPVg7aCmp1EDcs4EjtRxvfRZKSClRR6qjKJGC-fuD8UttU648s';

const ROLE_KEY = 'daizu-push-role';

export type PushRole = 'barista' | 'customer';
export type PushStatus = 'unsupported' | 'denied' | 'off' | PushRole;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function supported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function storedRole(): PushRole | null {
  try {
    const r = localStorage.getItem(ROLE_KEY);
    return r === 'barista' || r === 'customer' ? r : null;
  } catch {
    return null;
  }
}

async function getSub(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function saveSub(sub: PushSubscription, role: PushRole, orderId?: number): Promise<void> {
  const json = sub.toJSON();
  if (!json.keys?.p256dh || !json.keys?.auth) throw new Error('Subscription missing keys');
  const res = await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, role, orderId }),
  });
  if (!res.ok) throw new Error('Could not save subscription');
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await getSub();
  return sub ? storedRole() ?? 'customer' : 'off';
}

// orderId: also attach this device to an order placed before opting in
export async function enablePush(role: PushRole, orderId?: number): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permission not granted');
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) throw new Error('No service worker registration');
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }));
  await saveSub(sub, role, orderId);
  try { localStorage.setItem(ROLE_KEY, role); } catch {}
}

export async function disablePush(): Promise<void> {
  const sub = await getSub();
  if (sub) {
    await fetch('/api/push', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe();
  }
  try { localStorage.removeItem(ROLE_KEY); } catch {}
}

/** This device's push endpoint, if it's opted in — sent with each order. */
export async function currentEndpoint(): Promise<string | null> {
  if (!supported() || Notification.permission !== 'granted') return null;
  try {
    return (await getSub())?.endpoint ?? null;
  } catch {
    return null;
  }
}

/**
 * Self-heal on launch: a 404/410 prune on the server, or iOS quietly
 * dropping the subscription (restore, OS update), leaves the device
 * thinking it's opted in when it isn't. Permission is still granted, so
 * resubscribe without a gesture and re-save. Best-effort, never throws.
 */
export async function syncPushSubscription(): Promise<void> {
  try {
    const role = storedRole();
    if (!supported() || !role || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      }));
    await saveSub(sub, role);
  } catch {
    // next launch will try again
  }
}
