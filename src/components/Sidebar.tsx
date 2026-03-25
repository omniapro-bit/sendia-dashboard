"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { NAV_ITEMS, type NavItem } from "@/components/nav-items";
function navLinkClass(active: boolean): string {
  if (active) return "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-[#4f6ef7]/15 text-[#6b85ff] border border-[#4f6ef7]/20";
  return "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#9999b0] hover:bg-[#1c1c28] hover:text-[#f0f0f5] transition-all duration-150";
}
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} className={navLinkClass(active)}>
      <span className="w-5 h-5 flex items-center justify-center text-base shrink-0">{item.icon}</span>
      {item.label}
    </Link>
  );
}
export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const displayName = profile?.client_name ?? user?.email?.split("@")[0] ?? "Utilisateur";
  const initial = displayName.charAt(0).toUpperCase();
  async function handleSignOut() {
    try { await signOut(); router.push("/login"); }
    catch { toast("Erreur lors de la déconnexion", "error"); }
  }
  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }
  return (
    <aside className="flex flex-col h-full bg-[#12121a] border-r border-[#2a2a3a] w-60">
      <div className="px-5 py-5 border-b border-[#2a2a3a]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#4f6ef7] flex items-center justify-center text-white font-bold text-sm shrink-0">S</div>
          <span className="text-lg font-extrabold tracking-tight text-[#f0f0f5]">Sendia</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(item => <NavLink key={item.href} item={item} active={isActive(item.href)} />)}
        {onClose && <button onClick={onClose} className="sr-only">Fermer</button>}
      </nav>
      <div className="px-3 py-4 border-t border-[#2a2a3a]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl mb-2">
          <div className="w-8 h-8 rounded-full bg-[#4f6ef7]/20 border border-[#4f6ef7]/30 flex items-center justify-center text-[#6b85ff] font-bold text-sm shrink-0">{initial}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#f0f0f5] truncate">{displayName}</p>
            <p className="text-xs text-[#66667a] truncate">{user?.email ?? ""}</p>
          </div>
        </div>
        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#f87171] hover:bg-[#f87171]/10 transition-all duration-150">
          <span className="text-base">→</span>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
