import { describe, expect, it } from "vitest";

import { clockDuration, isoDuration, parseEmbedUrl } from "@/lib/video";

describe("parseEmbedUrl", () => {
  it("recognises the YouTube URL shapes and uses the privacy domain", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10s",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ]) {
      const embed = parseEmbedUrl(url);
      expect(embed?.provider, url).toBe("youtube");
      expect(embed?.src).toContain(
        "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      );
      expect(embed?.thumbnail).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    }
  });

  it("recognises Facebook video links and refuses everything else", () => {
    expect(
      parseEmbedUrl("https://www.facebook.com/muti/videos/123456789/")?.provider,
    ).toBe("facebook");
    expect(parseEmbedUrl("https://fb.watch/abc123/")?.provider).toBe("facebook");
    expect(parseEmbedUrl("https://www.facebook.com/muti")).toBeNull();
    expect(parseEmbedUrl("https://vimeo.com/123")).toBeNull();
    expect(parseEmbedUrl("not a url")).toBeNull();
    expect(parseEmbedUrl("https://www.youtube.com/watch?v=bad id")).toBeNull();
  });
});

describe("durations", () => {
  it("formats schema.org and clock durations", () => {
    expect(isoDuration(75)).toBe("PT1M15S");
    expect(isoDuration(60)).toBe("PT1M");
    expect(isoDuration(9)).toBe("PT9S");
    expect(isoDuration(0)).toBeUndefined();
    expect(clockDuration(75)).toBe("1:15");
    expect(clockDuration(null)).toBe("");
  });
});
