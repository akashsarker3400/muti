import "server-only";

import QRCode from "qrcode";

/**
 * QR codes for printed documents (certificates and student cards). Rendered as
 * inline SVG so the printer gets vector edges rather than a resampled bitmap,
 * and so nothing has to be fetched while the print dialog is open.
 *
 * Error correction is set to Q: a printed card picks up scratches and stamps,
 * and Q still reads with about a quarter of the code damaged.
 */
export async function qrSvg(value: string, size = 96): Promise<string> {
  const svg = await QRCode.toString(value, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "Q",
    color: { dark: "#12204f", light: "#ffffff" },
  });
  // The library hardcodes a width/height; swap them for the size we want and
  // let the viewBox do the scaling.
  return svg
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`);
}
