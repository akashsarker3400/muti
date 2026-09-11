# Homepage additions: promo slots and institute video

Spec received 12 Sep 2026 (verbatim from the owner's brief).

1. Promo slots (poster / leaflet / offer ads)
   - Two admin-managed promo slots on the homepage: PROMO_A (full width, directly below the stats strip) and PROMO_B (in the right column beside the Notices section on desktop, below it on mobile). Each slot shows one active promo at a time.
   - Model: Promo { id, slot PROMO_A|PROMO_B, title, image (desktop, recommended 1600x600 for A, 800x800 for B), mobileImage?, link?, openInNewTab, startAt?, endAt?, active, sortOrder, clicks Int @default(0) }.
   - Image only, no text overlay; the office designs the poster themselves and uploads it. Rounded 14px corners, subtle border, click opens link if set (WhatsApp link, course page, notice, or external). Track clicks.
   - If multiple promos are active in one slot, rotate them (fade every 6 seconds, dots). If none active, the slot collapses and leaves no gap.
   - Schedule: startAt/endAt auto show/hide (e.g. Eid offer). Show a small "Offer" tag in the corner only if the admin ticks "isOffer".
   - Admin: Promos page with upload, live preview at desktop and mobile widths, drag reorder, schedule, active toggle, click count. Auto-resize and convert to webp, max upload 5 MB.
   - Also allow a promo to be shown as a one-time popup (modal) on first visit: field showAsPopup with a 7-day cookie, close button, never on admin pages. Off by default.

2. Institute video (about 1 minute)
   - Homepage section "MUTI in 1 minute" placed after the "Why choose MUTI" section: video on the left (16:9, rounded, poster image, play button), short text and two buttons (Apply, WhatsApp) on the right; stacked on mobile.
   - Two sources supported, admin picks one:
     a) Embed URL: YouTube or Facebook video URL. Render with privacy-enhanced embed (youtube-nocookie), lazy load (thumbnail first, iframe only on click). This is the recommended option for speed and bandwidth.
     b) Self-hosted MP4: upload via admin, limits: MP4 (H.264/AAC), max 90 seconds, max 60 MB. Server generates a poster frame with ffmpeg (install if missing), stores in Media with tag video. Rendered with the native HTML5 player, preload="metadata", muted autoplay only if the admin enables "autoplay muted loop" (for a silent ad), otherwise play on click. Show a fallback message if the browser cannot play.
   - Model: SiteVideo { id, title, source EMBED|UPLOAD, embedUrl?, fileId?, posterId?, autoplayMuted Boolean, showOnHome Boolean, placement HOME|ABOUT|HEALTH, sortOrder }. Allow more than one video; homepage shows the first with showOnHome, About page and Health Service page can show their own.
   - Also add a "Video" tab in the Gallery page listing all videos.
   - Admin: Videos page with upload progress bar, duration and size validation before upload starts, preview player, poster override.
   - SEO: VideoObject JSON-LD with name, description, thumbnail, uploadDate, duration.

3. Rules
   - All of this is light theme, no dark mode, no em dashes.
   - Do not let promo images push the hero or the courses grid below the fold on mobile: promo A max height 320px on mobile.
   - Nothing above is visible until the office uploads content; empty slots collapse.
   - Screenshot the homepage at 1440 and 390 with one promo in each slot and the video section, and attach.
