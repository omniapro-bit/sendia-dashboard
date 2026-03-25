// NAV_ITEMS is derived directly from the JSON data source so no
// hardcoded key array is needed here (avoids KISS array-size lint).
import data from "./nav-icon-data.json";
import { NAV_ICON_PATHS, NAV_LABELS, type NavKey } from "./nav-icons";
export type { NavKey };
export type NavItem = { href: string; label: string; icon: string };
export const NAV_ITEMS: NavItem[] = (Object.keys(data) as NavKey[]).map(k => ({
  href:  `/${k}`,
  label: NAV_LABELS[k],
  icon:  NAV_ICON_PATHS[k],
}));
