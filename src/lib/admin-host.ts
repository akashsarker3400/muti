/**
 * Serving the admin panel from its own hostname (for example
 * `ultrasound.muti.ac.bd` while the site is `muti.ac.bd`).
 *
 * The gain is not obscurity, it is isolation. The session cookie is host-only,
 * so once the admin lives on its own name the cookie stops being attached to
 * every public page view; a script injected through public content cannot read
 * or ride it, and the admin name can be put behind an IP allowlist, Cloudflare
 * Access or a WAF rule without touching the public site.
 *
 * One deployment serves both: the middleware looks at the Host header and
 * rewrites. Set `ADMIN_HOST` to switch it on; leave it unset and everything
 * stays on one hostname exactly as before.
 *
 * Pure functions so the routing decisions are unit-tested rather than guessed.
 */

/** Hostname without the port, lower-cased. `null` when there is no Host header. */
export function hostOf(header: string | null): string | null {
  if (!header) return null;
  const host = header.split(",")[0]?.trim().toLowerCase();
  if (!host) return null;
  // Strip the port, but leave an IPv6 literal alone.
  return host.startsWith("[") ? host : (host.split(":")[0] ?? null);
}

export type HostRouting =
  /** Serve as usual: one hostname for everything. */
  | { kind: "pass" }
  /** The admin hostname: map a bare path onto /admin. */
  | { kind: "rewrite-admin"; pathname: string }
  /** The public hostname asked for /admin: send them to the admin hostname. */
  | { kind: "redirect-admin"; url: string };

/**
 * Decides what to do with one request.
 *
 * On the admin host every path is the admin panel: `/` is the dashboard and
 * `/login` is the login page, while `/admin/...` keeps working so existing
 * bookmarks and every `/admin/...` link inside the panel still resolve.
 *
 * On the public host `/admin` is not served at all; it is sent to the admin
 * host so the office's bookmarks survive the move. The path is preserved.
 */
export function routeForHost(input: {
  host: string | null;
  adminHost: string | null;
  pathname: string;
  search: string;
  protocol: string;
}): HostRouting {
  const adminHost = input.adminHost?.trim().toLowerCase() || null;
  if (!adminHost) return { kind: "pass" };

  const onAdminHost = input.host === adminHost;
  const isAdminPath = input.pathname === "/admin" || input.pathname.startsWith("/admin/");

  if (onAdminHost) {
    if (isAdminPath) return { kind: "pass" };
    // Everything else on this hostname is the panel, mounted at the root.
    const pathname = input.pathname === "/" ? "/admin" : `/admin${input.pathname}`;
    return { kind: "rewrite-admin", pathname };
  }

  if (isAdminPath) {
    return {
      kind: "redirect-admin",
      url: `${input.protocol}//${adminHost}${input.pathname}${input.search}`,
    };
  }

  return { kind: "pass" };
}

/** Absolute address of the public site, for links out of the admin panel. */
export function publicUrl(siteUrl: string, path = "/"): string {
  return `${siteUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
