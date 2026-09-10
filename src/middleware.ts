import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  /**
   * Locale routing applies to the public site only. The admin panel, API
   * routes, uploaded files and Next internals are excluded — admin auth is
   * enforced inside the admin layout and route handlers instead.
   */
  matcher: ["/((?!api|admin|uploads|_next|_vercel|.*\\..*).*)"],
};
