"use client";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { ClientStats, Email } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { EmailTable } from "@/components/EmailTable";
import { Spinner } from "@/components/ui/Spinner";
import { Toggle } from "@/components/ui/Toggle";

type StatusFilter = "tous" | "SENT" | "REJECTED" | "PENDING";
type CategoryFilter = "tous" | "devis" | "facture" | "support" | "lead" | "relance";
type FilterOption<T extends string> = { value: T; label: string };

const statusFilters: FilterOption<StatusFilter>[] = [
  { value: "tous", label: "Tous" },
  { value: "SENT", label: "Envoyés" },
  { value: "REJECTED", label: "Rejetés" },
  { value: "PENDING", label: "En attente" },
];

const categoryFilters: FilterOption<CategoryFilter>[] = [
  { value: "tous", label: "Tous" },
  { value: "devis", label: "Devis" },
  { value: "facture", label: "Facture" },
  { value: "support", label: "Support" },
  { value: "lead", label: "Lead" },
  { value: "relance", label: "Relance" },
];

type ChipConfig = { key: string; label: string; color: string };
type CategoryCounter = ChipConfig & { count: number };

const chipConfig: ChipConfig[] = [
  { key: "devis", label: "Devis", color: "#fb923c" },
  { key: "facture", label: "Factures", color: "#a78bfa" },
  { key: "support", label: "Support", color: "#6b85ff" },
  { key: "lead", label: "Lead", color: "#34d399" },
  { key: "relance", label: "Relance", color: "#facc15" },
  { key: "commande", label: "Commande", color: "#2dd4bf" },
  { key: "general", label: "Général", color: "#9999b0" },
  { key: "question", label: "Question", color: "#9999b0" },
  { key: "urgent", label: "Urgent", color: "#f87171" },
  { key: "suivi", label: "Suivi", color: "#9999b0" },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function buildCategoryCounters(emails: Email[]): CategoryCounter[] {
  const counts = new Map<string, number>();
  for (const email of emails) {
    if (email.category) {
      counts.set(email.category, (counts.get(email.category) ?? 0) + 1);
    }
  }
  const result: CategoryCounter[] = [];
  for (const cfg of chipConfig) {
    const count = counts.get(cfg.key) ?? 0;
    if (count > 0) result.push({ ...cfg, count });
  }
  for (const [key, count] of counts.entries()) {
    if (!chipConfig.find(c => c.key === key)) {
      result.push({ key, label: key, count, color: "#9999b0" });
    }
  }
  return result;
}

function computeResponseRate(stats: ClientStats): string {
  const total = stats.month.processed;
  if (total === 0) return "—";
  const handled = stats.month.sent + stats.month.rejected;
  return ((handled / total) * 100).toFixed(0) + "%";
}

function applyFilters(
  emails: Email[],
  status: StatusFilter,
  category: CategoryFilter,
): Email[] {
  return emails.filter(e => {
    const statusOk = status === "tous" || e.status === status;
    const catOk = category === "tous" || e.category === category;
    return statusOk && catOk;
  });
}

function FilterButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const bg = props.active
    ? { background: "#4f6ef7", color: "#fff" }
    : { background: "#1c1c28", color: "#9999b0", border: "1px solid #2a2a3a" };
  return (
    <button onClick={props.onClick} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150" style={bg}>
      {props.children}
    </button>
  );
}

function FilterGroup<T extends string>(props: { options: FilterOption<T>[]; active: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {props.options.map(f => (
        <FilterButton key={f.value} active={props.active === f.value} onClick={() => props.onChange(f.value)}>
          {f.label}
        </FilterButton>
      ))}
    </div>
  );
}

function CategoryChip(props: { counter: CategoryCounter }) {
  const c = props.counter;
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: `${c.color}14`, border: `1px solid ${c.color}30` }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} />
      <span className="text-xs font-semibold" style={{ color: c.color }}>{c.label}</span>
      <span className="text-xs font-bold ml-0.5" style={{ color: c.color }}>{c.count}</span>
    </div>
  );
}

