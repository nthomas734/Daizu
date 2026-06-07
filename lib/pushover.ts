// Pushover notification client.
//
// Pushover is a $5 one-time iOS app that receives push notifications via a
// simple HTTPS POST. We have one "app" registered with Pushover (giving us
// PUSHOVER_APP_TOKEN), and two "user keys" — one for you (the barista) and
// one for her (the customer).

const PUSHOVER_API = 'https://api.pushover.net/1/messages.json';

type Recipient = 'barista' | 'customer';

export async function sendPushover(
  recipient: Recipient,
  message: string,
  options: { title?: string; priority?: number } = {}
) {
  const userKey =
    recipient === 'barista'
      ? process.env.PUSHOVER_BARISTA_KEY
      : process.env.PUSHOVER_CUSTOMER_KEY;

  if (!process.env.PUSHOVER_APP_TOKEN || !userKey) {
    console.warn(
      `Pushover not configured (missing ${recipient} key or app token). ` +
        `Notification skipped: ${message}`
    );
    return { ok: false, skipped: true };
  }

  const body = new URLSearchParams({
    token: process.env.PUSHOVER_APP_TOKEN,
    user: userKey,
    message,
    title: options.title || 'daizu',
    priority: String(options.priority ?? 0),
  });

  try {
    const res = await fetch(PUSHOVER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      console.error('Pushover failed:', await res.text());
      return { ok: false, error: 'pushover_api_error' };
    }
    return { ok: true };
  } catch (err) {
    console.error('Pushover error:', err);
    return { ok: false, error: 'fetch_failed' };
  }
}

// The pool of "ready" phrases — one is picked at random when the barista
// taps "ready for pickup".
export const READY_PHRASES = [
  { jp: 'おまたせしました', en: 'sorry to keep you waiting' },
  { jp: 'どうぞ',            en: 'here you go' },
  { jp: '召し上がれ',        en: 'please enjoy' },
  { jp: 'できました',        en: "it's ready" },
];

export function pickReadyPhrase() {
  return READY_PHRASES[Math.floor(Math.random() * READY_PHRASES.length)];
}
