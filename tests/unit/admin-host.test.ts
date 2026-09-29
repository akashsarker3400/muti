import { describe, expect, it } from "vitest";

import { hostOf, publicUrl, routeForHost } from "@/lib/admin-host";

const base = {
  adminHost: "ultrasound.muti.ac.bd",
  search: "",
  protocol: "https:",
};

describe("hostOf", () => {
  it("drops the port and lower-cases", () => {
    expect(hostOf("MUTI.ac.bd:3000")).toBe("muti.ac.bd");
    expect(hostOf("muti.ac.bd")).toBe("muti.ac.bd");
    // Behind a proxy the header can carry a list.
    expect(hostOf("muti.ac.bd, internal.local")).toBe("muti.ac.bd");
    expect(hostOf(null)).toBeNull();
    expect(hostOf("")).toBeNull();
  });
});

describe("routeForHost", () => {
  it("changes nothing when no admin host is configured", () => {
    for (const pathname of ["/", "/admin", "/admin/students", "/courses"]) {
      expect(
        routeForHost({ ...base, adminHost: null, host: "muti.ac.bd", pathname }),
      ).toEqual({ kind: "pass" });
    }
  });

  it("mounts the panel at the root of the admin host", () => {
    const on = (pathname: string) =>
      routeForHost({ ...base, host: "ultrasound.muti.ac.bd", pathname });

    expect(on("/")).toEqual({ kind: "rewrite-admin", pathname: "/admin" });
    expect(on("/login")).toEqual({ kind: "rewrite-admin", pathname: "/admin/login" });
    expect(on("/students")).toEqual({ kind: "rewrite-admin", pathname: "/admin/students" });
    // Existing /admin links and bookmarks keep working on the admin host.
    expect(on("/admin")).toEqual({ kind: "pass" });
    expect(on("/admin/settings")).toEqual({ kind: "pass" });
  });

  it("sends /admin on the public host to the admin host, path and query intact", () => {
    expect(
      routeForHost({
        ...base,
        host: "muti.ac.bd",
        pathname: "/admin/applications",
        search: "?type=BOOK_SAMPLE",
      }),
    ).toEqual({
      kind: "redirect-admin",
      url: "https://ultrasound.muti.ac.bd/admin/applications?type=BOOK_SAMPLE",
    });
  });

  it("leaves the public site alone on the public host", () => {
    for (const pathname of ["/", "/courses", "/bn/verify", "/administration"]) {
      expect(routeForHost({ ...base, host: "muti.ac.bd", pathname })).toEqual({
        kind: "pass",
      });
    }
  });

  it("is case and port insensitive about the configured host", () => {
    expect(
      routeForHost({
        ...base,
        adminHost: "  Ultrasound.MUTI.ac.bd ",
        host: "ultrasound.muti.ac.bd",
        pathname: "/",
      }),
    ).toEqual({ kind: "rewrite-admin", pathname: "/admin" });
  });
});

describe("publicUrl", () => {
  it("joins without doubling the slash", () => {
    expect(publicUrl("https://muti.ac.bd/", "/courses")).toBe("https://muti.ac.bd/courses");
    expect(publicUrl("https://muti.ac.bd", "courses")).toBe("https://muti.ac.bd/courses");
    expect(publicUrl("https://muti.ac.bd")).toBe("https://muti.ac.bd/");
  });
});
