/**
 * Small helpers around environment variables. We deliberately avoid a hard
 * zod-validated env module: the site must still render (with degraded
 * features) if optional integrations like SMTP are not configured yet.
 */

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";

export const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
);
