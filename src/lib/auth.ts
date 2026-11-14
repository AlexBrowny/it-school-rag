import "server-only";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { adminExists, findAdminHash } from "@/lib/repo";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "@/lib/session";

/** Precomputed cost-12 hash compared against for unknown usernames, so they cost the same as wrong passwords. */
const DUMMY_HASH = "$2b$12$Xzcy5b39TNyqcDsswl3FwOLhOZ9ZqmeQQROebtd9K9/SI8I77Te3u";

export async function authenticate(username: string, password: string): Promise<boolean> {
  const hash = findAdminHash(username);
  const ok = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return Boolean(hash) && ok;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

export async function createSessionToken(username: string): Promise<string> {
  return signSession(username);
}

/** For Server Components: current admin username or null. */
export async function getAdminFromCookies(): Promise<string | null> {
  const store = await cookies();
  const username = await verifySession(store.get(SESSION_COOKIE)?.value);
  return username && adminExists(username) ? username : null;
}

/** For Route Handlers: current admin username or null. */
export async function getAdminFromRequest(request: NextRequest | Request): Promise<string | null> {
  const header = request.headers.get("cookie") ?? "";
  const match = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const username = await verifySession(match?.slice(SESSION_COOKIE.length + 1));
  // A deleted admin loses access immediately instead of when the token expires.
  return username && adminExists(username) ? username : null;
}
