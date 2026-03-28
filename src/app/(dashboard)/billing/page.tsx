"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { BillingStatus } from "@/lib/types";
import { Spinner } from "@/components/ui/Spinner";
import PLANS from "./plan-data.json";

// Plan shape (mirrors plan-data.json)
type Plan = {
  id: string;
  name: string;
  price: number;
  popular: boolean;
  contact?: boolean;
  features: string[];
};

const plans = PLANS as Plan[];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysLeft(isoDate: string | null): number {
  if (!isoDate) return 0;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Atoms — badge colors and styles
// ---------------------------------------------------------------------------
type BadgeColor = "green" | "amber" | "red";

const BADGE_STYLES: Record<BadgeColor, { bg: string; border: string; text: string }> = {
  green: { bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)",  text: "#34d399" },
  amber: { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)",  text: "#fbbf24" },
  red:   { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)", text: "#f87171" },
};

function StatusBadge({ label, color }: { label: string; color: BadgeColor }) {
  const s = BADGE_STYLES[color];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      {label}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Plan card
// ---------------------------------------------------------------------------

function PlanCard({ plan, onSelect, loading }: {
  plan: Plan;
  onSelect: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="relative flex flex-col rounded-2xl p-6 transition-all duration-200"
      style={{
        background: plan.popular ? "rgba(79,110,247,0.06)" : "#12121a",
        border: plan.popular ? "1.5px solid rgba(79,110,247,0.5)" : "1px solid #2a2a3a",
      }}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: "#4f6ef7", color: "#fff" }}>
            Populaire
          </span>
        </div>
      )}
      <p className="text-base font-bold text-[#f0f0f5]">{plan.name}</p>
      <div className="mt-2 mb-4 flex items-baseline gap-1">
        {plan.price === -1 ? (
          <span className="text-2xl font-extrabold text-[#f0f0f5]">Sur devis</span>
        ) : (
          <>
            <span className="text-3xl font-extrabold text-[#f0f0f5]">{plan.price}€</span>
            <span className="text-sm text-[#66667a]">/mois</span>
          </>
        )}
      </div>
      <ul className="flex-1 space-y-2.5 mb-6">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-[#9999b0]">
            <span style={{ color: "#4f6ef7", marginTop: 1 }}><CheckIcon /></span>
            {f}
          </li>
        ))}
      </ul>
      {plan.contact ? (
        <a
          href="mailto:contact@getsendia.com?subject=Sendia Enterprise"
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 text-center block"
          style={{ background: "#1c1c28", color: "#f0f0f5", border: "1px solid #2a2a3a", textDecoration: "none" }}
        >
          Nous contacter
        </a>
      ) : (
        <button
          onClick={onSelect}
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50"
          style={plan.popular
            ? { background: "#4f6ef7", color: "#fff" }
            : { background: "#1c1c28", color: "#f0f0f5", border: "1px solid #2a2a3a" }}
        >
          {loading ? "Chargement..." : "Choisir ce plan"}
        </button>
      )}
    </div>
  );
}

