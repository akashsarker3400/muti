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
}: {
  variant?: "certificate" | "card";
}) {
  const id = `guilloche-${variant}`;
  const band = variant === "certificate" ? 9 : 6;

  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full"
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
  );
}

/** A diamond motif in each corner, drawn in the page's own aspect ratio. */
export function CornerMotifs({ size = 34 }: { size?: number }) {
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
            margin: "3mm",
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

/** The institute block: logo, names, authority line. */
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
          lang="bn"
          className="leading-tight text-[color:#12204f]"
          style={{ fontSize: compact ? "10pt" : "13pt" }}
        >
          {settings.general.nameBn}
        </p>
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

/** Up to three signature blocks, with the seal printed faintly behind them. */
export function SignatureRow({
  signatories,
  seal,
  width = "32mm",
}: {
  signatories: Signatory[];
  seal?: string;
  width?: string;
}) {
  const shown = signatories.filter((s) => s.title || s.name);
  if (shown.length === 0) return null;

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
          {signatory.name && (
            <p className="mt-0.5 text-[9pt] font-semibold">{signatory.name}</p>
          )}
          <p className="text-[8.5pt] text-[color:#333]">{signatory.title}</p>
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
