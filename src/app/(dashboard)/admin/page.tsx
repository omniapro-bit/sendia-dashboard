"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Admin-only emails
const ADMIN_EMAILS = ["contact@getsendia.com"];

// Fetch from /api/admin/* with JWT auth
const ADMIN_BASE = process.env.NEXT_PUBLIC_API_BASE
  ? `${process.env.NEXT_PUBLIC_API_BASE}/api/admin`
  : "https://api.getsendia.com/api/admin";

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("No session");
  const res = await fetch(`${ADMIN_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

// Types
interface MonitorClient {
  client_id: string;
  name: string;
  email: string;
  provider: string;
  plan: string;
  plan_status: string;
  is_active: boolean;
  oauth_status: string;
  trial_ends_at: string | null;
  updated_at: string;
  emails_24h: number;
}
interface MonitorData {
  timestamp: string;
  status: string;
  db: { connected: boolean; latency_ms: number };
  emails: {
    last_1h: { total: number; spam: number; leads: number; devis: number; with_draft: number };
    last_24h: { total: number; clients: number };
  };
  clients: MonitorClient[];
  token_issues: string[];
  pending_calendar: number;
  pending_followups: number;
  stuck_emails: Array<{ id: string; subject: string; from_email: string; created_at: string }>;
  alerts: string[];
}
interface WfStats { success: number; error: number }
interface ExecData {
  stats: Record<string, WfStats>;
  recent_errors: Array<{ id: string; workflow: string; started: string }>;
  health: string;
}

// Style constants
const card: React.CSSProperties = {
  background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 12, padding: 20,
};
const badge = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-block", padding: "2px 10px", borderRadius: 20,
  fontSize: "0.75rem", fontWeight: 600, background: bg, color,
});

function StatusBadge({ ok }: { ok: boolean }) {
  return <span style={badge(ok ? "#064e3b" : "#7f1d1d", ok ? "#34d399" : "#f87171")}>{ok ? "OK" : "DOWN"}</span>;
}

function PlanBadge({ plan, status }: { plan: string; status: string }) {
  const colors: Record<string, [string, string]> = {
    trial: ["#1e3a5f", "#60a5fa"],
    starter: ["#3b2f0a", "#fbbf24"],
    professional: ["#1a1040", "#a78bfa"],
    enterprise: ["#0a3a2a", "#34d399"],
  };
  const [bg, fg] = colors[plan] ?? ["#2a2a3a", "#9999b0"];
  const statusIcon = status === "active" ? "" : status === "trial" ? "" : "";
  return <span style={badge(bg, fg)}>{statusIcon} {plan}</span>;
}

function ToggleButton({ active, loading, onClick }: { active: boolean; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: "4px 12px", borderRadius: 8, border: "none", cursor: loading ? "wait" : "pointer",
        background: active ? "#064e3b" : "#7f1d1d", color: active ? "#34d399" : "#f87171",
        fontSize: "0.75rem", fontWeight: 600, transition: "all 0.2s",
      }}
    >
      {loading ? "..." : active ? "Actif" : "Inactif"}
    </button>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [monitor, setMonitor] = useState<MonitorData | null>(null);
  const [execData, setExecData] = useState<ExecData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  const fetchData = useCallback(async () => {
    try {
      const [m, e] = await Promise.all([
        adminFetch<MonitorData>("/monitor"),
        adminFetch<ExecData>("/executions"),
      ]);
      setMonitor(m);
      setExecData(e);
      setError("");
      setLastRefresh(new Date());
    } catch (err) {
      setError("Impossible de charger les donn\u00e9es admin");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) { router.replace("/dashboard"); return; }
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [isAdmin, router, fetchData]);

  async function handlePlanChange(clientId: string, newPlan: string) {
    setUpdatingPlan(clientId);
    try {
      await adminFetch("/update-plan", {
        method: "POST",
        body: JSON.stringify({ client_id: clientId, plan: newPlan }),
      });
      await fetchData();
    } catch { /* ignore */ }
    setUpdatingPlan(null);
  }

  async function handleToggle(clientId: string, currentActive: boolean) {
    setToggling(clientId);
    try {
      await adminFetch("/toggle-client", {
        method: "POST",
        body: JSON.stringify({ client_id: clientId, is_active: !currentActive }),
      });
      await fetchData();
    } catch { /* ignore */ }
    setToggling(null);
  }

  if (!isAdmin) return null;
  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", color: "#9999b0" }}>
      Chargement...
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f0f0f5" }}>Admin Sendia</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastRefresh && (
            <span style={{ fontSize: "0.75rem", color: "#66667a" }}>
              MAJ {lastRefresh.toLocaleTimeString("fr-FR")}
            </span>
          )}
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #2a2a3a", background: "#1a1a2e", color: "#6b85ff", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
          >
            Rafraichir
          </button>
        </div>
      </div>

      {error && <div style={{ ...card, borderColor: "#7f1d1d", marginBottom: 16, color: "#f87171" }}>{error}</div>}

      {/* Alerts banner */}
      {monitor && monitor.alerts.length > 0 && (
        <div style={{ ...card, borderColor: "#7f1d1d", marginBottom: 16, background: "#1a0a0a" }}>
          <h3 style={{ color: "#f87171", fontWeight: 700, marginBottom: 8, fontSize: "0.9rem" }}>Alertes ({monitor.alerts.length})</h3>
          {monitor.alerts.map((a, i) => (
            <div key={i} style={{ color: "#fca5a5", fontSize: "0.85rem", padding: "4px 0" }}>{a}</div>
          ))}
        </div>
      )}

      {/* Health + Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: "0.75rem", color: "#66667a", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Syst\u00e8me</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ color: "#f0f0f5", fontWeight: 600 }}>Base de donn\u00e9es</span>
            <StatusBadge ok={monitor?.db.connected ?? false} />
          </div>
          <div style={{ color: "#9999b0", fontSize: "0.85rem" }}>
            Latence: {monitor?.db.latency_ms ?? "?"}ms
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: "0.75rem", color: "#66667a", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Emails 1h</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f0f0f5" }}>{monitor?.emails.last_1h.total ?? 0}</div>
          <div style={{ color: "#9999b0", fontSize: "0.8rem", marginTop: 4 }}>
            {monitor?.emails.last_1h.leads ?? 0} leads, {monitor?.emails.last_1h.devis ?? 0} devis, {monitor?.emails.last_1h.spam ?? 0} spam
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: "0.75rem", color: "#66667a", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Emails 24h</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f0f0f5" }}>{monitor?.emails.last_24h.total ?? 0}</div>
          <div style={{ color: "#9999b0", fontSize: "0.8rem", marginTop: 4 }}>
            {monitor?.emails.last_24h.clients ?? 0} clients actifs
          </div>
        </div>
      </div>

      {/* n8n Workflows */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ color: "#f0f0f5", fontWeight: 700, fontSize: "0.95rem" }}>Workflows n8n</h3>
          {execData && (
            <span style={badge(
              execData.health === "all_green" ? "#064e3b" : "#7f1d1d",
              execData.health === "all_green" ? "#34d399" : "#f87171"
            )}>
              {execData.health === "all_green" ? "Tout OK" : "Erreurs"}
            </span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {execData && Object.entries(execData.stats).map(([name, s]) => (
            <div key={name} style={{ padding: 12, background: "#12121a", borderRadius: 8, border: "1px solid #2a2a3a" }}>
              <div style={{ fontSize: "0.8rem", color: "#9999b0", marginBottom: 4 }}>{name}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "#34d399", fontWeight: 600, fontSize: "0.85rem" }}>{s.success} ok</span>
                {s.error > 0 && <span style={{ color: "#f87171", fontWeight: 600, fontSize: "0.85rem" }}>{s.error} err</span>}
              </div>
            </div>
          ))}
        </div>
        {execData && execData.recent_errors.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: "0.8rem", color: "#f87171", fontWeight: 600, marginBottom: 6 }}>Erreurs recentes</div>
            {execData.recent_errors.slice(0, 5).map((e) => (
              <div key={e.id} style={{ fontSize: "0.8rem", color: "#9999b0", padding: "3px 0" }}>
                {e.workflow} — {e.started}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clients table */}
      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ color: "#f0f0f5", fontWeight: 700, fontSize: "0.95rem", marginBottom: 12 }}>
          Clients ({monitor?.clients.length ?? 0})
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2a2a3a" }}>
                {["Nom", "Email", "Provider", "Plan", "OAuth", "Emails 24h", "Statut"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#66667a", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monitor?.clients.map(c => (
                <tr key={c.client_id} style={{ borderBottom: "1px solid #1a1a2e" }}>
                  <td style={{ padding: "10px 12px", color: "#f0f0f5", fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: "10px 12px", color: "#9999b0" }}>{c.email}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={badge(c.provider === "gmail" ? "#1a2e1a" : "#1a1a3e", c.provider === "gmail" ? "#86efac" : "#93c5fd")}>
                      {c.provider ?? "—"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <select
                      value={c.plan}
                      disabled={updatingPlan === c.client_id}
                      onChange={(e) => handlePlanChange(c.client_id, e.target.value)}
                      style={{
                        padding: "3px 8px", borderRadius: 8, border: "1px solid #2a2a3a",
                        background: "#12121a", color: "#f0f0f5", fontSize: "0.75rem",
                        fontWeight: 600, cursor: updatingPlan === c.client_id ? "wait" : "pointer",
                      }}
                    >
                      {["trial", "starter", "professional", "enterprise"].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={badge(c.oauth_status === "active" ? "#064e3b" : "#3b2f0a", c.oauth_status === "active" ? "#34d399" : "#fbbf24")}>
                      {c.oauth_status ?? "—"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#f0f0f5", fontWeight: 600 }}>{c.emails_24h}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <ToggleButton
                      active={c.is_active}
                      loading={toggling === c.client_id}
                      onClick={() => handleToggle(c.client_id, c.is_active)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Token issues + stuck emails */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <h3 style={{ color: "#f0f0f5", fontWeight: 700, fontSize: "0.95rem", marginBottom: 8 }}>Tokens OAuth</h3>
          {monitor && monitor.token_issues.length === 0 ? (
            <div style={{ color: "#34d399", fontSize: "0.85rem" }}>Tous les tokens sont valides</div>
          ) : (
            monitor?.token_issues.map((t, i) => (
              <div key={i} style={{ color: "#fbbf24", fontSize: "0.85rem", padding: "3px 0" }}>{t}</div>
            ))
          )}
        </div>

        <div style={card}>
          <h3 style={{ color: "#f0f0f5", fontWeight: 700, fontSize: "0.95rem", marginBottom: 8 }}>
            Emails bloqu\u00e9s ({monitor?.stuck_emails.length ?? 0})
          </h3>
          {monitor && monitor.stuck_emails.length === 0 ? (
            <div style={{ color: "#34d399", fontSize: "0.85rem" }}>Aucun email bloque</div>
          ) : (
            monitor?.stuck_emails.map((e) => (
              <div key={e.id} style={{ color: "#fca5a5", fontSize: "0.8rem", padding: "3px 0" }}>
                {e.subject?.slice(0, 50)} — {e.from_email}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pending counters */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: "0.75rem", color: "#66667a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Calendrier en attente</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f0f0f5" }}>{monitor?.pending_calendar ?? 0}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: "0.75rem", color: "#66667a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Relances en attente</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f0f0f5" }}>{monitor?.pending_followups ?? 0}</div>
        </div>
      </div>
    </div>
  );
}
