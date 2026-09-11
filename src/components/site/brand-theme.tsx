import type { SiteSettings } from "@/lib/site-settings";

/** Only accept a plain hex colour — this value goes straight into CSS. */
const HEX = /^#[0-9a-f]{3,8}$/i;

function hex(value: string): string | null {
  const trimmed = value.trim();
  return HEX.test(trimmed) ? trimmed : null;
}

/**
 * Applies the brand colours chosen in Site Settings by overriding the CSS
 * variables from globals.css. Anything left blank keeps the built-in palette,
 * and a value that is not a hex colour is ignored rather than injected.
 */
export function BrandTheme({ settings }: { settings: SiteSettings }) {
  const brand = hex(settings.branding.brandColor);
  const brandDark = hex(settings.branding.brandDarkColor);
  const accent = hex(settings.branding.accentColor);
  const highlight = hex(settings.branding.highlightColor);

  const declarations = [
    brand && `--brand:${brand}`,
    brand && `--primary:${brand}`,
    brand && `--ring:${brand}`,
    brand && `--chart-1:${brand}`,
    brand && `--secondary-foreground:${brand}`,
    brand && `--accent-foreground:${brand}`,
    // The soft tint and the sidebar derive from the brand colour.
    brand && `--brand-soft:color-mix(in oklab, ${brand} 10%, white)`,
    brand && `--accent:color-mix(in oklab, ${brand} 10%, white)`,
    brandDark && `--brand-dark:${brandDark}`,
    brandDark && `--sidebar:${brandDark}`,
    accent && `--accent-red:${accent}`,
    accent && `--accent-red-ink:color-mix(in oklab, ${accent} 82%, black)`,
    accent && `--chart-3:${accent}`,
    highlight && `--highlight:${highlight}`,
    highlight && `--chart-4:${highlight}`,
  ].filter(Boolean);

  if (declarations.length === 0) return null;

  return (
    <style
      // Values are validated as hex above, so there is nothing to escape.
      dangerouslySetInnerHTML={{
        __html: `:root{${declarations.join(";")}}`,
      }}
    />
  );
}
