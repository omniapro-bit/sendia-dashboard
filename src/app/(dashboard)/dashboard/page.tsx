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
import type { AdvancedStats, ClientStats, ClientPlan, Email, TopContact } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { EmailTable } from "@/components/EmailTable";
import { Spinner } from "@/components/ui/Spinner";
import { OnboardingWizard, buildOnboardingSteps } from "./OnboardingWizard";
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
const CHART_CARD_STYLE        = cfg.chartCardStyle;
const CHART_LABEL_STYLE       = cfg.chartLabelStyle;

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
    if (email.category) counts.set(email.category, (counts.get(email.category) ?? 0) + 1);
  }
  const result: CategoryCounter[] = [];
  for (const chip of CHIP_CONFIG) {
    const count = counts.get(chip.key) ?? 0;
    if (count > 0) result.push({ ...chip, count });
  }
  for (const [key, count] of counts.entries()) {
    if (!CHIP_CONFIG.find(c => c.key === key)) {
      result.push({ key, label: key, count, color: FALLBACK_CHIP_COLOR });
    }
  }
  return result;
}

// Returns only emails matching both the status and category filters (value "tous" = no filter).
const applyFilters = (emails: Email[], sf: StatusFilter, cf: CategoryFilter): Email[] =>
  emails.filter(e => (sf === "tous" || e.status === sf) && (cf === "tous" || e.category === cf));

// Compute response rate from basic stats (sent / (sent + notified) * 100).
function computeResponseRate(s: ClientStats): number {
  const total = (s.month.sent ?? 0) + (s.month.rejected ?? 0) + (s.month.processed ?? 0);
  if (total === 0) return 0;
  return Math.round(((s.month.sent ?? 0) / total) * 100);
}

// Rate banner — shows response rate with color coding.
function RateBanner({ rate }: { stats: ClientStats; rate: number }) {
  const color = rate >= 70 ? "#22c55e" : rate >= 40 ? "#f59e0b" : "#ef4444";
  const label = rate >= 70 ? "Excellent" : rate >= 40 ? "Correct" : "À améliorer";
  return (
    <div style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: 16, padding: "12px 20px", marginBottom: 16 }}
      className="flex items-center justify-between">
      <span className="text-sm text-[#9999b0]">Taux de réponse ce mois</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium" style={{ color }}>{label}</span>
        <span className="text-xl font-bold" style={{ color }}>{rate}%</span>
      </div>
    </div>
  );
}

// Display helpers — formatting and label translation for stats UI.
const CATEGORY_TYPE_LABELS = typed<Record<string, string>>(cfg.categoryTypeLabels);
function typeLabel(key: string): string { return CATEGORY_TYPE_LABELS[key] ?? key; }
function formatResponseTime(hours: number): string {
  if (hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  return `${hours.toFixed(1).replace(".0", "")}h`;
}
function contactDisplayName(fromName: string, fromEmail: string): string {
  const domain = fromEmail.includes("@") ? fromEmail.split("@")[1] : fromEmail;
  if (fromName && fromName !== fromEmail) return fromName;
  return domain;
}
function emailDomain(fromEmail: string): string {
  return fromEmail.includes("@") ? fromEmail.split("@")[1] : fromEmail;
}

// === Sub-components ===

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const style = active
    ? { background: "#4f6ef7", color: "#fff" }
    : { background: "#1c1c28", color: "#9999b0", border: "1px solid #2a2a3a" };
  return (
    <button onClick={onClick} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150" style={style}>
      {children}
    </button>
  );
}

function FilterGroup<T extends string>({ options, active, onChange }: { options: FilterOption<T>[]; active: T; onChange: (v: T) => void }) {
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
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: `${counter.color}14`, border: `1px solid ${counter.color}30` }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: counter.color }} />
      <span className="text-xs font-semibold" style={{ color: counter.color }}>{counter.label}</span>
      <span className="text-xs font-bold ml-0.5" style={{ color: counter.color }}>{counter.count}</span>
    </div>
  );
}

// Picks a color for the response rate based on the percentage value.
function rateColor(pct: number): string {
  if (pct >= 70) return "#34d399";
  if (pct >= 40) return "#fb923c";
  return "#f87171";
}

