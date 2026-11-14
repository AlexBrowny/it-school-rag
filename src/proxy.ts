import { NextResponse, type NextRequest } from "next/server";
import { isLocale, negotiateLocale } from "@/i18n/config";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const LOCALE_COOKIE = "orbit_locale";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin area + admin API: require a valid session (re-verified again in handlers).
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const isLogin = pathname === "/admin/login";
    const admin = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (pathname.startsWith("/api/admin")) {
      return admin
        ? NextResponse.next()
        : NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!admin && !isLogin) return NextResponse.redirect(new URL("/admin/login", request.url));
    if (admin && isLogin) return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.next();
  }

  // Public pages: ensure a locale prefix.
  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first)) {
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return response;
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    cookieLocale && isLocale(cookieLocale)
      ? cookieLocale
      : negotiateLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, API routes (except admin), and any file with an extension.
  matcher: ["/((?!_next|api/(?!admin)|.*\\..*).*)", "/api/admin/:path*"],
};
