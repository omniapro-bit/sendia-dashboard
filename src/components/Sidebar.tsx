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

function navLinkStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 12,
    padding: "11px 12px", borderRadius: 12,
    fontSize: "0.9rem", fontWeight: 500, width: "100%",
    transition: "all 0.2s ease", textDecoration: "none",
    background: active ? "rgba(79,110,247,0.12)" : "transparent",
    color: active ? "#6b85ff" : "#9999b0",
    borderLeft: active ? "2px solid #4f6ef7" : "2px solid transparent",
  };
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  function enter(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!active) { e.currentTarget.style.background = "#16161f"; e.currentTarget.style.color = "#f0f0f5"; }
  }
  function leave(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9999b0"; }
  }
  return (
    <Link href={item.href} style={navLinkStyle(active)} onMouseEnter={enter} onMouseLeave={leave}>
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}><NavIcon d={item.icon} /></span>
      {item.label}
    </Link>
  );
}

function LogoutButton({ onSignOut }: { onSignOut: () => void }) {
  function enter(e: React.MouseEvent<HTMLButtonElement>) {
    e.currentTarget.style.background = "rgba(248,113,113,0.1)";
    e.currentTarget.style.color = "#f87171";
  }
  function leave(e: React.MouseEvent<HTMLButtonElement>) {
    e.currentTarget.style.background = "none";
    e.currentTarget.style.color = "#66667a";
  }
  return (
    <button
      onClick={onSignOut}
      onMouseEnter={enter}
      onMouseLeave={leave}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "none", border: "none", color: "#66667a", fontFamily: "inherit", fontSize: "0.88rem", fontWeight: 500, cursor: "pointer", width: "100%", transition: "all 0.2s" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
      Se déconnecter
    </button>
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
    <aside style={{ width: 240, background: "#12121a", borderRight: "1px solid #2a2a3a", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #2a2a3a" }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <Image src="/logo.png" alt="Sendia" width={44} height={44} className="object-contain" priority />
          <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#f0f0f5", marginLeft: 10, letterSpacing: "-0.3px" }}>Sendia</span>
        </Link>
      </div>
      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
        {onClose && <button onClick={onClose} className="sr-only">Fermer</button>}
      </nav>
      <div style={{ padding: "16px 12px", borderTop: "1px solid #2a2a3a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, marginBottom: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #4f6ef7, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", color: "#fff", flexShrink: 0 }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f0f0f5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</p>
            <p style={{ fontSize: "0.75rem", color: "#66667a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email ?? ""}</p>
          </div>
        </div>
        <LogoutButton onSignOut={handleSignOut} />
      </div>
    </aside>
  );
}