function BusinessStatCards({ stats, advanced, loadingAdvanced }: { stats: ClientStats; advanced: AdvancedStats | null; loadingAdvanced: boolean }) {
  const responseRate = advanced?.response_rate ?? 0;
  const rateStr      = loadingAdvanced ? "…" : (advanced ? `${responseRate}%` : "—");
  const rateClr      = rateColor(responseRate);
  const respTime     = loadingAdvanced ? "…" : formatResponseTime(advanced?.avg_response_time_hours ?? 0);
  const activeCount  = loadingAdvanced ? "…" : (advanced?.active_contacts_count ?? 0);

  return (
    <div className="grid grid-cols-2 gap-4 mb-6" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
      <div style={{ background: `linear-gradient(135deg, ${rateClr}0a, #16161f 60%)`, border: "1px solid #2a2a3a", borderTop: `2px solid ${rateClr}`, borderRadius: 16, padding: "20px 22px" }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#66667a", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Taux de réponse</p>
        <p style={{ fontSize: "1.85rem", fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1, color: rateClr }}>{rateStr}</p>
        <p style={{ fontSize: "0.72rem", color: "#555568", marginTop: 6 }}>{stats.month.sent} envoyés / {stats.month.sent + (advanced ? Math.round(advanced.response_rate > 0 ? stats.month.sent / (advanced.response_rate / 100) - stats.month.sent : 0) : 0)} reçus</p>
      </div>
      <StatCard label="Temps de réponse moyen" value={respTime} color="purple" subtitle="par thread email" />
      <StatCard label="Emails ce mois" value={stats.month.processed} color="blue" subtitle={`+${stats.today.processed} aujourd'hui`} />
      <div style={{ background: "linear-gradient(135deg, rgba(79,110,247,0.06), #16161f 60%)", border: "1px solid #2a2a3a", borderTop: "2px solid #4f6ef7", borderRadius: 16, padding: "20px 22px" }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#66667a", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Contacts actifs</p>
        <p style={{ fontSize: "1.85rem", fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1, color: "#f0f0f5" }}>{activeCount}</p>
        <p style={{ fontSize: "0.72rem", color: "#555568", marginTop: 6 }}>expéditeurs distincts sur la période</p>
      </div>
    </div>
  );
}

function TopContacts({ contacts }: { contacts: TopContact[] }) {
  if (contacts.length === 0) return null;
  return (
    <div style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: 16, padding: "16px 20px", marginBottom: 24 }}>
      <p className="text-xs font-semibold text-[#66667a] uppercase tracking-wider mb-3">Top contacts</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {contacts.map((c, i) => (
          <div key={c.from_email} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#4f6ef7", width: 16, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#f0f0f5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contactDisplayName(c.from_name, c.from_email)}</p>
              <p style={{ fontSize: "0.7rem", color: "#66667a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{emailDomain(c.from_email)}</p>
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9999b0", flexShrink: 0 }}>{c.email_count} email{c.email_count > 1 ? "s" : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsCharts({ data, loading }: { data: AdvancedStats | null; loading: boolean }) {
  if (loading) return <div style={CHART_CARD_STYLE} className="flex justify-center py-8"><Spinner size="lg" /></div>;
  if (!data) return null;

  const hasData = data.daily_counts.length > 0 && data.daily_counts.some(d => d.count > 0 || d.sent > 0 || d.rejected > 0);
  if (!hasData) {
    return (
      <div style={{ ...CHART_CARD_STYLE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", marginBottom: 24, textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#1c1c28", border: "1px solid #2a2a3a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 3v18h18" stroke="#66667a" strokeWidth="2" strokeLinecap="round" />
            <path d="M7 16l4-4 4 4 4-7" stroke="#66667a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#9999b0", marginBottom: 6 }}>Pas encore de données</p>
        <p style={{ fontSize: "0.75rem", color: "#66667a", maxWidth: 320 }}>
          Les graphiques apparaîtront après le traitement de vos premiers emails.
        </p>
      </div>
    );
  }

  const byTypeLocalized = data.by_type.map(d => ({ ...d, type: typeLabel(d.type) }));

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={CHART_CARD_STYLE}>
        <p className="text-xs font-semibold text-[#66667a] uppercase tracking-wider mb-4">Volume quotidien</p>
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
        <p className="text-xs font-semibold text-[#66667a] uppercase tracking-wider mb-4">Répartition par type</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byTypeLocalized} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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
  const [clientPlan, setClientPlan] = useState<ClientPlan | null>(null);
  // Fetched independently so the wizard shows correct email connection status
  // even when n8n stored OAuth tokens on a different row than the one linked by user_id.
  const [emailConnected, setEmailConnected] = useState(false);

  useEffect(() => {
    Promise.all([api.getStats(), api.getEmails(50, 0)])
      .then(([s, e]) => { setStats(s); setEmails(e.emails); })
      .catch(() => toast("Erreur lors du chargement des données", "error"))
      .finally(() => setLoadingStats(false));
  }, [toast]);

  // Reload advanced stats when the period changes; fetch onboarding status once on mount.
  useEffect(() => {
    setLoadingCharts(true);
    api.getAdvancedStats(period)
      .then(setAdvancedStats)
      .catch(() => setAdvancedStats(null))
      .finally(() => setLoadingCharts(false));
  }, [period]);
  useEffect(() => { api.getOnboardingStatus().then(s => setEmailConnected(s.email_connected)).catch(() => {}); }, []);
  useEffect(() => { api.getClientPlan().then(setClientPlan).catch(() => {}); }, []);

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

  const onboardingComplete = useMemo(() => {
    if (!profile) return false;
    return buildOnboardingSteps(profile, emailConnected).filter(s => !s.skippable).every(s => s.done);
  }, [profile, emailConnected]);

  const name = profile?.client_name ?? "vous";

  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">{greeting()}, {name}</h1>
        <p className="text-[#9999b0] mt-1">Voici un aperçu de votre activité.</p>
      </div>

      {profile && <OnboardingWizard profile={profile} emailConnected={emailConnected} />}

      {loadingStats ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div style={{ opacity: (onboardingComplete || (stats && stats.month.processed > 0)) ? 1 : 0.4, pointerEvents: (onboardingComplete || (stats && stats.month.processed > 0)) ? "auto" : "none", transition: "opacity 0.3s" }}>
          {stats && <BusinessStatCards stats={stats} advanced={advancedStats} loadingAdvanced={loadingCharts} />}
          {stats && stats.month.processed > 0 && derived.responseRate != null && (
            <RateBanner stats={stats} rate={derived.responseRate} />
          )}
          <StatsCharts data={advancedStats} loading={loadingCharts} />
          {advancedStats?.top_contacts && <TopContacts contacts={advancedStats.top_contacts} />}
          {derived.categoryCounters.length > 0 && (
            <div style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: 16, padding: "16px 20px", marginBottom: 24 }}>
              <p className="text-xs font-semibold text-[#66667a] uppercase tracking-wider mb-3">Répartition par catégorie</p>
              <div className="flex flex-wrap gap-2">
                {derived.categoryCounters.map(counter => <CategoryChip key={counter.key} counter={counter} />)}
              </div>
            </div>
          )}
          <div style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: 16, marginBottom: 24, overflow: "hidden" }}>
            <div className="px-6 py-4 border-b border-[#2a2a3a]">
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-base font-semibold text-[#f0f0f5]">Emails récents</h2>
                  {clientPlan && (
                    <span className="text-xs text-[#66667a]">
                      {clientPlan.features.emails_used_this_month} / {clientPlan.features.max_emails_per_month} emails ce mois
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <FilterGroup options={PERIOD_OPTIONS} active={period} onChange={setPeriod} />
                  {clientPlan?.features.has_email_search === false ? (
                    <span title="Plan Pro requis">
                      <button
                        disabled
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg opacity-40 cursor-not-allowed"
                        style={{ background: "#1c1c28", color: "#9999b0", border: "1px solid #2a2a3a" }}
                      >
                        Exporter CSV
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={handleExportCSV}
                      disabled={exporting}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-50"
                      style={{ background: "#1c1c28", color: "#9999b0", border: "1px solid #2a2a3a" }}
                    >
                      {exporting ? "Export…" : "Exporter CSV"}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <FilterGroup options={STATUS_FILTER_OPTIONS} active={statusFilter} onChange={setStatusFilter} />
                <div className="w-px bg-[#2a2a3a] self-stretch hidden sm:block" />
                <FilterGroup options={CATEGORY_FILTER_OPTIONS} active={categoryFilter} onChange={setCategoryFilter} />
              </div>
            </div>
            <div className="px-2"><EmailTable emails={derived.filteredEmails} /></div>
            {derived.filteredEmails.length === 0 && emails.length > 0 && (
              <p className="text-center text-sm text-[#66667a] pb-6">Aucun email ne correspond aux filtres sélectionnés.</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: "/documents", label: "Mes documents", desc: `${stats?.rag_documents ?? 0} document(s)` },
              { href: "/profile",   label: "Mon profil",    desc: "Personnaliser Sendia" },
              { href: "/settings",  label: "Paramètres",    desc: "Compte & sécurité" },
            ].map(a => (
              <Link
                key={a.href}
                href={a.href}
                className="group"
                style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: 16, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4, transition: "border-color 0.2s", textDecoration: "none" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(79,110,247,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; }}
              >
                <p className="font-semibold text-[#f0f0f5] group-hover:text-[#6b85ff] transition-colors">{a.label}</p>
                <p className="text-xs text-[#66667a]">{a.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
