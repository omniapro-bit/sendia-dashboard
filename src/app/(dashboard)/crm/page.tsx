"use client";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { crmApi } from "@/lib/crm-api";
import type { CrmContact, CrmDeal, CrmInteraction, CrmStats } from "@/lib/crm-api";
import cfg from "./crm-config.json";

type BadgeVariant = "green" | "red" | "orange" | "purple" | "blue" | "yellow" | "teal" | "gray";
const TAG_COLORS = (cfg.tagColors) as Record<string, BadgeVariant>;
const STAGE_LABELS = (cfg.stageLabels) as Record<string, string>;
const STAGE_COLORS = (cfg.stageColors) as Record<string, BadgeVariant>;
const TABS = (cfg.tabs) as { id: string; label: string; icon: string }[];
const K_STAGES = (cfg.kanbanStages) as string[];
const TAG_OPTS = (cfg.tagFilterOptions) as string[];
const EMPTY = (cfg.emptyStates) as Record<string, string>;
const DIR = (cfg.directionLabels) as Record<string, string>;

function relative(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000), h = Math.floor(d / 3600000), j = Math.floor(d / 86400000);
  if (m < 1) return "maintenant";
  if (m < 60) return `${m}min`;
  if (h < 24) return `${h}h`;
  if (j === 1) return "hier";
  if (j < 7) return `${j}j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function domainFrom(email: string) { return email.split("@")[1] || ""; }
function initials(name: string, email: string) {
  if (name && name.length > 1) return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}
function TabIcon({ d }: { d: string }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d={d} /></svg>;
}

// ─── Vue d'ensemble ──────────────────────────────────────────
function Overview({ stats, contacts, deals, interactions }: { stats: CrmStats | null; contacts: CrmContact[]; deals: CrmDeal[]; interactions: CrmInteraction[] }) {
  if (!stats) return null;
  const recentContacts = contacts.slice(0, 5);
  const activePipeline = deals.filter(d => !["gagne", "perdu"].includes(d.stage));
  const coldDeals = activePipeline.filter(d => {
    const age = Date.now() - new Date(d.updated_at).getTime();
    return age > 7 * 86400000;
  });
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card padding="sm"><p className="text-[11px] uppercase tracking-wider text-[#66667a] mb-1">Contacts</p><p className="text-2xl font-bold text-[#f0f0f5]">{stats.contacts.total}</p></Card>
        <Card padding="sm"><p className="text-[11px] uppercase tracking-wider text-[#66667a] mb-1">Pipeline actif</p><p className="text-2xl font-bold text-[#a78bfa]">{stats.deals.open}</p></Card>
        <Card padding="sm"><p className="text-[11px] uppercase tracking-wider text-[#66667a] mb-1">Interactions (7j)</p><p className="text-2xl font-bold text-[#6b85ff]">{stats.interactions_7d}</p></Card>
        <Card padding="sm"><p className="text-[11px] uppercase tracking-wider text-[#66667a] mb-1">Contacts par tag</p><div className="flex flex-wrap gap-1 mt-1">{Object.entries(stats.contacts.by_tag).map(([t, n]) => <Badge key={t} variant={TAG_COLORS[t] ?? "gray"}>{t} {n}</Badge>)}</div></Card>
      </div>
      {/* Alertes */}
      {coldDeals.length > 0 && (
        <Card padding="sm" className="border-[rgba(251,146,60,0.3)]">
          <p className="text-sm font-semibold text-[#fb923c] mb-2">{"Opportunit\u00e9s sans activit\u00e9 depuis 7+ jours"}</p>
          {coldDeals.slice(0, 3).map(d => (
            <div key={d.id} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-[#f0f0f5]">{d.title}</span>
              <span className="text-xs text-[#66667a]">{d.contact_name} &middot; {relative(d.updated_at)}</span>
            </div>
          ))}
        </Card>
      )}
      {/* Derniers contacts + activit\u00e9 */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-[#f0f0f5] mb-3">Contacts r&eacute;cents</h3>
          {recentContacts.length ? recentContacts.map(c => (
            <div key={c.id} className="flex items-center gap-3 py-2 border-b border-[#1c1c28] last:border-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#a78bfa] flex items-center justify-center text-xs font-bold text-white shrink-0">{initials(c.display_name, c.email)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#f0f0f5] truncate">{c.display_name || c.email}</p>
                <p className="text-xs text-[#66667a] truncate">{domainFrom(c.email)}</p>
              </div>
              <Badge variant={TAG_COLORS[c.tag] ?? "gray"}>{c.tag}</Badge>
            </div>
          )) : <p className="text-xs text-[#66667a]">{EMPTY.overview}</p>}
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-[#f0f0f5] mb-3">Derni&egrave;res interactions</h3>
          {interactions.slice(0, 5).length ? interactions.slice(0, 5).map(ix => (
            <div key={ix.id} className="flex items-center gap-2 py-2 border-b border-[#1c1c28] last:border-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${ix.direction === "outbound" ? "bg-[rgba(52,211,153,0.15)] text-[#34d399]" : "bg-[rgba(79,110,247,0.15)] text-[#6b85ff]"}`}>
                {ix.direction === "outbound" ? "\u2191" : "\u2193"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#f0f0f5] truncate">{ix.subject || "(sans sujet)"}</p>
                <p className="text-xs text-[#66667a]">{ix.contact_name || ix.contact_email} &middot; {relative(ix.created_at)}</p>
              </div>
            </div>
          )) : <p className="text-xs text-[#66667a]">{EMPTY.timeline}</p>}
        </Card>
      </div>
    </div>
  );
}

