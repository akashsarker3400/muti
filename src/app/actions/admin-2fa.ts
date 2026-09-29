"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

import { logActivity, requireAdmin, requireSuperAdmin } from "@/lib/admin-auth";
import { requiredEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  decryptSecret,
  encryptSecret,
  newBackupCodes,
  newTotpSecret,
  totpUri,
  verifyTotp,
} from "@/lib/totp";

/**
 * Two-factor enrolment. Every action here works on the signed-in user's own
 * account: nobody, not even a super admin, can turn on 2FA for someone else,
 * because they would have to hold the other person's authenticator.
 *
 * A super admin can only *clear* another account's 2FA, which is the recovery
 * path for a lost phone with no backup codes left, and it is audited.
 */

export type Enrolment = {
  /** Base32 secret, shown once so it can be typed into an app by hand. */
  secret: string;
  /** otpauth:// address behind the QR code. */
  uri: string;
};

/** Step one: make a secret. Nothing is saved until a code proves it works. */
export async function beginTwoFactor(): Promise<Enrolment> {
  const admin = await requireAdmin();
  const secret = newTotpSecret();
  return { secret, uri: totpUri(secret, admin.email) };
}

/**
 * Step two: the code proves the app and the server agree, so the secret is
 * stored (encrypted) and the backup codes are returned once.
 */
export async function confirmTwoFactor(
  secret: string,
  code: string,
): Promise<{ ok: true; backupCodes: string[] } | { ok: false; error: string }> {
  const admin = await requireAdmin();

  if (!verifyTotp(secret, code, admin.email)) {
    return { ok: false, error: "That code did not match. Check the time on your phone and try again." };
  }

  const backupCodes = newBackupCodes();
  const hashed = await Promise.all(backupCodes.map((entry) => bcrypt.hash(entry.replace("-", ""), 12)));

  await prisma.user.update({
    where: { id: admin.id },
    data: {
      totpSecret: encryptSecret(secret, requiredEnv("AUTH_SECRET")),
      totpEnabledAt: new Date(),
      backupCodes: hashed,
    },
  });
  await logActivity(admin.id, "2fa-enable", "user", admin.id);
  revalidatePath("/admin/security");

  return { ok: true, backupCodes };
}

/** Turning it off needs a current code: a borrowed session must not suffice. */
export async function disableTwoFactor(
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!user?.totpSecret) return { ok: true };

  const secret = decryptSecret(user.totpSecret, requiredEnv("AUTH_SECRET"));
  if (!secret || !verifyTotp(secret, code, admin.email)) {
    return { ok: false, error: "Enter a current code from your authenticator to turn it off." };
  }

  await prisma.user.update({
    where: { id: admin.id },
    data: { totpSecret: null, totpEnabledAt: null, backupCodes: [] },
  });
  await logActivity(admin.id, "2fa-disable", "user", admin.id);
  revalidatePath("/admin/security");
  return { ok: true };
}

/** Fresh codes, invalidating the old sheet. Needs a current code. */
export async function regenerateBackupCodes(
  code: string,
): Promise<{ ok: true; backupCodes: string[] } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!user?.totpSecret) return { ok: false, error: "Two-factor is not enabled." };

  const secret = decryptSecret(user.totpSecret, requiredEnv("AUTH_SECRET"));
  if (!secret || !verifyTotp(secret, code, admin.email)) {
    return { ok: false, error: "Enter a current code from your authenticator." };
  }

  const backupCodes = newBackupCodes();
  const hashed = await Promise.all(backupCodes.map((entry) => bcrypt.hash(entry.replace("-", ""), 12)));
  await prisma.user.update({ where: { id: admin.id }, data: { backupCodes: hashed } });
  await logActivity(admin.id, "2fa-backup-codes", "user", admin.id);
  revalidatePath("/admin/security");
  return { ok: true, backupCodes };
}

/**
 * Recovery: a super admin clears 2FA on another account, and unlocks it.
 * Audited, because it is the one path that weakens somebody else's login.
 */
export async function clearTwoFactorFor(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireSuperAdmin();
  if (admin.id === userId) {
    return { ok: false, error: "Use the Security page to change your own two-factor." };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: null,
        totpEnabledAt: null,
        backupCodes: [],
        failedLogins: 0,
        lockedUntil: null,
      },
    });
    await logActivity(admin.id, "2fa-clear", "user", userId);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not update that account." };
  }
}

/** Unlocks an account locked out by failed attempts. */
export async function unlockAccount(userId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireSuperAdmin();
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLogins: 0, lockedUntil: null },
    });
    await logActivity(admin.id, "unlock", "user", userId);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not unlock that account." };
  }
}
