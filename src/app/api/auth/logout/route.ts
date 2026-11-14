import { NextResponse, type NextRequest } from "next/server";
import { fail, isSameOrigin } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return fail("Forbidden", 403);
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