// ─── Contacts ────────────────────────────────────────────────
function ContactsList({ contacts, onSelect }: { contacts: CrmContact[]; onSelect: (c: CrmContact) => void }) {
  if (!contacts.length) return <EmptyState msg={EMPTY.contacts} />;
  return (
    <div className="space-y-1">
      {/* Header row */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[11px] uppercase tracking-wider text-[#66667a] border-b border-[#2a2a3a]">
        <span className="col-span-4">Contact</span>
        <span className="col-span-2">Entreprise</span>
        <span className="col-span-2">Tag</span>
        <span className="col-span-2 text-center">Emails</span>
        <span className="col-span-2 text-right">Vu</span>
      </div>
      {contacts.map(c => (
        <button key={c.id} onClick={() => onSelect(c)} className="grid grid-cols-12 gap-2 items-center w-full text-left px-4 py-3 rounded-lg hover:bg-[#16161f] transition-colors group">
          <div className="col-span-4 flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#a78bfa] flex items-center justify-center text-xs font-bold text-white shrink-0">{initials(c.display_name, c.email)}</div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#f0f0f5] truncate group-hover:text-[#6b85ff] transition-colors">{c.display_name || c.email}</p>
              <p className="text-xs text-[#66667a] truncate">{c.email}</p>
            </div>
          </div>
          <span className="col-span-2 text-sm text-[#9999b0] truncate">{c.company_name || domainFrom(c.email)}</span>
          <span className="col-span-2"><Badge variant={TAG_COLORS[c.tag] ?? "gray"}>{c.tag}</Badge></span>
          <span className="col-span-2 text-sm text-[#9999b0] text-center">{c.email_count}</span>
          <span className="col-span-2 text-xs text-[#66667a] text-right">{relative(c.last_seen_at)}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Contact detail (modal) ──────────────────────────────────
function ContactDetail({ contact, onClose, onUpdate }: { contact: CrmContact; onClose: () => void; onUpdate: () => void }) {
  const [data, setData] = useState<{ interactions: CrmInteraction[]; deals: CrmDeal[] } | null>(null);
  const [editTag, setEditTag] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [editCompany, setEditCompany] = useState(false);
  const [tag, setTag] = useState(contact.tag);
  const [notes, setNotes] = useState(contact.notes);
  const [company, setCompany] = useState(contact.company_name || domainFrom(contact.email));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    crmApi.getContact(contact.id).then(d => setData(d)).catch(() => toast("Erreur chargement", "error"));
  }, [contact.id, toast]);
  const allTags = (cfg.allTags) as string[];
  async function saveField(field: string, value: string) {
    setSaving(true);
    try {
      await crmApi.updateContact(contact.id, { [field]: value });
      toast("Contact mis \u00e0 jour", "success");
      onUpdate();
    } catch { toast("Erreur", "error"); }
    finally { setSaving(false); setEditTag(false); setEditNotes(false); setEditCompany(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#12121a] border border-[#2a2a3a] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-[#12121a] border-b border-[#2a2a3a] p-5 flex items-start justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#a78bfa] flex items-center justify-center text-lg font-bold text-white">{initials(contact.display_name, contact.email)}</div>
            <div>
              <h2 className="text-lg font-bold text-[#f0f0f5]">{contact.display_name || contact.email}</h2>
              <p className="text-sm text-[#66667a]">{contact.email}</p>
              {/* Editable company */}
              {editCompany ? (
                <div className="flex items-center gap-1 mt-1">
                  <input value={company} onChange={e => setCompany(e.target.value)} className="text-xs px-2 py-1 rounded bg-[#1c1c28] border border-[#333348] text-[#f0f0f5] w-40" autoFocus />
                  <button onClick={() => saveField("company_name", company)} disabled={saving} className="text-[10px] px-2 py-1 rounded bg-[#4f6ef7] text-white">OK</button>
                  <button onClick={() => setEditCompany(false)} className="text-[10px] px-2 py-1 text-[#66667a]">&times;</button>
                </div>
              ) : (
                <p className="text-xs text-[#9999b0] cursor-pointer hover:text-[#f0f0f5] mt-0.5" onClick={() => setEditCompany(true)}>
                  {contact.company_name || domainFrom(contact.email)} <span className="text-[#444]">&#9998;</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Editable tag */}
            {editTag ? (
              <div className="flex flex-wrap gap-1">
                {allTags.map(t => (
                  <button key={t} onClick={() => { setTag(t); saveField("tag", t); }} className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${t === tag ? "border-[#4f6ef7] bg-[rgba(79,110,247,0.2)] text-[#6b85ff]" : "border-[#333348] text-[#9999b0] hover:text-[#f0f0f5]"}`}>{t}</button>
                ))}
              </div>
            ) : (
              <button onClick={() => setEditTag(true)}><Badge variant={TAG_COLORS[tag] ?? "gray"}>{tag} &#9998;</Badge></button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#66667a] hover:text-[#f0f0f5] hover:bg-[#1c1c28] transition-colors">&times;</button>
          </div>
        </div>
        {/* Stats rapides */}
        <div className="px-5 py-3 grid grid-cols-4 gap-3 border-b border-[#1c1c28] text-sm">
          <div><span className="text-[#66667a] text-[10px] block uppercase tracking-wider">Emails</span><span className="text-[#f0f0f5] font-semibold">{contact.email_count}</span></div>
          <div><span className="text-[#66667a] text-[10px] block uppercase tracking-wider">Premier contact</span><span className="text-[#f0f0f5]">{new Date(contact.first_seen_at).toLocaleDateString("fr-FR")}</span></div>
          <div><span className="text-[#66667a] text-[10px] block uppercase tracking-wider">Dernier contact</span><span className="text-[#f0f0f5]">{relative(contact.last_seen_at)}</span></div>
          <div><span className="text-[#66667a] text-[10px] block uppercase tracking-wider">Deals ouverts</span><span className="text-[#a78bfa] font-semibold">{contact.open_deals || 0}</span></div>
        </div>
        {contact.phone && <div className="px-5 py-2 text-sm text-[#9999b0] border-b border-[#1c1c28]">T&eacute;l : {contact.phone}</div>}
        {/* Editable notes */}
        <div className="px-5 py-3 border-b border-[#1c1c28]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider text-[#66667a]">Notes</span>
            {!editNotes && <button onClick={() => setEditNotes(true)} className="text-[10px] text-[#4f6ef7] hover:text-[#6b85ff]">{notes ? "Modifier" : "Ajouter une note"}</button>}
          </div>
          {editNotes ? (
            <div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-[#1c1c28] border border-[#333348] text-[#f0f0f5] text-sm placeholder:text-[#66667a] focus:outline-none focus:border-[#4f6ef7] resize-none" placeholder="Notes sur ce contact..." autoFocus />
              <div className="flex gap-2 mt-1">
                <button onClick={() => saveField("notes", notes)} disabled={saving} className="text-xs px-3 py-1 rounded-lg bg-[#4f6ef7] text-white hover:bg-[#3d5bd9] transition-colors">Enregistrer</button>
                <button onClick={() => { setEditNotes(false); setNotes(contact.notes); }} className="text-xs px-3 py-1 text-[#66667a]">Annuler</button>
              </div>
            </div>
          ) : (
            notes ? <p className="text-sm text-[#9999b0] italic">{notes}</p> : <p className="text-xs text-[#444]">Aucune note</p>
          )}
        </div>
        {/* Contenu */}
        <div className="p-5">
          {data ? (
            <>
              {data.deals.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-[10px] uppercase tracking-wider text-[#66667a] mb-2">Opportunit&eacute;s ({data.deals.length})</h3>
                  {data.deals.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1c1c28] mb-1.5">
                      <div>
                        <span className="text-sm text-[#f0f0f5]">{d.title}</span>
                        {d.amount && <span className="text-xs text-[#34d399] ml-2">{Number(d.amount).toLocaleString("fr-FR")}&nbsp;&euro;</span>}
                      </div>
                      <Badge variant={STAGE_COLORS[d.stage] ?? "gray"}>{STAGE_LABELS[d.stage] ?? d.stage}</Badge>
                    </div>
                  ))}
                </div>
              )}
              <h3 className="text-[10px] uppercase tracking-wider text-[#66667a] mb-2">Historique ({data.interactions.length})</h3>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {data.interactions.map(ix => (
                  <div key={ix.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#1c1c28]">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${ix.direction === "outbound" ? "bg-[rgba(52,211,153,0.15)] text-[#34d399]" : "bg-[rgba(79,110,247,0.15)] text-[#6b85ff]"}`}>
                      {ix.direction === "outbound" ? "\u2191" : "\u2193"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm text-[#f0f0f5] truncate">{ix.subject || "(sans sujet)"}</span>
                        <span className="text-[10px] text-[#66667a] shrink-0 ml-2">{DIR[ix.direction] || ix.direction} &middot; {relative(ix.created_at)}</span>
                      </div>
                      {ix.summary && <p className="text-xs text-[#9999b0] line-clamp-2">{ix.summary}</p>}
                    </div>
                  </div>
                ))}
                {!data.interactions.length && <p className="text-xs text-[#66667a] text-center py-4">Aucun &eacute;change</p>}
              </div>
            </>
          ) : (
            <div className="flex justify-center py-8"><Spinner /></div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline kanban ─────────────────────────────────────────
function Pipeline({ deals, onMove }: { deals: CrmDeal[]; onMove: (id: string, stage: string) => void }) {
  if (!deals.length) return <EmptyState msg={EMPTY.pipeline} />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {K_STAGES.map(stage => {
        const items = deals.filter(d => d.stage === stage);
        return (
          <div key={stage} className="min-h-[200px]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#2a2a3a]">
              <div className="flex items-center gap-2">
                <Badge variant={STAGE_COLORS[stage] ?? "gray"}>{STAGE_LABELS[stage]}</Badge>
              </div>
              <span className="text-xs text-[#66667a] font-medium">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map(d => (
                <div key={d.id} className="p-3 rounded-xl bg-[#16161f] border border-[#2a2a3a] hover:border-[#333348] transition-colors group">
                  <p className="text-sm font-medium text-[#f0f0f5] mb-1.5 line-clamp-2">{d.title}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#a78bfa] flex items-center justify-center text-[8px] font-bold text-white">{initials(d.contact_name, d.contact_email)}</div>
                    <span className="text-xs text-[#9999b0] truncate">{d.contact_name || d.contact_email}</span>
                  </div>
                  <p className="text-[10px] text-[#66667a]">{relative(d.created_at)}</p>
                  <div className="flex flex-wrap gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {K_STAGES.filter(s => s !== stage).map(s => (
                      <button key={s} onClick={() => onMove(d.id, s)} className="text-[10px] px-2 py-0.5 rounded-md bg-[#1c1c28] text-[#9999b0] hover:text-[#f0f0f5] border border-[#333348] transition-colors">&rarr; {STAGE_LABELS[s]}</button>
                    ))}
                    <button onClick={() => onMove(d.id, "gagne")} className="text-[10px] px-2 py-0.5 rounded-md bg-[rgba(52,211,153,0.08)] text-[#34d399] border border-[rgba(52,211,153,0.2)]">{"Termin\u00e9"}</button>
                    <button onClick={() => onMove(d.id, "perdu")} className="text-[10px] px-2 py-0.5 rounded-md bg-[rgba(248,113,113,0.08)] text-[#f87171] border border-[rgba(248,113,113,0.2)]">{"Annul\u00e9"}</button>
                  </div>
                </div>
              ))}
              {!items.length && <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-[#2a2a3a] text-xs text-[#444]">Aucune {"opportunit\u00e9"}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
// ─── Timeline ────────────────────────────────────────────────
function TimelineView({ interactions }: { interactions: CrmInteraction[] }) {
  if (!interactions.length) return <EmptyState msg={EMPTY.timeline} />;
  let lastDate = "";
  return (
    <div className="space-y-1">
      {interactions.map(ix => {
        const d = new Date(ix.created_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
        const showDate = d !== lastDate;
        lastDate = d;
        return (
          <div key={ix.id}>
            {showDate && <p className="text-xs text-[#66667a] font-medium pt-4 pb-2 first:pt-0 capitalize">{d}</p>}
            <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[#16161f] transition-colors">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${ix.direction === "outbound" ? "bg-[rgba(52,211,153,0.12)] text-[#34d399]" : "bg-[rgba(79,110,247,0.12)] text-[#6b85ff]"}`}>
                {ix.direction === "outbound" ? "\u2191" : "\u2193"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#f0f0f5] truncate">{ix.subject || "(sans sujet)"}</span>
                  {ix.intention && <Badge variant={TAG_COLORS[ix.intention] ?? "gray"}>{ix.intention}</Badge>}
                </div>
                <p className="text-xs text-[#9999b0] mt-0.5">{ix.contact_name || ix.contact_email}</p>
                {ix.summary && <p className="text-xs text-[#66667a] mt-0.5 line-clamp-1">{ix.summary}</p>}
              </div>
              <span className="text-[10px] text-[#66667a] shrink-0 mt-1">{new Date(ix.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────
function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#1c1c28] flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#66667a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
      </div>
      <p className="text-sm text-[#66667a] max-w-sm">{msg}</p>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────
export default function CrmPage() {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [interactions, setInteractions] = useState<CrmInteraction[]>([]);
  const [selected, setSelected] = useState<CrmContact | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("ALL");
  const { toast } = useToast();
  // Debounce search input — wait 400ms after last keystroke before firing API call
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);
  const load = useCallback(async () => {
    try {
      const [s, c, d, i] = await Promise.all([
        crmApi.getStats(), crmApi.getContacts({ search: debouncedSearch || undefined, tag: tagFilter !== "ALL" ? tagFilter : undefined, limit: 100 }),
        crmApi.getDeals(), crmApi.getInteractions({ limit: 50 }),
      ]);
      setStats(s); setContacts(c.contacts); setDeals(d.deals); setInteractions(i.interactions);
    } catch (err: any) { toast(err.message || "Erreur CRM", "error"); }
    finally { setLoading(false); }
  }, [debouncedSearch, tagFilter, toast]);
  useEffect(() => { load(); }, [load]);
  async function moveDeal(id: string, stage: string) {
    try { await crmApi.updateDeal(id, { stage }); toast(`${STAGE_LABELS[stage] ?? stage}`, "success"); load(); }
    catch { toast("Erreur", "error"); }
  }
  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f0f0f5] mb-1">CRM</h1>
        <p className="text-sm text-[#66667a]">{"Aliment\u00e9 automatiquement par l'analyse de vos emails"}</p>
      </div>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#2a2a3a] -mx-4 px-4 md:-mx-8 md:px-8 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? "border-[#4f6ef7] text-[#6b85ff]" : "border-transparent text-[#66667a] hover:text-[#9999b0]"}`}>
            <TabIcon d={t.icon} />{t.label}
          </button>
        ))}
      </div>
      {/* Search bar (contacts only) */}
      {tab === "contacts" && (
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66667a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input type="text" placeholder="Rechercher un contact..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#16161f] border border-[#2a2a3a] text-[#f0f0f5] text-sm placeholder:text-[#66667a] focus:outline-none focus:border-[#4f6ef7] transition-colors" />
          </div>
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="px-3 py-2.5 rounded-lg bg-[#16161f] border border-[#2a2a3a] text-[#f0f0f5] text-sm focus:outline-none focus:border-[#4f6ef7]">
            {TAG_OPTS.map(t => <option key={t} value={t}>{t === "ALL" ? "Tous les tags" : t}</option>)}
          </select>
        </div>
      )}
      {/* Tab content */}
      {tab === "overview" && <Overview stats={stats} contacts={contacts} deals={deals} interactions={interactions} />}
      {tab === "contacts" && <ContactsList contacts={contacts} onSelect={setSelected} />}
      {tab === "pipeline" && <Pipeline deals={deals} onMove={moveDeal} />}
      {tab === "timeline" && <TimelineView interactions={interactions} />}
      {selected && <ContactDetail contact={selected} onClose={() => setSelected(null)} onUpdate={() => { load(); setSelected(null); }} />}
    </div>
  );
}
