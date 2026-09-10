import Image from "next/image";

/**
 * Placeholder mark built from the logo's described elements (navy ring, red
 * ring, yellow star). Swap `public/logo.svg` for the real artwork — nothing
 * else needs to change.
 */
export function Logo({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
