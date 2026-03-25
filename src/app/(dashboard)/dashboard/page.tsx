"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { ClientStats, Email } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { EmailTable } from "@/components/EmailTable";
import { Spinner } from "@/components/ui/Spinner";
import { Toggle } from "@/components/ui/Toggle";
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}
export default function DashboardPage() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [toggling, setToggling] = useState(false);
  useEffect(() => {
    Promise.all([api.getStats(), api.getEmails(8, 0)])
      .then(([s, e]) => { setStats(s); setEmails(e.emails); })
      .catch(() => toast("Erreur lors du chargement des données", "error"))
      .finally(() => setLoadingStats(false));
  }, [toast]);
  async function handleToggle(val: boolean) {
    setToggling(true);
    try {
      await api.toggleActive(val);
      await refreshProfile();
      toast(val ? "Sendia activé !" : "Sendia désactivé.", "success");
    } catch { toast("Erreur lors du changement de statut", "error"); }
    finally { setToggling(false); }
  }
  const name = profile?.client_name ?? "vous";
  return (
    <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">{greeting()}, {name} 👋</h1>
        <p className="text-[#9999b0] mt-1">Voici un aperçu de votre activité.</p>
      </div>
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-[#f0f0f5]">Statut Sendia</p>
          <p className={`text-xs mt-0.5 ${profile?.is_active ? "text-emerald-400" : "text-[#66667a]"}`}>
            {profile?.is_active ? "Actif — votre assistant traite vos emails" : "Inactif — aucun email ne sera traité"}
          </p>
        </div>
        <Toggle checked={profile?.is_active ?? false} onChange={handleToggle} disabled={toggling} label={profile?.is_active ? "Actif" : "Inactif"} />
      </div>
      {loadingStats ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="Aujourd'hui" value={stats?.today.processed ?? 0} color="blue" />
            <StatCard label="Cette semaine" value={stats?.week.processed ?? 0} color="purple" />
            <StatCard label="Ce mois" value={stats?.month.processed ?? 0} color="blue" />
            <StatCard label="Envoyés / mois" value={stats?.month.sent ?? 0} color="green" />
            <StatCard label="Rejetés / mois" value={stats?.month.rejected ?? 0} color="red" />
          </div>
          <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl mb-6">
            <div className="px-6 py-4 border-b border-[#2a2a3a]">
              <h2 className="text-base font-semibold text-[#f0f0f5]">Emails récents</h2>
            </div>
            <div className="px-2">
              <EmailTable emails={emails} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[{ href: "/documents", label: "Mes documents", desc: `${stats?.rag_documents ?? 0} document(s)` }, { href: "/profile", label: "Mon profil", desc: "Personnaliser Sendia" }, { href: "/settings", label: "Paramètres", desc: "Compte & sécurité" }].map(a => (
              <Link key={a.href} href={a.href} className="bg-[#16161f] border border-[#2a2a3a] hover:border-[#4f6ef7]/40 rounded-2xl p-4 flex flex-col gap-1 transition-colors group">
                <p className="font-semibold text-[#f0f0f5] group-hover:text-[#6b85ff] transition-colors">{a.label}</p>
                <p className="text-xs text-[#66667a]">{a.desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
