// SVG path data and labels are stored in nav-icon-data.json to keep
// this file free of long string literals that confuse the KISS linter.
import data from "./nav-icon-data.json";

export type NavKey = keyof typeof data;

export const NAV_ICON_PATHS = Object.fromEntries(
  (Object.keys(data) as NavKey[]).map(k => [k, data[k].icon])
) as Record<NavKey, string>;

export const NAV_LABELS = Object.fromEntries(
  (Object.keys(data) as NavKey[]).map(k => [k, data[k].label])
) as Record<NavKey, string>;
