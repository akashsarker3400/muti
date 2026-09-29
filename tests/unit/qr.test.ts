import jsQR from "jsqr";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { qrSvg } from "@/lib/qr";

/**
 * A QR code that renders is not the same as a QR code that scans. These tests
 * rasterise the real SVG and read it back with a decoder, at the pixel size a
 * phone camera sees when the document is printed.
 */
async function decode(svg: string, pixels: number): Promise<string | null> {
  const { data, info } = await sharp(Buffer.from(svg))
    .resize(pixels, pixels, { fit: "fill" })
    .flatten({ background: "#ffffff" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null;
}

describe("printed QR codes", () => {
  const url = "https://muti.example.com/card/cmstudent123456~AbC-dEf_123";

  it("scans back to the exact address", async () => {
    expect(await decode(await qrSvg(url, 120), 400)).toBe(url);
  });

  it("still scans at the 20mm the card prints it at (about 160px)", async () => {
    expect(await decode(await qrSvg(url, 80), 160)).toBe(url);
  });

  it("keeps the quiet zone the standard requires", async () => {
    const svg = await qrSvg(url, 100);
    // viewBox grows by 8 modules (4 each side) over the bare symbol.
    const bare = await qrSvg(url, 100);
    expect(svg).toContain("viewBox");
    expect(bare).toContain("viewBox");
    const size = Number(svg.match(/viewBox="0 0 (\d+)/)?.[1]);
    // A version-4 symbol is 33 modules; with the quiet zone it must be 41.
    expect(size).toBeGreaterThanOrEqual(33 + 8);
  });

  it("carries an explicit size rather than relying on CSS", async () => {
    const svg = await qrSvg(url, 96);
    expect(svg).toContain('width="96"');
    expect(svg).toContain('height="96"');
  });

  it("survives a long verify address", async () => {
    const long = "https://muti.example.com/verify?q=MUTI-CMU-BTEB-2026-0142";
    expect(await decode(await qrSvg(long, 120), 420)).toBe(long);
  });
});
