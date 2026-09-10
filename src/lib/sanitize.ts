import sanitizeHtml from "sanitize-html";

/**
 * Rich text stored by the admin panel comes from Tiptap and is written by
 * trusted staff, but it is still user input that ends up in
 * `dangerouslySetInnerHTML`. Everything is sanitised on the way out so a
 * compromised or careless admin account cannot inject script into public
 * pages (section 11).
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "mark",
    "small",
    "sub",
    "sup",
    "h2",
    "h3",
    "h4",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "hr",
    "a",
    "img",
    "figure",
    "figcaption",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "span",
    "div",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    "*": ["style"],
  },
  // Only text alignment is allowed through, which is all the Tiptap toolbar sets.
  allowedStyles: {
    "*": {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  transformTags: {
    // Outbound links open safely.
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const external = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: external
          ? { ...attribs, target: "_blank", rel: "noopener noreferrer" }
          : attribs,
      };
    },
  },
};

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}

/** True when the value has no visible content — used to hide empty sections. */
export function isEmptyRichText(html: string | null | undefined): boolean {
  if (!html) return true;
  return (
    sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
      .replace(/&nbsp;/g, " ")
      .trim().length === 0
  );
}
