/**
 * Single source of truth for the public navigation (addendum 3, §7), shared
 * by the desktop header, the mobile sheet and the footer quick links.
 * `labelKey` is a key inside the `nav` message namespace; `label` is used
 * instead for items whose text comes from the database (leadership pages).
 */
export type NavItem = {
  href: string;
  labelKey?: string;
  label?: string;
};

/** Top bar: About is a dropdown made of `aboutNav` plus the leadership pages. */
export const primaryNav: NavItem[] = [
  { href: "/", labelKey: "home" },
  { href: "/about", labelKey: "about" },
  { href: "/courses", labelKey: "courses" },
  { href: "/admission", labelKey: "admission" },
  { href: "/results", labelKey: "results" },
  { href: "/verify", labelKey: "verify" },
  { href: "/notices", labelKey: "notices" },
  { href: "/gallery", labelKey: "gallery" },
  { href: "/contact", labelKey: "contact" },
];

/** Static part of the About dropdown; leadership links are inserted after "about". */
export const aboutNav: NavItem[] = [
  { href: "/about", labelKey: "about" },
  { href: "/advisors", labelKey: "advisors" },
  { href: "/faculty", labelKey: "faculty" },
  { href: "/accreditation", labelKey: "accreditation" },
];

/** Pages that only live in the footer and the mobile drawer. */
export const secondaryNav: NavItem[] = [
  { href: "/downloads", labelKey: "downloads" },
  { href: "/faq", labelKey: "faq" },
  { href: "/blog", labelKey: "blog" },
];

/** About dropdown with the published leadership pages slotted in. */
export function aboutMenu(leadership: NavItem[]): NavItem[] {
  const [about, ...rest] = aboutNav;
  return [about!, ...leadership, ...rest];
}

/** Everything, flat, for the drawer and the footer. */
export function allNav(leadership: NavItem[]): NavItem[] {
  const seen = new Set<string>();
  return [...primaryNav, ...aboutMenu(leadership), ...secondaryNav].filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}
