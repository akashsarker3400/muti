import "server-only";

/**
 * Cloudflare Turnstile server check (addendum 3, §1). With no secret
 * configured the widget is not rendered and this returns true, so the rate
 * limiter alone protects the lookup.
 */
export async function verifyTurnstile(
  token: string | undefined,
  secret: string,
  ip?: string | null,
): Promise<boolean> {
  if (!secret) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body, cache: "no-store" },
    );
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return false;
  }
}
