import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";
import { hostOf, routeForHost } from "@/lib/admin-host";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);
// Edge-safe: `authConfig` carries no database provider, so this only verifies
// the session JWT.
const { auth } = NextAuth(authConfig);

/**
 * Three responsibilities:
 *  - when `ADMIN_HOST` is set, the admin panel is served from its own
 *    hostname and is not served from the public one (see src/lib/admin-host.ts)
 *  - /admin/** requires a signed-in user, so unauthenticated visitors land on
 *    the login page instead of an admin screen (pages and server actions
 *    re-check with `requireAdmin`)
 *  - everything else goes through next-intl locale routing
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- Host routing -------------------------------------------------------
  const routing_ = routeForHost({
    host: hostOf(request.headers.get("host")),
    adminHost: process.env.ADMIN_HOST ?? null,
    pathname,
    search: request.nextUrl.search,
    protocol: request.nextUrl.protocol,
  });

  if (routing_.kind === "redirect-admin") {
    return NextResponse.redirect(routing_.url, 308);
  }

  if (routing_.kind === "rewrite-admin") {
    const url = request.nextUrl.clone();
    url.pathname = routing_.pathname;
    // Guard the rewritten path the same way as a direct /admin request.
    if (routing_.pathname !== "/admin/login") {
      const session = await auth();
      if (!session?.user) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/admin/login";
        loginUrl.searchParams.set("next", routing_.pathname);
        return NextResponse.rewrite(loginUrl);
      }
    }
    return NextResponse.rewrite(url);
  }

  // English moved to the root: the old /en/* addresses redirect permanently
  // to the same path without the prefix, query string intact.
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/en" ? "/" : pathname.slice(3);
    return NextResponse.redirect(url, 308);
  }

  // The student portal has its own root layout and its own session, and no
  // locale prefix: it is Bangla for everybody. The locale middleware would
  // only rewrite it to a route that does not exist.
  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    // The login page itself must stay reachable.
    if (pathname === "/admin/login") return NextResponse.next();

    const session = await auth();
    if (!session?.user) {
      // Clone rather than build from `request.url`: on the admin hostname that
      // would send the visitor back to the public one to sign in.
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Public site: everything except API routes, uploads, Next internals and
    // files with an extension. On the admin hostname this same pattern is what
    // lets `/`, `/students` and the rest be rewritten onto /admin.
    "/((?!api|uploads|_next|_vercel|.*\\..*).*)",
    // Admin panel.
    "/admin/:path*",
  ],
};
