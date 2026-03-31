"use client";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { crmApi, type CrmContact, type CrmDeal, type CrmInteraction, type CrmStats } from "@/lib/crm-api";
import cfg from "./crm-config.json";
type BadgeVariant = "green" | "red" | "orange" | "purple" | "blue" | "yellow" | "teal" | "gray";
const TAG_COLORS = cfg.tagColors as Record<string, BadgeVariant>;
const STAGE_LABELS = cfg.stageLabels as Record<string, string>;
const STAGE_COLORS = cfg.stageColors as Record<string, BadgeVariant>;
const TABS = cfg.tabs as { id: string; label: string }[];
const KANBAN_STAGES = cfg.kanbanStages as string[];
const TAG_FILTER_OPTIONS = cfg.tagFilterOptions as string[];
const EMPTY = cfg.emptyMessages as Record<string, string>;
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "\u00e0 l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days}j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
// ─── Stats cards ─────────────────────────────────────────────
const STAT_CARDS = cfg.statCards as { key: string; label: string; color: string }[];
function statValue(stats: CrmStats, key: string): string | number {
  if (key === "contacts_total") return stats.contacts.total;
  if (key === "deals_open") return stats.deals.open;
  if (key === "won_amount") return `${stats.deals.won_amount.toLocaleString("fr-FR")}\u00a0\u20ac`;
  return stats.interactions_7d;
}
function StatsRow({ stats }: { stats: CrmStats | null }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {STAT_CARDS.map(sc => (
        <Card key={sc.key} padding="sm">
          <p className="text-xs text-[#66667a] mb-1">{sc.label}</p>
          <p className="text-xl font-bold" style={{ color: sc.color }}>{statValue(stats, sc.key)}</p>
        </Card>
      ))}
    </div>
  );
}
// ─── Contact list ────────────────────────────────────────────
function ContactsList({ contacts, onSelect }: { contacts: CrmContact[]; onSelect: (c: CrmContact) => void }) {
  if (!contacts.length) return <p className="text-[#66667a] text-sm py-8 text-center">{EMPTY.contacts}</p>;
  return (
    <div className="space-y-2">
      {contacts.map(c => (
        <button key={c.id} onClick={() => onSelect(c)} className="w-full text-left p-4 rounded-xl bg-[#16161f] border border-[#2a2a3a] hover:border-[#4f6ef7] transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-[#f0f0f5]">{c.display_name || c.email}</span>
            <Badge variant={TAG_COLORS[c.tag] ?? "gray"}>{c.tag}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-[#66667a]">
            <span>{c.email}{c.company_name ? ` \u2014 ${c.company_name}` : ""}</span>
            <span>{c.email_count} emails \u00b7 {relativeTime(c.last_seen_at)}</span>
          </div>
          {Number(c.open_deals) > 0 && <p className="text-xs text-[#a78bfa] mt-1">{c.open_deals} deal(s) en cours</p>}
        </button>
      ))}
    </div>
  );
}
// ─── Contact detail modal ────────────────────────────────────
function ContactDetail({ contact, onClose }: { contact: CrmContact; onClose: () => void }) {
  const [data, setData] = useState<{ interactions: CrmInteraction[]; deals: CrmDeal[] } | null>(null);
  const { toast } = useToast();
  useEffect(() => {
    crmApi.getContact(contact.id).then(d => setData({ interactions: d.interactions, deals: d.deals })).catch(() => toast("Erreur chargement contact", "error"));
  }, [contact.id, toast]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#12121a] border border-[#2a2a3a] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 m-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#f0f0f5]">{contact.display_name || contact.email}</h2>
            <p className="text-sm text-[#66667a]">{contact.email}{contact.company_name ? ` \u2014 ${contact.company_name}` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={TAG_COLORS[contact.tag] ?? "gray"}>{contact.tag}</Badge>
            <button onClick={onClose} className="text-[#66667a] hover:text-[#f0f0f5] text-xl">\u00d7</button>
          </div>
        </div>
        {contact.phone && <p className="text-sm text-[#9999b0] mb-2">T\u00e9l : {contact.phone}</p>}
        {contact.notes && <p className="text-sm text-[#9999b0] mb-4 italic">{contact.notes}</p>}
        {data ? (
          <>
            {data.deals.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-[#f0f0f5] mb-2">Deals</h3>
                {data.deals.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-[#1c1c28] mb-1">
                    <span className="text-sm text-[#f0f0f5]">{d.title}</span>
                    <div className="flex items-center gap-2">
                      {d.amount && <span className="text-xs text-[#9999b0]">{Number(d.amount).toLocaleString("fr-FR")}\u00a0\u20ac</span>}
                      <Badge variant={STAGE_COLORS[d.stage] ?? "gray"}>{STAGE_LABELS[d.stage] ?? d.stage}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <h3 className="text-sm font-semibold text-[#f0f0f5] mb-2">Historique ({data.interactions.length})</h3>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {data.interactions.map(ix => (
                <div key={ix.id} className="p-2 rounded-lg bg-[#1c1c28] text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#f0f0f5]">{ix.subject || "(sans sujet)"}</span>
                    <span className="text-xs text-[#66667a]">{relativeTime(ix.created_at)}</span>
                  </div>
                  {ix.summary && <p className="text-xs text-[#9999b0] mt-0.5 line-clamp-2">{ix.summary}</p>}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex justify-center py-8"><Spinner /></div>
        )}
      </div>
    </div>
  );
}
// ─── Deals kanban ────────────────────────────────────────────
// KANBAN_STAGES loaded from crm-config.json
function DealsKanban({ deals, onMove }: { deals: CrmDeal[]; onMove: (id: string, stage: string) => void }) {
  if (!deals.length) return <p className="text-[#66667a] text-sm py-8 text-center">{EMPTY.deals}</p>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {KANBAN_STAGES.map(stage => {
        const items = deals.filter(d => d.stage === stage);
        return (
          <div key={stage}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={STAGE_COLORS[stage] ?? "gray"}>{STAGE_LABELS[stage]}</Badge>
              <span className="text-xs text-[#66667a]">({items.length})</span>
            </div>
            <div className="space-y-2">
              {items.map(d => (
                <Card key={d.id} padding="sm" className="group">
                  <p className="text-sm font-medium text-[#f0f0f5] mb-1 line-clamp-2">{d.title}</p>
                  <p className="text-xs text-[#66667a]">{d.contact_name || d.contact_email}</p>
                  {d.amount && <p className="text-xs text-[#34d399] mt-1">{Number(d.amount).toLocaleString("fr-FR")}\u00a0\u20ac</p>}
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {KANBAN_STAGES.filter(s => s !== stage).slice(0, 2).map(s => (
                      <button key={s} onClick={() => onMove(d.id, s)} className="text-[10px] px-2 py-0.5 rounded bg-[#1c1c28] text-[#9999b0] hover:text-[#f0f0f5] border border-[#333348]">
                        \u2192 {STAGE_LABELS[s]}
                      </button>
                    ))}
                    <button onClick={() => onMove(d.id, "gagne")} className="text-[10px] px-2 py-0.5 rounded bg-[rgba(52,211,153,0.1)] text-[#34d399] border border-[rgba(52,211,153,0.2)]">Gagn\u00e9</button>
                    <button onClick={() => onMove(d.id, "perdu")} className="text-[10px] px-2 py-0.5 rounded bg-[rgba(248,113,113,0.1)] text-[#f87171] border border-[rgba(248,113,113,0.2)]">Perdu</button>
                  </div>
                </Card>
              ))}
              {!items.length && <p className="text-xs text-[#444] text-center py-4">Vide</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
// ─── Timeline ────────────────────────────────────────────────
function Timeline({ interactions }: { interactions: CrmInteraction[] }) {
  if (!interactions.length) return <p className="text-[#66667a] text-sm py-8 text-center">{EMPTY.timeline}</p>;
  return (
    <div className="space-y-2">
      {interactions.map(ix => (
        <div key={ix.id} className="flex gap-3 p-3 rounded-xl bg-[#16161f] border border-[#2a2a3a]">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: ix.direction === "outbound" ? "rgba(52,211,153,0.15)" : "rgba(79,110,247,0.15)", color: ix.direction === "outbound" ? "#34d399" : "#6b85ff" }}>
            {ix.direction === "outbound" ? "\u2191" : "\u2193"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-medium text-[#f0f0f5] truncate">{ix.subject || "(sans sujet)"}</span>
              <span className="text-xs text-[#66667a] shrink-0 ml-2">{relativeTime(ix.created_at)}</span>
            </div>
            <p className="text-xs text-[#9999b0]">{ix.contact_name || ix.contact_email}</p>
            {ix.summary && <p className="text-xs text-[#66667a] mt-0.5 line-clamp-1">{ix.summary}</p>}
          </div>
          {ix.intention && <Badge variant={TAG_COLORS[ix.intention] ?? "gray"}>{ix.intention}</Badge>}
        </div>
      ))}
    </div>
  );
}
// ─── Main CRM page ───────────────────────────────────────────
export default function CrmPage() {
  const [tab, setTab] = useState("contacts");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [interactions, setInteractions] = useState<CrmInteraction[]>([]);
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("ALL");
  const { toast } = useToast();
  const load = useCallback(async () => {
    try {
      const [s, c, d, i] = await Promise.all([
        crmApi.getStats(),
        crmApi.getContacts({ search: search || undefined, tag: tagFilter !== "ALL" ? tagFilter : undefined, limit: 100 }),
        crmApi.getDeals(),
        crmApi.getInteractions({ limit: 50 }),
      ]);
      setStats(s); setContacts(c.contacts); setDeals(d.deals); setInteractions(i.interactions);
    } catch (err: any) {
      toast(err.message || "Erreur CRM", "error");
    } finally {
      setLoading(false);
    }
  }, [search, tagFilter, toast]);
  useEffect(() => { load(); }, [load]);
  async function moveDeal(id: string, stage: string) {
    try {
      await crmApi.updateDeal(id, { stage });
      toast(`Deal d\u00e9plac\u00e9 vers ${STAGE_LABELS[stage]}`, "success");
      load();
    } catch { toast("Erreur mise \u00e0 jour deal", "error"); }
  }
  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  const tagOptions = TAG_FILTER_OPTIONS;
  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">CRM</h1>
        <p className="text-sm text-[#66667a]">Aliment\u00e9 automatiquement par vos emails</p>
      </div>
      <StatsRow stats={stats} />
      <div className="flex items-center gap-2 mb-4 border-b border-[#2a2a3a] pb-3">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-[rgba(79,110,247,0.12)] text-[#6b85ff]" : "text-[#9999b0] hover:text-[#f0f0f5]"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "contacts" && (
        <>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-[#1c1c28] border border-[#333348] text-[#f0f0f5] text-sm placeholder:text-[#66667a] focus:outline-none focus:border-[#4f6ef7]" />
            <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-[#1c1c28] border border-[#333348] text-[#f0f0f5] text-sm focus:outline-none focus:border-[#4f6ef7]">
              {tagOptions.map(t => <option key={t} value={t}>{t === "ALL" ? "Tous" : t}</option>)}
            </select>
          </div>
          <ContactsList contacts={contacts} onSelect={setSelectedContact} />
        </>
      )}
      {tab === "deals" && <DealsKanban deals={deals} onMove={moveDeal} />}
      {tab === "timeline" && <Timeline interactions={interactions} />}
      {selectedContact && <ContactDetail contact={selectedContact} onClose={() => setSelectedContact(null)} />}
    </div>
  );
}
