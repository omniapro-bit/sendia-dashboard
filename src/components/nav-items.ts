import { NAV_ICON_PATHS, NAV_LABELS, type NavKey } from "./nav-icons";
export type { NavKey };
export type NavItem = { href: string; label: string; icon: string };
const KEYS: NavKey[] = ["dashboard", "profile", "connect", "documents", "settings"];
export const NAV_ITEMS: NavItem[] = KEYS.map(k => ({
  href:  `/${k}`,
  label: NAV_LABELS[k],
  icon:  NAV_ICON_PATHS[k],
}));
