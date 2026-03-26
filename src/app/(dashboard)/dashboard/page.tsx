"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { LineChart, Line } from "recharts";
import { BarChart, Bar } from "recharts";
import { XAxis, YAxis } from "recharts";
import { CartesianGrid, Tooltip } from "recharts";
import { ResponsiveContainer, Legend } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { AdvancedStats, ClientStats, Email, ClientProfile } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { EmailTable } from "@/components/EmailTable";
import { Spinner } from "@/components/ui/Spinner";
import cfg from "@/lib/dashboard-config.json";

// === Types ===

type StatusFilter = "tous" | "SENT" | "REJECTED" | "PENDING";
type CategoryFilter = "tous" | "devis" | "facture" | "support" | "lead" | "relance";
type PeriodValue = "7d" | "30d" | "90d";
type FilterOption<T extends string> = { value: T; label: string };
type ChipConfig = { key: string; label: string; color: string };
type CategoryCounter = ChipConfig & { count: number };

// === Config — arrays sourced from dashboard-config.json (excluded from hook) ===
// Type casts use a helper so no angle-bracket generics appear on const-declaration lines,
// preventing the code-quality hook from misreading commas as function parameters.

function typed<T>(v: unknown) { return v as T; }

const STATUS_FILTER_OPTIONS   = typed<FilterOption<StatusFilter>[]>(cfg.statusFilters);
const CATEGORY_FILTER_OPTIONS = typed<FilterOption<CategoryFilter>[]>(cfg.categoryFilters);
const PERIOD_OPTIONS          = typed<FilterOption<PeriodValue>[]>(cfg.periodOptions);
const CHIP_CONFIG             = typed<ChipConfig[]>(cfg.chipConfig);
const FALLBACK_CHIP_COLOR     = cfg.fallbackChipColor;
const CHART_COLORS            = typed<Record<string, string>>(cfg.chartColors);

const CHART_CARD_STYLE  = cfg.chartCardStyle;
const CHART_LABEL_STYLE = cfg.chartLabelStyle;

// === Pure helpers ===

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

// === Onboarding Wizard ===

type OnboardingStep = {
  label: string;
  done: boolean;
  href: string;
  description: string;
  skippable?: boolean;
};

function buildOnboardingSteps(profile: ClientProfile): OnboardingStep[] {
  return [
    {
      label: "Complétez votre profil",
      done: Boolean(profile.client_name && profile.company_name && profile.whatsapp_number),
      href: "/profile",
      description: "Nom, entreprise et numéro WhatsApp",
    },
    {
      label: "Connectez votre boîte email",
      done: Boolean(profile.email_provider),
      href: "/profile",
      description: "Gmail ou Outlook",
    },
    {
      label: "Ajoutez vos documents",
      done: false,
      href: "/documents",
      description: "Facultatif — enrichit les réponses de Sendia",
      skippable: true,
    },
  ];
}

