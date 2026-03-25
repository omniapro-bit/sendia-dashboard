"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { NAV_ITEMS, type NavItem } from "@/components/nav-items";

function resolveDisplayName(clientName: string | undefined, email: string | undefined): string {
  return clientName ?? email?.split("@")[0] ?? "Utilisateur";
}
function checkActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

function NavIcon(props: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={props.d} />
    </svg>
  );
}

function NavLink(props: { item: NavItem; active: boolean }) {
  const { item, active } = props;
  return (
    <Link
      href={item.href}
      className={[
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full transition-all duration-150 no-underline border-l-2",
        active
          ? "bg-[#4f6ef7]/10 text-[#6b85ff] border-[#4f6ef7]"
          : "bg-transparent text-[#9999b0] border-transparent hover:bg-[#1c1c28] hover:text-[#f0f0f5]",
      ].join(" ")}
    >
      <span className={active ? "opacity-100" : "opacity-65"}>
        <NavIcon d={item.icon} />
      </span>
      {item.label}
    </Link>
  );
}

function LogoutButton(props: { onSignOut: () => void }) {
  return (
    <button
      onClick={props.onSignOut}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl w-full text-sm font-medium text-[#66667a] hover:bg-[#f87171]/8 hover:text-[#f87171] transition-all duration-150 border-none bg-transparent cursor-pointer"
      style={{ fontFamily: "inherit" }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
      Se déconnecter
    </button>
  );
}

function UserFooter(props: { displayName: string; email: string; onSignOut: () => void }) {
  const { displayName, email, onSignOut } = props;
  const initial = displayName.charAt(0).toUpperCase();
  return (
    <div style={{ borderTop: "1px solid #2a2a3a", padding: "12px 10px" }}>
      <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
          style={{ background: "linear-gradient(135deg, #4f6ef7, #a78bfa)" }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.82rem] font-semibold text-[#f0f0f5] truncate">{displayName}</p>
          <p className="text-[0.7rem] text-[#66667a] truncate">{email}</p>
        </div>
      </div>
      <LogoutButton onSignOut={onSignOut} />
    </div>
  );
}

export function Sidebar(props: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const displayName = resolveDisplayName(profile?.client_name, user?.email);
  async function handleSignOut() {
    try {
      await signOut();
      router.push("/login");
    } catch {
      toast("Erreur lors de la déconnexion", "error");
    }
  }
  return (
    <aside className="flex flex-col h-full" style={{ width: 240, background: "#12121a", borderRight: "1px solid #2a2a3a" }}>
      <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid #2a2a3a" }}>
        <Link href="/dashboard" className="flex items-center no-underline">
          <Image src="/logo.png" alt="Sendia" width={120} height={36} className="object-contain" priority />
        </Link>
      </div>
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto" style={{ padding: "12px 10px" }}>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.href} item={item} active={checkActive(pathname, item.href)} />
        ))}
        {props.onClose && (
          <button onClick={props.onClose} className="sr-only">Fermer</button>
        )}
      </nav>
      <UserFooter displayName={displayName} email={user?.email ?? ""} onSignOut={handleSignOut} />
    </aside>
  );
}
