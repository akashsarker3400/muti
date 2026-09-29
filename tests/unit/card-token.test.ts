import { describe, expect, it } from "vitest";

import { signCardToken, verifyCardToken } from "@/lib/card-token";

const SECRET = "test-secret";

describe("student card token", () => {
  it("round-trips the student id", () => {
    const token = signCardToken("cmstudent123456", SECRET);
    expect(verifyCardToken(token, SECRET)).toBe("cmstudent123456");
    // A dot would make the middleware treat the URL as a file and skip it.
    expect(token).not.toContain(".");
  });

  it("rejects tampering, a foreign secret and junk", () => {
    const token = signCardToken("cmstudent123456", SECRET);
    const [id, signature] = token.split("~") as [string, string];
    // Another student's id with this signature, and this id with a tweaked one.
    expect(verifyCardToken(`cmstudent999999~${signature}`, SECRET)).toBeNull();
    expect(verifyCardToken(`${id}~${signature}extra`, SECRET)).toBeNull();
    expect(verifyCardToken(token, "other")).toBeNull();
    expect(verifyCardToken("garbage", SECRET)).toBeNull();
    expect(verifyCardToken("../../etc~sig", SECRET)).toBeNull();
  });
});
