"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { ClientStats, Email } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { EmailTable } from "@/components/EmailTable";
import { Spinner } from "@/components/ui/Spinner";
import { Toggle } from "@/components/ui/Toggle";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type StatusFilter = "tous" | "SENT" | "REJECTED" | "PENDING";
type CategoryFilter = "tous" | "devis" | "facture" | "support" | "lead" | "relance";

type FilterOption<T extends string> = { value: T; label: string };

const STATUS_FILTER_OPTIONS: FilterOption<StatusFilter>[] = [
  { value: "tous",     label: "Tous" },
  { value: "SENT",     label: "Envoyés" },
  { value: "REJECTED", label: "Rejetés" },
  { value: "PENDING",  label: "En attente" },
];
const CATEGORY_FILTER_OPTIONS: FilterOption<CategoryFilter>[] = [
  { value: "tous",    label: "Tous" },
  { value: "devis",   label: "Devis" },
  { value: "facture", label: "Facture" },
  { value: "support", label: "Support" },
  { value: "lead",    label: "Lead" },
  { value: "relance", label: "Relance" },
];

type ChipConfig = { key: string; label: string; color: string };
type CategoryCounter = ChipConfig & { count: number };

const FALLBACK_CHIP_COLOR = "#9999b0";
const CHIP_CONFIG: ChipConfig[] = [
    { key: "devis",    label: "Devis",    color: "#fb923c" },
    { key: "facture",  label: "Factures", color: "#a78bfa" },
    { key: "support",  label: "Support",  color: "#6b85ff" },
    { key: "lead",     label: "Lead",     color: "#34d399" },
    { key: "relance",  label: "Relance",  color: "#facc15" },
    { key: "commande", label: "Commande", color: "#2dd4bf" },
    { key: "general",  label: "Général",  color: "#9999b0" },
    { key: "question", label: "Question", color: "#9999b0" },
    { key: "urgent",   label: "Urgent",   color: "#f87171" },
    { key: "suivi",    label: "Suivi",    color: "#9999b0" },
];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

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
  for (const cfg of CHIP_CONFIG) {
    const count = counts.get(cfg.key) ?? 0;
    if (count > 0) result.push({ ...cfg, count });
  }
  for (const [key, count] of counts.entries()) {
    if (!CHIP_CONFIG.find(c => c.key === key)) {
      result.push({ key, label: key, count, color: FALLBACK_CHIP_COLOR });
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
  statusFilter: StatusFilter,
  categoryFilter: CategoryFilter,
): Email[] {
  return emails.filter(e => {
    const statusOk = statusFilter === "tous" || e.status === statusFilter;
    const catOk = categoryFilter === "tous" || e.category === categoryFilter;
    return statusOk && catOk;
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const style = active
    ? { background: "#4f6ef7", color: "#fff" }
    : { background: "#1c1c28", color: "#9999b0", border: "1px solid #2a2a3a" };
  return (
    <button
      onClick={onClick}
      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
      style={style}
    >
      {children}
    </button>
  );
}

function FilterGroup<T extends string>({
  options,
  active,
  onChange,
}: {
  options: FilterOption<T>[];
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(f => (
        <FilterButton key={f.value} active={active === f.value} onClick={() => onChange(f.value)}>
          {f.label}
        </FilterButton>
      ))}
    </div>
  );
}

function CategoryChip({ counter }: { counter: CategoryCounter }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{
        background: `${counter.color}14`,
        border: `1px solid ${counter.color}30`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: counter.color }} />
      <span className="text-xs font-semibold" style={{ color: counter.color }}>
        {counter.label}
      </span>
      <span className="text-xs font-bold ml-0.5" style={{ color: counter.color }}>
        {counter.count}
      </span>
    </div>
  );
}

function RateBanner({ stats, rate }: { stats: ClientStats; rate: string }) {
  const pct = rate !== "—"
    ? Math.min(100, (stats.month.sent + stats.month.rejected) / stats.month.processed * 100)
    : 0;
  return (
    <div style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.04), #16161f 50%)", border: "1px solid #2a2a3a", borderRadius: 16, padding: "20px 24px", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f0f0f5" }}>Taux de traitement</p>
          <p style={{ fontSize: "0.75rem", color: "#66667a", marginTop: 2 }}>
            {stats.month.sent + stats.month.rejected} traités sur {stats.month.processed} reçus
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 120, height: 6, background: "#1c1c28", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #34d399, #6ee7b7)", borderRadius: 3, transition: "width 0.5s" }} />
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#34d399", lineHeight: 1 }}>{rate}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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
      toast(val ? "Sendia activé !" : "Sendia désactivé.", "success");
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
    <div className="px-6 py-8">
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
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <StatCard label="Aujourd'hui"      value={stats?.today.processed ?? 0} color="blue" />
            <StatCard label="Cette semaine"    value={stats?.week.processed  ?? 0} color="purple" />
            <StatCard label="Ce mois"          value={stats?.month.processed ?? 0} color="blue" />
            <StatCard label="Envoyés / mois"   value={stats?.month.sent      ?? 0} color="green" />
            <StatCard label="Rejetés / mois"   value={stats?.month.rejected  ?? 0} color="red" />
          </div>

          {/* Taux de traitement detail banner */}
          {stats && stats.month.processed > 0 && derived.responseRate && (
            <RateBanner stats={stats} rate={derived.responseRate} />
          )}

          {/* Category counters */}
          {derived.categoryCounters.length > 0 && (
            <div style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: 16, padding: "16px 20px", marginBottom: 24 }}>
              <p className="text-xs font-semibold text-[#66667a] uppercase tracking-wider mb-3">
                Répartition par catégorie
              </p>
              <div className="flex flex-wrap gap-2">
                {derived.categoryCounters.map(counter => (
                  <CategoryChip key={counter.key} counter={counter} />
                ))}
              </div>
            </div>
          )}

          {/* Email table with filters */}
          <div style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: 16, marginBottom: 24, overflow: "hidden" }}>
            <div className="px-6 py-4 border-b border-[#2a2a3a]">
              <h2 className="text-base font-semibold text-[#f0f0f5] mb-3">Emails récents</h2>
              <div className="flex flex-wrap items-center gap-4">
                <FilterGroup
                  options={STATUS_FILTER_OPTIONS}
                  active={statusFilter}
                  onChange={setStatusFilter}
                />
                <div className="w-px bg-[#2a2a3a] self-stretch hidden sm:block" />
                <FilterGroup
                  options={CATEGORY_FILTER_OPTIONS}
                  active={categoryFilter}
                  onChange={setCategoryFilter}
                />
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

          {/* Quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: "/documents", label: "Mes documents",  desc: `${stats?.rag_documents ?? 0} document(s)` },
              { href: "/profile",   label: "Mon profil",     desc: "Personnaliser Sendia" },
              { href: "/settings",  label: "Paramètres",     desc: "Compte & sécurité" },
            ].map(a => (
              <Link
                key={a.href}
                href={a.href}
                className="group" style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: 16, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4, transition: "border-color 0.2s", textDecoration: "none" }} onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(79,110,247,0.4)"} onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a3a"}
              >
                <p className="font-semibold text-[#f0f0f5] group-hover:text-[#6b85ff] transition-colors">
                  {a.label}
                </p>
                <p className="text-xs text-[#66667a]">{a.desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
