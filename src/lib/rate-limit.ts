import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

/**
 * Postgres-backed rate limiter (section 11). A table rather than an in-memory
 * map, so the limit survives a container restart and still works if the app is
 * ever run with more than one instance.
 */
export type RateLimitScope = "application" | "verify" | "login" | "health";

const WINDOWS: Record<RateLimitScope, { max: number; windowMs: number }> = {
  // 5 submissions per hour per IP (section 5.6).
  application: { max: 5, windowMs: 60 * 60 * 1000 },
  // Certificate lookups are cheap but scrapeable, so cap them per minute.
  verify: { max: 20, windowMs: 60 * 1000 },
  login: { max: 10, windowMs: 15 * 60 * 1000 },
  // Health serials: a household may book for several people from one phone.
  health: { max: 8, windowMs: 60 * 60 * 1000 },
};

/** Best-effort client IP from the proxy headers Coolify / Cloudflare set. */
export async function clientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headerList.get("cf-connecting-ip") ?? headerList.get("x-real-ip") ?? "unknown";
}

/**
 * Records an attempt and reports whether the caller is over the limit.
 * Fails open: if the database is unreachable we would rather accept a genuine
 * application than reject everyone.
 */
export async function checkRateLimit(
  scope: RateLimitScope,
  key?: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const { max, windowMs } = WINDOWS[scope];
  const identity = key ?? (await clientIp());
  const since = new Date(Date.now() - windowMs);

  try {
    const used = await prisma.rateLimit.count({
      where: { scope, key: identity, createdAt: { gte: since } },
    });

    if (used >= max) {
      return { allowed: false, remaining: 0 };
    }

    await prisma.rateLimit.create({ data: { scope, key: identity } });

    // Opportunistic cleanup so the table cannot grow without bound.
    if (Math.random() < 0.02) {
      await prisma.rateLimit.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      });
    }

    return { allowed: true, remaining: max - used - 1 };
  } catch (error) {
    console.error("Rate limit check failed, allowing the request", error);
    return { allowed: true, remaining: max };
  }
}
