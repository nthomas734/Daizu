// Web push — server side. Only import from API routes (Node runtime).
//
// daizu_push holds one row per opted-in device: role 'barista' gets new
// orders and syrup reminders, role 'customer' gets "ready" pings. An
// order also remembers the endpoint of the device that placed it, so
// "ready" goes back to that exact phone.
//
// The VAPID private key lives in Supabase Vault (read via the
// service-role-only daizu_vapid_private() function), so there's no
// Vercel env var to keep in sync. The public half is in lib/push.ts.

import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase';
import { VAPID_PUBLIC_KEY } from '@/lib/push';

export type PushRole = 'barista' | 'customer';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

interface SubRow {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

let vapidReady = false;

async function ensureVapid(): Promise<boolean> {
  if (vapidReady) return true;
  const { data, error } = await supabaseAdmin().rpc('daizu_vapid_private');
  if (error || !data) {
    console.error('VAPID key unavailable:', error);
    return false;
  }
  webpush.setVapidDetails('mailto:nathanthomas734@gmail.com', VAPID_PUBLIC_KEY, data as string);
  vapidReady = true;
  return true;
}

async function sendTo(subs: SubRow[], payload: PushPayload): Promise<number> {
  if (subs.length === 0 || !(await ensureVapid())) return 0;
  const sb = supabaseAdmin();
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err) {
        // 404/410 = the push service says this device is gone. Prune it.
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await sb.from('daizu_push').delete().eq('id', s.id);
        } else {
          console.error('push failed:', code, err);
        }
      }
    })
  );
  return sent;
}

// Every device opted in to `role`, minus `exceptEndpoint` (so the
// bartender ringing up a drink from their own phone doesn't ping themself).
// Never throws; returns how many devices it reached.
export async function sendToRole(
  role: PushRole,
  payload: PushPayload,
  exceptEndpoint?: string | null
): Promise<number> {
  try {
    const { data } = await supabaseAdmin().from('daizu_push').select('*').eq('role', role);
    const subs = ((data ?? []) as SubRow[]).filter((s) => s.endpoint !== exceptEndpoint);
    return await sendTo(subs, payload);
  } catch (err) {
    console.error('sendToRole failed:', err);
    return 0;
  }
}

export async function sendToEndpoint(endpoint: string, payload: PushPayload): Promise<number> {
  try {
    const { data } = await supabaseAdmin().from('daizu_push').select('*').eq('endpoint', endpoint);
    return await sendTo((data ?? []) as SubRow[], payload);
  } catch (err) {
    console.error('sendToEndpoint failed:', err);
    return 0;
  }
}
