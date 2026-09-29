import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "@/auth.config";
import type { Role } from "@/generated/prisma/enums";
import { requiredEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { decryptSecret, normalizeBackupCode, verifyTotp } from "@/lib/totp";

/**
 * Admin authentication (section 2): Credentials provider, bcrypt password
 * hashes at cost 12, JWT sessions. There is no public sign-up — accounts are
 * created by a SUPER_ADMIN in the admin panel or by the seed.
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  /** TOTP code or a backup code; only required once 2FA is enrolled. */
  code: z.string().optional(),
});

/**
 * Account lockout. The per-IP rate limit on the sign-in action stops one
 * machine hammering the form; this stops a spread-out attack on one account,
 * which the IP limit cannot see.
 */
const MAX_FAILED = 8;
const LOCK_MINUTES = 15;

/**
 * Auth.js reads the `code` property off a CredentialsSignin, not the message
 * the constructor is given, so each outcome the login form needs to tell
 * apart is its own subclass.
 */
class TwoFactorRequired extends CredentialsSignin {
  code = "2fa_required";
}
class TwoFactorInvalid extends CredentialsSignin {
  code = "2fa_invalid";
}
class AccountLocked extends CredentialsSignin {
  code = "locked";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase().trim() },
        });

        // Compare even when the user is missing, so a wrong email and a wrong
        // password take the same time and cannot be told apart.
        const hash =
          user?.passwordHash ??
          "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu";
        const valid = await bcrypt.compare(parsed.data.password, hash);

        if (!user || !user.active) return null;

        // A locked account fails before the password is even considered, so
        // the lockout cannot be probed for a correct password.
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new AccountLocked();
        }

        if (!valid) {
          await registerFailure(user.id, user.failedLogins);
          return null;
        }

        // ---- second factor ------------------------------------------------
        if (user.totpSecret) {
          const code = (parsed.data.code ?? "").trim();
          if (!code) throw new TwoFactorRequired();

          const accepted = await checkSecondFactor(user, code);
          if (!accepted) {
            await registerFailure(user.id, user.failedLogins);
            throw new TwoFactorInvalid();
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});

/** Counts a bad attempt and locks the account once they pile up. */
async function registerFailure(userId: string, failedSoFar: number) {
  const failedLogins = failedSoFar + 1;
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLogins,
      lockedUntil:
        failedLogins >= MAX_FAILED
          ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
          : null,
    },
  });
}

/**
 * A TOTP code from the authenticator, or one of the printed backup codes.
 * A backup code works once: it is removed as it is accepted.
 */
async function checkSecondFactor(
  user: { id: string; email: string; totpSecret: string | null; backupCodes: string[] },
  code: string,
): Promise<boolean> {
  const secret = user.totpSecret
    ? decryptSecret(user.totpSecret, requiredEnv("AUTH_SECRET"))
    : null;
  if (secret && verifyTotp(secret, code, user.email)) return true;

  const candidate = normalizeBackupCode(code);
  if (candidate.length < 8) return false;

  for (const hashed of user.backupCodes) {
    if (await bcrypt.compare(candidate, hashed)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { backupCodes: user.backupCodes.filter((entry) => entry !== hashed) },
      });
      return true;
    }
  }
  return false;
}
