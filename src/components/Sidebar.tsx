"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { NAV_ITEMS, type NavItem } from "@/components/nav-items";
function NavIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const base = "flex items-center gap-3 px-3 py-[11px] rounded-xl text-[0.9rem] font-medium w-full transition-all duration-150";
  const cls = active
    ? `${base} text-[#6b85ff]`
    : `${base} text-[#9999b0] hover:text-[#f0f0f5]`;
  const style = active ? { background: "rgba(79,110,247,0.15)" } : undefined;
  return (
    <Link href={item.href} className={cls} style={style}>
      <span className="shrink-0 opacity-80"><NavIcon d={item.icon} /></span>
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
    catch { toast("Erreur lors de la deconnexion", "error"); }
  }
  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }
  return (
    <aside className="flex flex-col h-full" style={{ width: 240, background: "#12121a", borderRight: "1px solid #2a2a3a" }}>
      <div className="px-5 py-6" style={{ borderBottom: "1px solid #2a2a3a" }}>
        <Link href="/dashboard" className="flex items-center no-underline">
          <Image src="/logo.png" alt="Sendia" width={130} height={40} className="object-contain" />
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
        {onClose && <button onClick={onClose} className="sr-only">Fermer</button>}
      </nav>
      <div className="px-3 py-4" style={{ borderTop: "1px solid #2a2a3a" }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2">
          <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white font-bold text-[0.85rem] shrink-0"
            style={{ background: "linear-gradient(135deg, #4f6ef7, #a78bfa)" }}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.85rem] font-semibold text-[#f0f0f5] truncate">{displayName}</p>
            <p className="text-[0.75rem] text-[#66667a] truncate">{user?.email ?? ""}</p>
          </div>
        </div>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.88rem] font-medium text-[#66667a] transition-all duration-150 hover:text-[#f87171]"
          style={{ background: "none", border: "none" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.1)")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Se deconnecter
        </button>
      </div>
    </aside>
  );
}
