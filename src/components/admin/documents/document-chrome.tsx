import Image from "next/image";

import type { SiteSettings } from "@/lib/site-settings";
import { cn } from "cn";

/**
 * Shared furniture for the printed documents (certificate, registration card).
 *
 * The border is drawn as SVG rather than shipped as an image: it stays sharp
 * at any print resolution, costs nothing to load, and the office can never
 * accidentally delete it from the media library. The guilloche pattern is the
 * same idea a board certificate uses, only in MUTI navy and gold.
 */

export const DOC_NAVY = "#12204f";
export const DOC_GOLD = "#9a7b2f";

/** Fine interlaced line pattern, the cheap cousin of an engraved guilloche. */
export function GuillochePattern({
  id,
  color = DOC_NAVY,
}: {
  id: string;
  color?: string;
}) {
  return (
    <defs>
      <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse">
        <path
          d="M0 9 Q4.5 0 9 9 T18 9 M0 9 Q4.5 18 9 9 T18 9"
          fill="none"
          stroke={color}
          strokeWidth="0.5"
        />
      </pattern>
    </defs>
  );
}

/**
 * Ornamental frame: a gold hairline, a navy rule, a band of guilloche and a
 * corner motif on each corner. `inset` is in millimetres.
 */
export function DocumentBorder({
  variant = "certificate",
  /**
   * Distance from the paper edge. Ordinary office printers cannot print to
   * the edge (3 to 5 mm is typical) and these documents go on plain paper, so
   * the ornament is kept a safe 7 mm in rather than being sliced off.
   */
  inset = "7mm",
}: {
  variant?: "certificate" | "card";
  inset?: string;
}) {
  const id = `guilloche-${variant}`;
  const band = variant === "certificate" ? 9 : 6;

  return (
    /*
     * The span does the positioning and the SVG fills it.
     *
     * An SVG is a replaced element with an intrinsic ratio, so setting all
     * four of top/right/bottom/left over-constrains it: the browser drops the
     * bottom and sizes the height from the 1:1 viewBox. The frame came out
     * square — two thirds of the way down a portrait card, and overflowing
     * the foot of a landscape certificate. Sizing an ordinary box and giving
     * the SVG width and height of 100% leaves nothing to over-constrain.
     */
    <span
      className="pointer-events-none absolute block"
      style={{ top: inset, right: inset, bottom: inset, left: inset }}
      aria-hidden="true"
    >
      <svg
        className="block size-full"
        preserveAspectRatio="none"
        viewBox="0 0 1000 1000"
        aria-hidden="true"
      >
        <GuillochePattern id={id} color={DOC_GOLD} />
        {/* Guilloche band between two rules. */}
        <rect
          x={band}
          y={band}
          width={1000 - band * 2}
          height={1000 - band * 2}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={band * 1.4}
          opacity="0.55"
        />
        <rect
          x="2"
          y="2"
          width="996"
          height="996"
          fill="none"
          stroke={DOC_GOLD}
          strokeWidth="1.5"
        />
        <rect
          x={band * 2}
          y={band * 2}
          width={1000 - band * 4}
          height={1000 - band * 4}
          fill="none"
          stroke={DOC_NAVY}
          strokeWidth="2.5"
        />
        <rect
          x={band * 2 + 5}
          y={band * 2 + 5}
          width={1000 - band * 4 - 10}
          height={1000 - band * 4 - 10}
          fill="none"
          stroke={DOC_NAVY}
          strokeWidth="0.8"
        />
      </svg>
    </span>
  );
}

/** A diamond motif in each corner, inside the same printable-area inset. */
export function CornerMotifs({
  size = 34,
  inset = "9mm",
}: {
  size?: number;
  inset?: string;
}) {
  const corners: Array<{ style: React.CSSProperties; turn: number }> = [
    { style: { top: 0, left: 0 }, turn: 0 },
    { style: { top: 0, right: 0 }, turn: 90 },
    { style: { bottom: 0, right: 0 }, turn: 180 },
    { style: { bottom: 0, left: 0 }, turn: 270 },
  ];
  return (
    <>
      {corners.map((corner, index) => (
        <svg
          key={index}
          width={size}
          height={size}
          viewBox="0 0 40 40"
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            ...corner.style,
            transform: `rotate(${corner.turn}deg)`,
            margin: inset,
          }}
        >
          <path
            d="M20 2 L27 12 L38 20 L27 28 L20 38 L13 28 L2 20 L13 12 Z"
            fill="none"
            stroke={DOC_GOLD}
            strokeWidth="1.2"
          />
          <circle cx="20" cy="20" r="3.5" fill={DOC_NAVY} opacity="0.75" />
        </svg>
      ))}
    </>
  );
}

