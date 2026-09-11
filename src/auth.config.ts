import type { NextAuthConfig } from "next-auth";

import type { Role } from "@/generated/prisma/enums";

/**
 * Edge-safe half of the Auth.js configuration.
 *
 * `middleware.ts` runs on the Edge runtime, where Prisma and bcrypt cannot be
 * imported, so the provider (which needs both) lives in `auth.ts` and only
 * this cookie/JWT-shaped part is shared with the middleware.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = (token.role as Role) ?? "STAFF";
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
