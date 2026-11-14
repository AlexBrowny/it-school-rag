/**
 * JWT session helpers. Edge/Node compatible (no server-only DB imports) so the proxy can use them too.
 */
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "orbit_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

const MIN_SECRET_LENGTH = 32;
/** Values copied from docs/examples must never be accepted as a real secret. */
const PLACEHOLDER_SECRET = /replace-with|change-me|changeme|your-secret|example|secret-secret/i;

function getKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH || PLACEHOLDER_SECRET.test(secret)) {
    throw new Error(
      `SESSION_SECRET must be set to a random string of at least ${MIN_SECRET_LENGTH} characters (not a placeholder).`,
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(username: string): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getKey());
}

/**
 * Returns the admin username when the token is valid, otherwise null.
 * A missing/weak SESSION_SECRET throws loudly instead of silently turning into "unauthorized".
 */
export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const key = getKey();
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload.role === "admin" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
