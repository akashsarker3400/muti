import "server-only";

import QRCode from "qrcode";

/**
 * QR codes for printed documents (certificates and student cards). Rendered as
 * inline SVG so the printer gets vector edges rather than a resampled bitmap,
 * and so nothing has to be fetched while the print dialog is open.
 *
 * Two things here are not cosmetic:
 *
 * - **The quiet zone.** The QR standard requires four empty modules around the
 *   symbol. Without it a phone camera reading printed paper often fails to
 *   find the code at all, especially when the QR sits against a border or a
 *   block of text, which is exactly where it sits on these documents.
 * - **Explicit width and height.** The library emits only a viewBox, so an SVG
 *   with no intrinsic size is at the mercy of whatever CSS happens to apply.
 *   Print stylesheets are not the place to discover that.
 */
export async function qrSvg(value: string, size = 96): Promise<string> {
  const svg = await QRCode.toString(value, {
    type: "svg",
    // Four modules of white around the symbol, as the standard asks.
    margin: 4,
    errorCorrectionLevel: "Q",
    color: { dark: "#12204f", light: "#ffffff" },
  });

  return svg.replace(
    "<svg ",
    `<svg width="${size}" height="${size}" role="img" aria-label="QR code" `,
  );
}
