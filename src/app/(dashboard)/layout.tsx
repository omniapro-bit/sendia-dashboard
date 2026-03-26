"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.email_confirmed_at) {
      router.replace(
        user.email
          ? `/verify-email?email=${encodeURIComponent(user.email)}`
          : "/verify-email"
      );
      return;
    }
    // Check trial expiration — redirect to billing if expired (but not if already on billing)
    if (pathname !== "/billing") {
      api.getBillingStatus().then((s: any) => {
        if (s?.status === "expired" || s?.status === "canceled") {
          router.replace("/billing");
        }
      }).catch(() => {});
    }
  }, [user, loading, router, pathname]);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!user || !user.email_confirmed_at) return null;
  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <div className="hidden md:flex md:shrink-0">
        <Sidebar />
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#12121a] border-b border-[#2a2a3a]">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-[#9999b0] hover:text-[#f0f0f5] hover:bg-[#1c1c28] transition-colors" aria-label="Ouvrir le menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-[#f0f0f5]">Sendia</span>
        </header>
        <main className="flex-1 overflow-y-auto relative z-10">
          <div className="max-w-[1100px] mx-auto w-full">
          {children}
          </div>
        </main>
      </div>
    </div>
  );
}
