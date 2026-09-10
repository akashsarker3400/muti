/**
 * Single source of truth for the public navigation, shared by the desktop
 * header, the mobile sheet and the footer quick links.
 * `labelKey` is a key inside the `nav` message namespace.
 */
export type NavItem = {
  href: string;
  labelKey: string;
};

export const primaryNav: NavItem[] = [
  { href: "/", labelKey: "home" },
  { href: "/courses", labelKey: "courses" },
  { href: "/admission", labelKey: "admission" },
  { href: "/about", labelKey: "about" },
  { href: "/notices", labelKey: "notices" },
  { href: "/contact", labelKey: "contact" },
];

export const secondaryNav: NavItem[] = [
  { href: "/faculty", labelKey: "faculty" },
  { href: "/accreditation", labelKey: "accreditation" },
  { href: "/results", labelKey: "results" },
  { href: "/verify", labelKey: "verify" },
  { href: "/gallery", labelKey: "gallery" },
  { href: "/downloads", labelKey: "downloads" },
  { href: "/faq", labelKey: "faq" },
  { href: "/blog", labelKey: "blog" },
];

export const allNav: NavItem[] = [...primaryNav, ...secondaryNav];