function RateBanner(props: { stats: ClientStats; rate: string }) {
  const { stats, rate } = props;
  const pct = rate !== "—"
    ? Math.min(100, (stats.month.sent + stats.month.rejected) / stats.month.processed * 100)
    : 0;
  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#f0f0f5]">Taux de traitement ce mois</p>
          <p className="text-xs text-[#9999b0] mt-0.5">
            {stats.month.sent + stats.month.rejected} email(s) traités sur {stats.month.processed} reçus
          </p>
          <div className="mt-3 h-2 bg-[#1c1c28] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#34d399] transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-4xl font-extrabold text-[#34d399] leading-none">{rate}</p>
          <p className="text-xs text-[#66667a] mt-1">de traitement</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("tous");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("tous");

  useEffect(() => {
    Promise.all([api.getStats(), api.getEmails(50, 0)])
      .then(([s, e]) => { setStats(s); setEmails(e.emails); })
      .catch(() => toast("Erreur lors du chargement des données", "error"))
      .finally(() => setLoadingStats(false));
  }, [toast]);

  async function handleToggle(val: boolean) {
    setToggling(true);
    try {
      await api.toggleActive(val);
      await refreshProfile();
      toast(val ? "Sendia activé !" : "Sendia désactivé.", "success");
    } catch {
      toast("Erreur lors du changement de statut", "error");
    } finally {
      setToggling(false);
    }
  }

  const derived = useMemo(() => ({
    categoryCounters: buildCategoryCounters(emails),
    filteredEmails: applyFilters(emails, statusFilter, categoryFilter),
    responseRate: stats ? computeResponseRate(stats) : null,
  }), [emails, statusFilter, categoryFilter, stats]);

  const name = profile?.client_name ?? "vous";

  return (
    <div className="px-4 md:px-8 py-8 w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">{greeting()}, {name} 👋</h1>
        <p className="text-[#9999b0] mt-1">Voici un aperçu de votre activité.</p>
      </div>

      {/* Sendia status toggle */}
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-[#f0f0f5]">Statut Sendia</p>
          <p className={`text-xs mt-0.5 ${profile?.is_active ? "text-emerald-400" : "text-[#66667a]"}`}>
            {profile?.is_active
              ? "Actif — votre assistant traite vos emails"
              : "Inactif — aucun email ne sera traité"}
          </p>
        </div>
        <Toggle
          checked={profile?.is_active ?? false}
          onChange={handleToggle}
          disabled={toggling}
          label={profile?.is_active ? "Actif" : "Inactif"}
        />
      </div>

      {loadingStats ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Volume stats row */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <StatCard label="Aujourd’hui" value={stats?.today.processed ?? 0} color="blue" />
            <StatCard label="Cette semaine" value={stats?.week.processed ?? 0} color="purple" />
            <StatCard label="Ce mois" value={stats?.month.processed ?? 0} color="blue" />
          </div>

          {/* Performance row: sent, rejected, category breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Envoyés / mois" value={stats?.month.sent ?? 0} color="green" />
            <StatCard label="Rejetés / mois" value={stats?.month.rejected ?? 0} color="red" />
            {derived.categoryCounters.length > 0 && (
              <div className="relative overflow-hidden card-hover" style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: 20, padding: "20px 22px 22px" }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#66667a", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12 }}>
                  Répartition
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {derived.categoryCounters.map(counter => (
                    <CategoryChip key={counter.key} counter={counter} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Response rate banner */}
          {stats && derived.responseRate && (
            <RateBanner stats={stats} rate={derived.responseRate} />
          )}

          {/* Email table with filters */}
          <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl mb-6">
            <div className="px-6 py-4 border-b border-[#2a2a3a]">
              <h2 className="text-base font-semibold text-[#f0f0f5] mb-3">Emails récents</h2>
              <div className="flex flex-wrap gap-3">
                <FilterGroup options={statusFilters} active={statusFilter} onChange={setStatusFilter} />
                <div className="w-px bg-[#2a2a3a] self-stretch hidden sm:block" />
                <FilterGroup options={categoryFilters} active={categoryFilter} onChange={setCategoryFilter} />
              </div>
            </div>
            <div className="px-2">
              <EmailTable emails={derived.filteredEmails} />
            </div>
            {derived.filteredEmails.length === 0 && emails.length > 0 && (
              <p className="text-center text-sm text-[#66667a] pb-6">
                Aucun email ne correspond aux filtres sélectionnés.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
