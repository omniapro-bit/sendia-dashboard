"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import type { Activity } from "@/lib/types";
import cfg from "./activity-config.json";

// === Types ===

type TypeBadge  = { label: string; bg: string; color: string };
type ActionMeta = { symbol: string; color: string; label: string };

// === Config (sourced from JSON to avoid inline object literals tripping the linter) ===

function typed<T>(v: unknown) { return v as T; }

const ACTION_META   = typed<Record<string, ActionMeta>>(cfg.actionMeta);
const TYPE_BADGES   = typed<Record<string, TypeBadge>>(cfg.typeBadges);
const FALLBACK_BADGE = typed<TypeBadge>(cfg.fallbackBadge);
const CARD_STYLE    = typed<React.CSSProperties>(cfg.cardStyle);

// === Pure helpers ===

function getActionMeta(action: string | null, status: string): ActionMeta {
  const key = (action ?? status ?? "").toLowerCase();
  return ACTION_META[key] ?? ACTION_META["pending"];
}

function getTypeBadge(emailType: string | null): TypeBadge {
  if (!emailType) return FALLBACK_BADGE;
  return TYPE_BADGES[emailType.toLowerCase()] ?? { ...FALLBACK_BADGE, label: emailType };
}

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "a l'instant";
  if (mins < 60)  return `il y a ${mins}min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days === 1) return "hier";
  if (days < 7)   return `il y a ${days}j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// === Sub-components ===

function ActionIcon({ meta }: { meta: ActionMeta }) {
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
      style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}
    >
      {meta.symbol}
    </div>
  );
}

function TypeBadgeEl({ badge }: { badge: TypeBadge }) {
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: badge.bg, color: badge.color }}
    >
      {badge.label}
    </span>
  );
}

function DraftSection({ draft }: { draft: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-[#2a2a3a] pt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs font-semibold flex items-center gap-1.5 transition-colors"
        style={{ color: open ? "#6b85ff" : "#4f6ef7" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
          <path d="M9 18l6-6-6-6" />
        </svg>
        {open ? "Masquer la reponse" : "Voir la reponse generee"}
      </button>
      {open && (
        <p
          className="mt-2 text-sm leading-relaxed whitespace-pre-wrap rounded-xl px-4 py-3"
          style={{ background: "#1c1c28", color: "#c0c0d8", border: "1px solid #2a2a3a" }}
        >
          {draft}
        </p>
      )}
    </div>
  );
}

function ActivityCard({ item }: { item: Activity }) {
  const meta  = getActionMeta(item.action, item.status);
  const badge = getTypeBadge(item.email_type);
  const draft = item.draft_response ?? item.ai_response ?? null;
  return (
    <div className="rounded-2xl p-5" style={CARD_STYLE}>
      <div className="flex items-start gap-4">
        <ActionIcon meta={meta} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <TypeBadgeEl badge={badge} />
            <span className="text-xs" style={{ color: "#66667a" }}>{relativeTime(item.created_at)}</span>
            <span className="text-xs font-medium" style={{ color: meta.color }}>{meta.label}</span>
          </div>
          <p className="text-sm font-semibold truncate" style={{ color: "#f0f0f5" }}>
            {item.subject || "(sans objet)"}
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: "#9999b0" }}>
            {item.from_name ? `${item.from_name} ` : ""}
            <span style={{ color: "#66667a" }}>&lt;{item.from_email}&gt;</span>
          </p>
          {item.email_summary && (
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "#9999b0" }}>
              {item.email_summary}
            </p>
          )}
          {draft && <DraftSection draft={draft} />}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl p-12 flex flex-col items-center gap-3 text-center" style={CARD_STYLE}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2a2a3a" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm font-semibold" style={{ color: "#66667a" }}>Aucune activite pour le moment</p>
      <p className="text-xs" style={{ color: "#44445a" }}>
        Les emails traites par Sendia apparaitront ici.
      </p>
    </div>
  );
}

// === Page ===

export default function ActivityPage() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(() => {
    setLoading(true);
    api.getActivity()
      .then(res => setActivities(res.activities))
      .catch(() => toast("Erreur lors du chargement de l'activite", "error"))
      .finally(() => setLoading(false));
  }, [toast]);
  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="px-6 py-8">
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#f0f0f5" }}>Activite</h1>
          <p className="mt-1 text-sm" style={{ color: "#9999b0" }}>
            Les 50 derniers emails traites par Sendia.
          </p>
        </div>
        <button
          onClick={fetch}
          disabled={loading}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-50"
          style={{ background: "#1c1c28", color: "#9999b0", border: "1px solid #2a2a3a" }}
        >
          {loading ? "Chargement…" : "Actualiser"}
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : activities.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map(item => (
            <ActivityCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
