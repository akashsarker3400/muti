import "server-only";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Stamps the sample chapter PDF at upload time (addendum 5, A2): a MUTI
 * header and a "Sample chapter, not for resale" footer on every page. The
 * original file the office uploads is never stored; only the stamped copy
 * goes to protected storage.
 */
export async function stampSamplePdf(
  input: Buffer,
  options: { header: string; footer: string },
): Promise<Buffer> {
  const pdf = await PDFDocument.load(input, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const small = await pdf.embedFont(StandardFonts.Helvetica);
  const navy = rgb(0.106, 0.165, 0.42);
  const grey = rgb(0.4, 0.4, 0.45);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const margin = 24;

    // Header: institute name on the left, thin rule underneath.
    page.drawText(options.header, {
      x: margin,
      y: height - margin,
      size: 9,
      font,
      color: navy,
    });
    page.drawLine({
      start: { x: margin, y: height - margin - 6 },
      end: { x: width - margin, y: height - margin - 6 },
      thickness: 0.6,
      color: navy,
      opacity: 0.5,
    });

    // Footer: centred notice.
    const footerWidth = small.widthOfTextAtSize(options.footer, 8);
    page.drawText(options.footer, {
      x: Math.max(margin, (width - footerWidth) / 2),
      y: margin - 8,
      size: 8,
      font: small,
      color: grey,
    });
  }

  pdf.setProducer("MUTI website");
  pdf.setCreator("MUTI website");
  return Buffer.from(await pdf.save());
}
