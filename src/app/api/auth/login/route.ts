import { NextResponse, type NextRequest } from "next/server";
import { authenticate, createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { fail, isSameOrigin, readJson, validationFail } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { SESSION_COOKIE } from "@/lib/session";
import { loginSchema } from "@/lib/validators";

const IP_LIMIT = 8;
const USER_LIMIT = 20;
const WINDOW_MS = 15 * 60 * 1000;
// bcrypt costs ~200 ms of CPU per attempt; cap total attempts so spoofed IPs cannot saturate the server.
const GLOBAL_LIMIT = 60;
const GLOBAL_WINDOW_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return fail("Forbidden", 403);

  const byIp = rateLimit(`login:ip:${clientIp(request.headers)}`, IP_LIMIT, WINDOW_MS);
  const overall = rateLimit("login:global", GLOBAL_LIMIT, GLOBAL_WINDOW_MS);
  if (!byIp.ok || !overall.ok) return fail("Too many attempts. Try again later.", 429);

  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationFail(parsed.error);

  const byUser = rateLimit(`login:user:${parsed.data.username.toLowerCase()}`, USER_LIMIT, WINDOW_MS);
  if (!byUser.ok) return fail("Too many attempts. Try again later.", 429);

  const valid = await authenticate(parsed.data.username, parsed.data.password);
  if (!valid) return fail("Invalid username or password", 401);

  const token = await createSessionToken(parsed.data.username);
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
