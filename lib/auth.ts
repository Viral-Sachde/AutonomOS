/**
 * Dashboard auth: a single operator id + password, held in a signed cookie.
 *
 * Deliberately minimal - there is one user, and the thing being protected is a
 * button that posts to Instagram. What it must get right is the parts that are
 * easy to get wrong: constant-time comparison so the password cannot be probed
 * a character at a time, an HMAC-signed cookie so the session cannot be forged,
 * and an expiry baked into the signed payload rather than trusted from the
 * client.
 *
 * Uses Web Crypto rather than node:crypto so it runs in Next.js middleware.
 */

export const SESSION_COOKIE = "rn_session";
const SESSION_DAYS = 7;

export function isAuthConfigured(): boolean {
  return !!(process.env.AUTH_USER && process.env.AUTH_PASSWORD && process.env.AUTH_SECRET);
}

/** Rejects the empty-string case that would otherwise let anyone in. */
function credentials(): { user: string; password: string; secret: string } | null {
  const user = process.env.AUTH_USER;
  const password = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!user || !password || !secret) return null;
  return { user, password, secret };
}

/** Comparison whose duration does not depend on where the first mismatch is. */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  // Length is compared separately and still folded into the result, so an
  // early return never reveals it.
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyLogin(user: string, password: string): Promise<boolean> {
  const creds = credentials();
  if (!creds) return false;

  // Both comparisons always run so the response time does not reveal whether
  // it was the id or the password that was wrong.
  const userOk = timingSafeEqual(user, creds.user);
  const passOk = timingSafeEqual(password, creds.password);
  return userOk && passOk;
}

export async function createSession(): Promise<string> {
  const creds = credentials();
  if (!creds) throw new Error("Auth is not configured");

  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${creds.user}.${expires}`;
  return `${payload}.${await hmac(payload, creds.secret)}`;
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  const creds = credentials();
  if (!creds || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [user, expiresRaw, signature] = parts;
  const payload = `${user}.${expiresRaw}`;

  const expected = await hmac(payload, creds.secret);
  if (!timingSafeEqual(signature, expected)) return false;

  // Expiry is inside the signed payload, so a client cannot extend it.
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;

  // A changed AUTH_USER invalidates every outstanding session.
  return timingSafeEqual(user, creds.user);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}