function PricingGrid({ onSelect, loadingPlan }: {
  onSelect: (id: string) => void;
  loadingPlan: string | null;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-6">
      {plans.map(plan => (
        <PlanCard key={plan.id} plan={plan}
          onSelect={() => onSelect(plan.id)}
          loading={loadingPlan === plan.id} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// State views
// ---------------------------------------------------------------------------

function TrialView({ status, onSelect, loadingPlan }: {
  status: BillingStatus;
  onSelect: (id: string) => void;
  loadingPlan: string | null;
}) {
  const days = daysLeft(status.trial_ends_at);
  return (
    <>
      <div className="bg-[#12121a] border border-[#2a2a3a] rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#66667a] mb-1">Plan actuel</p>
          <p className="text-lg font-bold text-[#f0f0f5]">Essai gratuit</p>
          {/* Email usage counter disabled for now */}
        </div>
        <StatusBadge label={`Essai — ${days}j restants`} color={days <= 3 ? "red" : "amber"} />
      </div>
      <div className="mt-8">
        <h2 className="text-base font-semibold text-[#f0f0f5]">Choisir un plan</h2>
        <p className="text-sm text-[#9999b0] mt-1">Continuez à utiliser Sendia sans interruption.</p>
        <PricingGrid onSelect={onSelect} loadingPlan={loadingPlan} />
      </div>
    </>
  );
}

function ActiveView({ status, onPortal, loadingPortal }: {
  status: BillingStatus;
  onPortal: () => void;
  loadingPortal: boolean;
}) {
  const usagePercent = status.emails_limit
    ? Math.min(100, Math.round((status.emails_used_this_month / status.emails_limit) * 100))
    : 0;
  return (
    <>
      <div className="bg-[#12121a] border border-[#2a2a3a] rounded-2xl p-6 flex flex-wrap gap-6 items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#66667a] mb-1">Plan actuel</p>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-lg font-bold text-[#f0f0f5] capitalize">{status.plan ?? "—"}</p>
            <StatusBadge label="Actif" color="green" />
          </div>
          {status.current_period_end && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#66667a] mb-1">Prochain renouvellement</p>
              <p className="text-sm text-[#9999b0]">{formatDate(status.current_period_end)}</p>
            </div>
          )}
        </div>
        <button onClick={onPortal} disabled={loadingPortal}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50"
          style={{ background: "#1c1c28", color: "#f0f0f5", border: "1px solid #2a2a3a" }}>
          {loadingPortal ? "Chargement…" : "Gérer mon abonnement"}
        </button>
      </div>
      {/* Email usage section disabled for now */}
    </>
  );
}

function ExpiredView({ onSelect, loadingPlan }: {
  onSelect: (id: string) => void;
  loadingPlan: string | null;
}) {
  return (
    <>
      <div className="rounded-2xl p-5 flex items-start gap-3"
        style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
        <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-red-400">Votre accès est suspendu</p>
          <p className="text-xs text-[#9999b0] mt-1">
            Votre essai a expiré ou votre abonnement a été annulé. Choisissez un plan pour réactiver Sendia.
          </p>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-base font-semibold text-[#f0f0f5]">Choisir un plan</h2>
        <PricingGrid onSelect={onSelect} loadingPlan={loadingPlan} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page — billing status drives which view is rendered
// ---------------------------------------------------------------------------

function emptyStatus(): BillingStatus {
  const s: BillingStatus = Object.assign(Object.create(null), {
    status: "trial" as const,
    plan: null,
    trial_ends_at: null,
    current_period_end: null,
    emails_used_this_month: 0,
    emails_limit: null,
  });
  return s;
}

export default function BillingPage() {
  const { toast } = useToast();
  const router = useRouter();
  // remote billing state
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    api.getBillingStatus()
      .then(setBillingStatus)
      .catch(async () => {
        // Fallback: use /plan endpoint which works with API secret auth
        try {
          const plan = await api.getClientPlan();
          setBillingStatus({
            plan: plan.plan,
            status: plan.plan_status || "trial",
            display_name: plan.plan === "trial" ? "Essai gratuit" : plan.plan === "starter" ? "Starter" : plan.plan === "professional" ? "Professional" : "Enterprise",
            trial_days_left: plan.trial_days_left ?? 0,
            emails_used_this_month: plan.features?.emails_used_this_month ?? 0,
            emails_limit: plan.features?.max_emails_per_month ?? 1000,
            has_stripe_customer: false,
          } as unknown as BillingStatus);
        } catch {
          toast("Erreur lors du chargement de l'abonnement", "error");
        }
      })
      .finally(() => setPageLoading(false));
  }, [toast]);

  async function handleSelectPlan(planId: string) {
    setLoadingPlan(planId);
    try {
      const { url } = await api.createCheckout(planId);
      router.push(url);
    } catch {
      toast("Erreur lors de la création du paiement", "error");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handlePortal() {
    setLoadingPortal(true);
    try {
      const { url } = await api.openBillingPortal();
      router.push(url);
    } catch {
      toast("Erreur lors de l'ouverture du portail", "error");
    } finally {
      setLoadingPortal(false);
    }
  }

  function renderContent() {
    if (pageLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
    const s = billingStatus ?? emptyStatus();
    if (s.status === "active") {
      return <ActiveView status={s} onPortal={handlePortal} loadingPortal={loadingPortal} />;
    }
    if (s.status === "expired" || s.status === "canceled") {
      return <ExpiredView onSelect={handleSelectPlan} loadingPlan={loadingPlan} />;
    }
    return <TrialView status={s} onSelect={handleSelectPlan} loadingPlan={loadingPlan} />;
  }

  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Abonnement</h1>
        <p className="text-[#9999b0] mt-1">Gérez votre plan et votre facturation.</p>
      </div>
      {renderContent()}
    </div>
  );
}
