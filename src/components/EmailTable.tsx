import type { Email } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

type BadgeVariant = "green" | "red" | "orange" | "purple" | "blue" | "yellow" | "teal" | "gray";
type Cfg = { variant: BadgeVariant; label: string };

function cfg(key: string): Cfg {
  switch (key) {
    case "SENT":      return { variant: "green",  label: "Envoyé" };
    case "REJECTED":  return { variant: "red",    label: "Rejeté" };
    case "PENDING":   return { variant: "orange", label: "En attente" };
    case "CANCELLED": return { variant: "gray",   label: "Annulé" };
    case "devis":     return { variant: "orange", label: "Devis" };
    case "facture":   return { variant: "purple", label: "Facture" };
    case "lead":      return { variant: "green",  label: "Lead" };
    case "support":   return { variant: "blue",   label: "Support" };
    case "urgent":    return { variant: "red",    label: "Urgent" };
    case "relance":   return { variant: "yellow", label: "Relance" };
    case "commande":  return { variant: "teal",   label: "Commande" };
    case "suivi":     return { variant: "gray",   label: "Suivi" };
    case "question":  return { variant: "gray",   label: "Question" };
    case "general":   return { variant: "gray",   label: "Général" };
    default:          return { variant: "gray",   label: key };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function thStyle(): React.CSSProperties {
  return {
    textAlign: "left",
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#66667a",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    padding: "0 14px 12px",
    borderBottom: "1px solid #2a2a3a",
  };
}

export function EmailTable(props: { emails: Email[] }) {
  const { emails } = props;

  if (emails.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", color: "#66667a" }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ margin: "0 auto 12px", opacity: 0.35, display: "block" }}>
          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p style={{ fontSize: "0.88rem" }}>Aucun email traité pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle()}>Expéditeur</th>
            <th style={thStyle()}>Objet</th>
            <th style={thStyle()} className="hidden md:table-cell">Type</th>
            <th style={thStyle()} className="hidden md:table-cell">Date</th>
            <th style={thStyle()}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {emails.map(email => {
            const sc = cfg(email.status);
            const cc = email.category ? cfg(email.category) : null;
            return (
              <tr
                key={email.id}
                style={{ borderBottom: "1px solid rgba(42,42,58,0.5)", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#1c1c28")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "13px 14px", verticalAlign: "middle" }}>
                  <p style={{ fontWeight: 600, color: "#f0f0f5", fontSize: "0.85rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {email.from_name || email.from_email}
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "#66667a", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                    {email.from_email}
                  </p>
                </td>
                <td style={{ padding: "13px 14px", verticalAlign: "middle" }}>
                  <p style={{ color: "#b0b0c0", fontSize: "0.85rem", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {email.subject}
                  </p>
                </td>
                <td style={{ padding: "13px 14px", verticalAlign: "middle" }} className="hidden md:table-cell">
                  {cc && <Badge variant={cc.variant} dot>{cc.label}</Badge>}
                </td>
                <td style={{ padding: "13px 14px", color: "#66667a", fontSize: "0.82rem", whiteSpace: "nowrap", verticalAlign: "middle" }} className="hidden md:table-cell">
                  {formatDate(email.created_at)}
                </td>
                <td style={{ padding: "13px 14px", verticalAlign: "middle" }}>
                  <Badge variant={sc.variant} dot>{sc.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
