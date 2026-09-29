"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export type SignInError =
  "invalid" | "rateLimited" | "locked" | "2fa_required" | "2fa_invalid";

/**
 * Credentials sign-in for the admin panel. Rate limited per IP so the form
 * cannot be used to brute-force a password (section 11); `authorize()` also
 * counts failures per account and locks it, which the per-IP limit cannot see.
 *
 * `2fa_required` is not a failure the visitor caused: it is how the form
 * learns that this account has an authenticator and needs to show the code
 * field. It is only ever returned once the email and password were correct.
 */
export async function adminSignIn(
  email: string,
  password: string,
  next: string,
  code?: string,
): Promise<{ ok: boolean; error?: SignInError }> {
  const limit = await checkRateLimit("login");
  if (!limit.allowed) return { ok: false, error: "rateLimited" };

  try {
    await signIn("credentials", {
      email,
      password,
      code: code ?? "",
      redirectTo: next,
    });
    return { ok: true };
  } catch (error) {
    // signIn throws a redirect on success; let Next handle it.
    if (error instanceof AuthError) {
      const reason = (error as { code?: string }).code ?? "";
      if (reason.startsWith("2fa_required"))
        return { ok: false, error: "2fa_required" };
      if (reason.startsWith("2fa_invalid")) return { ok: false, error: "2fa_invalid" };
      if (reason.startsWith("locked")) return { ok: false, error: "locked" };
      return { ok: false, error: "invalid" };
    }
    throw error;
  }
}
