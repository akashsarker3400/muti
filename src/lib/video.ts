/**
 * Pure helpers for the institute videos (homepage additions, 2). Shared by
 * the public player, the admin editor and the JSON-LD, so nothing here may
 * touch the database or the filesystem.
 */

export const VIDEO_MAX_SECONDS = 90;
export const VIDEO_MAX_BYTES = 60 * 1024 * 1024;

export type Embed =
  | { provider: "youtube"; id: string; src: string; thumbnail: string }
  | { provider: "facebook"; src: string; thumbnail: null };

/**
 * Recognises YouTube (watch, youtu.be, shorts, embed) and Facebook video
 * URLs. YouTube renders through the privacy-enhanced domain; Facebook through
 * its plugin endpoint. Anything else is refused so the admin gets a clear
 * validation message instead of a broken iframe.
 */
export function parseEmbedUrl(raw: string): Embed | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");

  if (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    let id = "";
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? "";
    else if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
    else {
      const match = url.pathname.match(/^\/(?:embed|shorts|v|live)\/([^/?]+)/);
      id = match?.[1] ?? "";
    }
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
    return {
      provider: "youtube",
      id,
      src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }

  if (host === "facebook.com" || host === "fb.watch" || host === "fb.com") {
    if (
      host !== "fb.watch" &&
      !/\/videos?\/|\/watch|\/reel\//.test(url.pathname + url.search)
    ) {
      return null;
    }
    return {
      provider: "facebook",
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.toString())}&show_text=false&autoplay=true`,
      thumbnail: null,
    };
  }

  return null;
}

/** 75 -> "PT1M15S" for schema.org. */
export function isoDuration(seconds: number | null | undefined): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `PT${minutes ? `${minutes}M` : ""}${rest ? `${rest}S` : minutes ? "" : "0S"}`;
}

/** 75 -> "1:15" for the admin list. */
export function clockDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}
