// Simple cookie-based password gate. Not "secure" in the cryptographic sense,
// but appropriate for a private home cafe with no real attack surface.
//
// The flow: she visits the site → middleware sees no auth cookie → redirects
// to /auth → she enters the password → if correct, server sets a cookie that
// expires in a year. Subsequent visits skip the gate.

export const AUTH_COOKIE = 'daizu_auth';
export const AUTH_COOKIE_VALUE = 'admit_one'; // arbitrary; presence of valid cookie = passed gate
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
