"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Credentials sign-in for the admin panel. Rate limited per IP so the login
 * form cannot be used to brute-force a password (section 11).
 */
export async function adminSignIn(
  email: string,
  password: string,
  next: string,
): Promise<{ ok: boolean; error?: "invalid" | "rateLimited" }> {
  const limit = await checkRateLimit("login");
  if (!limit.allowed) return { ok: false, error: "rateLimited" };

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: next,
    });
    return { ok: true };
  } catch (error) {
    // signIn throws a redirect on success; let Next handle it.
    if (error instanceof AuthError) {
      return { ok: false, error: "invalid" };
    }
    throw error;
  }
}
