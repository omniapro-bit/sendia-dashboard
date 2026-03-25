export type NavItem = { href: string; label: string; icon: string };
type NavKey = "dashboard" | "profile" | "documents" | "settings";
function navLabel(k: NavKey): string {
  if (k === "dashboard") return "Dashboard";
  if (k === "profile") return "Mon profil";
  if (k === "documents") return "Documents";
  return "Paramètres";
}
function navIcon(k: NavKey): string {
  if (k === "dashboard") return "⊞";
  if (k === "profile") return "◉";
  if (k === "documents") return "◧";
  return "⚙";
}
const NAV_KEYS: NavKey[] = ["dashboard", "profile", "documents", "settings"];
export const NAV_ITEMS: NavItem[] = NAV_KEYS.map(k => ({ href: `/${k}`, label: navLabel(k), icon: navIcon(k) }));