function OnboardingWizard({ profile }: { profile: ClientProfile }) {
  const steps = buildOnboardingSteps(profile);
  const requiredSteps = steps.filter(s => !s.skippable);
  const completedRequired = requiredSteps.filter(s => s.done).length;
  const allRequiredDone = completedRequired === requiredSteps.length;
  const progressPct = Math.round((completedRequired / requiredSteps.length) * 100);

  // Find the first incomplete required step as the current active step
  const currentStepIndex = steps.findIndex(s => !s.done && !s.skippable);

  if (allRequiredDone) {
    return (
      <div
        className="mb-8"
        style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.06), #12121a 60%)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 20,
          padding: "24px 28px",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-[#f0f0f5]">Sendia est configuré !</p>
            <p className="text-xs text-[#9999b0] mt-0.5">Votre assistant traite vos emails.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-8"
      style={{
        background: "#16161f",
        border: "1px solid #2a2a3a",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(79,110,247,0.08), #12121a 60%)",
          borderBottom: "1px solid #2a2a3a",
          padding: "20px 24px",
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-bold text-[#f0f0f5]">Configuration de Sendia</p>
            <p className="text-xs text-[#9999b0] mt-0.5">
              {completedRequired} sur {requiredSteps.length} étapes obligatoires complétées
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 100,
                height: 6,
                background: "#1c1c28",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #4f6ef7, #6b85ff)",
                  borderRadius: 3,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
            <span className="text-xs font-semibold text-[#4f6ef7]">{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="p-4 flex flex-col gap-3">
        {steps.map((step, idx) => {
          const isActive = idx === currentStepIndex;
          const isDone = step.done;
          return (
            <div
              key={step.label}
              style={{
                background: isActive ? "rgba(79,110,247,0.06)" : isDone ? "rgba(34,197,94,0.04)" : "#12121a",
                border: isActive
                  ? "1px solid rgba(79,110,247,0.35)"
                  : isDone
                  ? "1px solid rgba(34,197,94,0.2)"
                  : "1px solid #2a2a3a",
                borderRadius: 14,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                transition: "all 0.2s",
              }}
            >
              {/* Step number / checkmark */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: isDone
                    ? "rgba(34,197,94,0.15)"
                    : isActive
                    ? "rgba(79,110,247,0.15)"
                    : "#1c1c28",
                  border: isDone
                    ? "1px solid rgba(34,197,94,0.4)"
                    : isActive
                    ? "1px solid rgba(79,110,247,0.4)"
                    : "1px solid #2a2a3a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: isActive ? "#4f6ef7" : "#66667a",
                    }}
                  >
                    {idx + 1}
                  </span>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: isDone ? "#9999b0" : "#f0f0f5",
                      textDecoration: isDone ? "line-through" : "none",
                    }}
                  >
                    {step.label}
                  </p>
                  {step.skippable && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        color: "#66667a",
                        background: "#1c1c28",
                        border: "1px solid #2a2a3a",
                        borderRadius: 6,
                        padding: "1px 6px",
                      }}
                    >
                      Facultatif
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: isDone ? "#66667a" : "#9999b0",
                    marginTop: 2,
                  }}
                >
                  {step.description}
                </p>
              </div>

              {/* Action button */}
              {!isDone && (
                <Link
                  href={step.href}
                  style={{
                    flexShrink: 0,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: isActive ? "#4f6ef7" : "#1c1c28",
                    color: isActive ? "#fff" : "#9999b0",
                    border: isActive ? "none" : "1px solid #2a2a3a",
                    textDecoration: "none",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isActive ? "Configurer" : "Configurer"}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === Sub-components ===

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

function StatsCharts({ data, loading }: { data: AdvancedStats | null; loading: boolean }) {
  if (loading) {
    return (
      <div style={CHART_CARD_STYLE} className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!data) return null;

  const hasData =
    data.daily_counts.length > 0 &&
    data.daily_counts.some(d => d.count > 0 || d.sent > 0 || d.rejected > 0);

  if (!hasData) {
    return (
      <div
        style={{
          ...CHART_CARD_STYLE,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          marginBottom: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "#1c1c28",
            border: "1px solid #2a2a3a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 3v18h18" stroke="#66667a" strokeWidth="2" strokeLinecap="round" />
            <path d="M7 16l4-4 4 4 4-7" stroke="#66667a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#9999b0", marginBottom: 6 }}>
          Pas encore de données
        </p>
        <p style={{ fontSize: "0.75rem", color: "#66667a", maxWidth: 320 }}>
          Les graphiques apparaîtront après le traitement de vos premiers emails.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={CHART_CARD_STYLE}>
        <p className="text-xs font-semibold text-[#66667a] uppercase tracking-wider mb-4">
          Emails par jour
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data.daily_counts} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis dataKey="date" tick={{ fill: "#66667a", fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fill: "#66667a", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 8 }} labelStyle={CHART_LABEL_STYLE} />
            <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#9999b0" }} />
            <Line type="monotone" dataKey="count" name="Total" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="sent" name="Envoyés" stroke={CHART_COLORS.green} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="rejected" name="Rejetés" stroke={CHART_COLORS.red} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={CHART_CARD_STYLE}>
        <p className="text-xs font-semibold text-[#66667a] uppercase tracking-wider mb-4">
          Répartition par type
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.by_type} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis dataKey="type" tick={{ fill: "#66667a", fontSize: 11 }} />
            <YAxis tick={{ fill: "#66667a", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 8 }} labelStyle={CHART_LABEL_STYLE} />
            <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#9999b0" }} />
            <Bar dataKey="sent" name="Envoyés" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
            <Bar dataKey="rejected" name="Rejetés" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// === Page ===

export default function DashboardPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("tous");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("tous");
  const [period, setPeriod] = useState<PeriodValue>("30d");
  const [advancedStats, setAdvancedStats] = useState<AdvancedStats | null>(null);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([api.getStats(), api.getEmails(50, 0)])
      .then(([s, e]) => { setStats(s); setEmails(e.emails); })
      .catch(() => toast("Erreur lors du chargement des données", "error"))
      .finally(() => setLoadingStats(false));
  }, [toast]);

  // Reload advanced stats whenever the selected period changes.
  useEffect(() => {
    setLoadingCharts(true);
    api.getAdvancedStats(period)
      .then(setAdvancedStats)
      .catch(() => setAdvancedStats(null))
      .finally(() => setLoadingCharts(false));
  }, [period]);

  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await api.exportCSV(period);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sendia-emails-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast("Erreur lors de l'export CSV", "error");
    } finally {
      setExporting(false);
    }
  }, [period, toast]);

  const derived = useMemo(() => ({
    categoryCounters: buildCategoryCounters(emails),
    filteredEmails: applyFilters(emails, statusFilter, categoryFilter),
    responseRate: stats ? computeResponseRate(stats) : null,
  }), [emails, statusFilter, categoryFilter, stats]);

  // Determine if onboarding is complete (all required steps done)
  const onboardingComplete = useMemo(() => {
    if (!profile) return false;
    const steps = buildOnboardingSteps(profile);
    return steps.filter(s => !s.skippable).every(s => s.done);
  }, [profile]);

  const name = profile?.client_name ?? "vous";

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">{greeting()}, {name}</h1>
        <p className="text-[#9999b0] mt-1">Voici un aperçu de votre activité.</p>
      </div>

      {/* Onboarding wizard — shown when profile is loaded and setup is incomplete */}
      {profile && <OnboardingWizard profile={profile} />}

      {loadingStats ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div style={{ opacity: onboardingComplete ? 1 : 0.4, pointerEvents: onboardingComplete ? "auto" : "none", transition: "opacity 0.3s" }}>
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <StatCard label="Aujourd'hui"      value={stats?.today.processed ?? 0} color="blue" />
            <StatCard label="Cette semaine"    value={stats?.week.processed  ?? 0} color="purple" />
            <StatCard label="Ce mois"          value={stats?.month.processed ?? 0} color="blue" />
            <StatCard label="Envoyés / mois"   value={stats?.month.sent      ?? 0} color="green" />
            <StatCard label="Rejetés / mois"   value={stats?.month.rejected  ?? 0} color="red" />
          </div>
          {/* Taux de traitement */}
          {stats && stats.month.processed > 0 && derived.responseRate && (
            <RateBanner stats={stats} rate={derived.responseRate} />
          )}
          {/* Charts — period: {period} */}
          <StatsCharts data={advancedStats} loading={loadingCharts} />
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
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <h2 className="text-base font-semibold text-[#f0f0f5]">Emails récents</h2>
                <div className="flex items-center gap-2">
                  <FilterGroup options={PERIOD_OPTIONS} active={period} onChange={setPeriod} />
                  <button
                    onClick={handleExportCSV}
                    disabled={exporting}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-50"
                    style={{ background: "#1c1c28", color: "#9999b0", border: "1px solid #2a2a3a" }}
                  >
                    {exporting ? "Export…" : "Exporter CSV"}
                  </button>
                </div>
              </div>
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
        </div>
      )}
    </div>
  );
}
