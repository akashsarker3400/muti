import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);
// Edge-safe: `authConfig` carries no database provider, so this only verifies
// the session JWT.
const { auth } = NextAuth(authConfig);

/**
 * Two responsibilities:
 *  - /admin/** requires a signed-in user, so unauthenticated visitors land on
 *    the login page instead of an admin screen (pages and server actions
 *    re-check with `requireAdmin`)
 *  - everything else goes through next-intl locale routing
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    // The login page itself must stay reachable.
    if (pathname === "/admin/login") return NextResponse.next();

    const session = await auth();
    if (!session?.user) {
      const loginUrl = new URL("/admin/login", request.url);
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
    // files with an extension.
    "/((?!api|uploads|_next|_vercel|.*\\..*).*)",
    // Admin panel.
    "/admin/:path*",
  ],
};
