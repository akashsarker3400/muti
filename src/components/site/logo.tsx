import Image from "next/image";

/**
 * The institute mark. `public/logo.svg` is a placeholder built from the logo's
 * described elements (navy ring, red ring, yellow star); uploading a real logo
 * under Site Settings → ব্র্যান্ডিং replaces it everywhere.
 */
export function Logo({
  src,
  size = 44,
  className,
}: {
  /** Uploaded logo path from Site Settings; falls back to the placeholder. */
  src?: string;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={src?.trim() || "/logo.svg"}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      priority
      // Uploaded logos are arbitrary shapes; never crop them.
      style={{ objectFit: "contain" }}
    />
  );
}
