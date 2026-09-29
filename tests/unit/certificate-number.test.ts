import { describe, expect, it } from "vitest";

import {
  DEFAULT_CERTIFICATE_FORMAT,
  renderCertificateNumber,
  seriesKey,
  type CertificateNumberParts,
} from "@/lib/certificate-number";

const parts: CertificateNumberParts = {
  prefix: "MUTI",
  courseCode: "CMU",
  type: "COURSE",
  issuedAt: new Date("2026-08-26T00:00:00.000Z"),
};

describe("certificate numbers", () => {
  it("fills the default format and pads the running number", () => {
    expect(renderCertificateNumber(DEFAULT_CERTIFICATE_FORMAT, parts, 14)).toBe(
      "MUTI-CMU-2026-0014",
    );
    expect(renderCertificateNumber(DEFAULT_CERTIFICATE_FORMAT, parts, 1234)).toBe(
      "MUTI-CMU-2026-1234",
    );
  });

  it("supports every placeholder", () => {
    expect(
      renderCertificateNumber("{prefix}/{type}{yy}{month}/{course}/{seq:3}", parts, 7),
    ).toBe("MUTI/C2608/CMU/007");
    expect(renderCertificateNumber("{seq}", parts, 42)).toBe("42");
  });

  it("keeps one counter per series, and a new one when the year or course turns", () => {
    const key = seriesKey(DEFAULT_CERTIFICATE_FORMAT, parts);
    expect(key).toBe("MUTI-CMU-2026");
    expect(seriesKey(DEFAULT_CERTIFICATE_FORMAT, { ...parts, courseCode: "DMU" })).not.toBe(
      key,
    );
    expect(
      seriesKey(DEFAULT_CERTIFICATE_FORMAT, {
        ...parts,
        issuedAt: new Date("2027-01-02T00:00:00.000Z"),
      }),
    ).not.toBe(key);
    // The sequence itself never changes the series.
    expect(seriesKey("{prefix}-{seq:9}", parts)).toBe(seriesKey("{prefix}-{seq}", parts));
  });

  it("does not leave a dangling separator when a part is empty", () => {
    expect(
      renderCertificateNumber(DEFAULT_CERTIFICATE_FORMAT, { ...parts, prefix: "" }, 3),
    ).toBe("CMU-2026-0003");
    expect(
      renderCertificateNumber("{prefix}-{course}-{seq:2}", { ...parts, courseCode: "" }, 3),
    ).toBe("MUTI-03");
  });

  it("falls back to the default when the format is blank", () => {
    expect(renderCertificateNumber("   ", parts, 5)).toBe("MUTI-CMU-2026-0005");
  });
});