/**
 * The institute block: logo, name, address, authority line.
 *
 * English only, on the owner's instruction: the certificate, the registration
 * card and the admit card carry no Bangla. The one exception is a name the
 * office typed in Bangla, which is the student's own name and belongs to
 * them, not to the layout.
 */
export function Letterhead({
  settings,
  compact = false,
}: {
  settings: SiteSettings;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        compact ? "gap-3" : "gap-5",
      )}
    >
      {settings.branding.logo && (
        <Image
          src={settings.branding.logo}
          alt=""
          width={compact ? 54 : 78}
          height={compact ? 54 : 78}
          className={
            compact ? "size-[14mm] object-contain" : "size-[20mm] object-contain"
          }
        />
      )}
      <div className="text-center">
        <h1
          className="font-[family-name:var(--font-display-serif)] leading-tight font-bold tracking-[0.02em] text-[color:#12204f]"
          style={{ fontSize: compact ? "13pt" : "21pt" }}
        >
          {settings.general.nameEn}
        </h1>
        <p
          className="mt-0.5 leading-tight text-[color:#555]"
          style={{ fontSize: compact ? "7pt" : "8.5pt" }}
        >
          {settings.contact.addressEn}
        </p>
        {settings.documents.authorityLineEn && (
          <p
            className="font-semibold tracking-wide text-[color:#9a7b2f] uppercase"
            style={{ fontSize: compact ? "6.5pt" : "8pt" }}
          >
            {settings.documents.authorityLineEn}
          </p>
        )}
      </div>
    </div>
  );
}

export type Signatory = { name: string; title: string; image: string };

/**
 * Up to three signature blocks, with the seal printed faintly behind them.
 *
 * A slot with nothing in it still prints its line. A certificate is signed by
 * hand on plain paper, so the line is the part that has to be there; the
 * printed name under it is a convenience. Returning nothing when the office
 * has not filled the settings in left a blank band where the signatures
 * belong and a certificate nobody could sign.
 */
export function SignatureRow({
  signatories,
  seal,
  width = "32mm",
}: {
  signatories: Signatory[];
  seal?: string;
  width?: string;
}) {
  const filled = signatories.filter((s) => s.title || s.name);
  // Nothing configured at all: three plain lines to sign on, evenly spaced.
  const shown = filled.length > 0 ? filled : signatories;

  return (
    <div className="relative flex items-end justify-between gap-6">
      {seal && (
        <Image
          src={seal}
          alt=""
          width={150}
          height={150}
          className="pointer-events-none absolute start-1/2 bottom-2 size-[26mm] -translate-x-1/2 object-contain opacity-25"
        />
      )}
      {shown.map((signatory, index) => (
        <div key={index} className="flex-1 text-center">
          {/* The signature image sits on the line, as a pen would. */}
          <div className="relative mx-auto h-[12mm]" style={{ width }}>
            {signatory.image && (
              <Image
                src={signatory.image}
                alt=""
                fill
                sizes="160px"
                className="object-contain object-bottom"
              />
            )}
          </div>
          <div className="mx-auto border-t border-black" style={{ width }} />
          {/* Both captions are always rendered, blank when unset, so a slot
              with only a designation keeps its line level with the others. */}
          <p className="mt-0.5 text-[9pt] font-semibold">
            {signatory.name || "\u00a0"}
          </p>
          <p className="text-[8.5pt] text-[color:#333]">
            {signatory.title || "\u00a0"}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Verification block: the QR, the address it opens and the document number. */
export function VerifyBlock({
  qr,
  url,
  label,
  size = "20mm",
}: {
  qr: string;
  url: string;
  label: string;
  size?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="block shrink-0 [&>svg]:size-full"
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: qr }}
      />
      <div className="text-[7pt] leading-snug text-[color:#333]">
        <p className="font-semibold">{label}</p>
        <p className="font-latin break-all">{url}</p>
      </div>
    </div>
  );
}

/** Reads the three signatory slots out of Site Settings. */
export function signatoriesOf(settings: SiteSettings): Signatory[] {
  const d = settings.documents;
  return [
    { name: d.sign1Name, title: d.sign1Title, image: d.sign1Image },
    { name: d.sign2Name, title: d.sign2Title, image: d.sign2Image },
    { name: d.sign3Name, title: d.sign3Title, image: d.sign3Image },
  ];
}
