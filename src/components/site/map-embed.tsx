import type { SiteSettings } from "@/lib/site-settings";

/**
 * Google Maps embed. Preference order: an explicit embed URL from Site
 * Settings, then lat/lng, then the address string as a search query — which is
 * the documented fallback while the exact coordinates are still TODO
 * (section 3).
 */
export function mapEmbedSrc(settings: SiteSettings, address: string): string {
  if (settings.contact.mapEmbedUrl.trim()) {
    return settings.contact.mapEmbedUrl.trim();
  }

  const lat = settings.contact.mapLat.trim();
  const lng = settings.contact.mapLng.trim();
  const query = lat && lng ? `${lat},${lng}` : address;

  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export function MapEmbed({
  settings,
  address,
  title,
  className,
}: {
  settings: SiteSettings;
  address: string;
  title: string;
  className?: string;
}) {
  return (
    <iframe
      src={mapEmbedSrc(settings, address)}
      title={title}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
      className={
        className ??
        "h-64 w-full rounded-xl border border-[color:var(--border)] sm:h-80"
      }
    />
  );
}
