import type { Email } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

type BadgeVariant = "green" | "red" | "orange" | "purple" | "blue" | "yellow" | "teal" | "gray";

function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case "SENT":     return "green";
    case "REJECTED": return "red";
    case "PENDING":  return "orange";
    case "CANCELLED": return "gray";
    default:         return "gray";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "SENT":      return "Envoyé";
    case "REJECTED":  return "Rejeté";
    case "PENDING":   return "En attente";
    case "CANCELLED": return "Annulé";
    default:          return status;
  }
}

function categoryVariant(category: string): BadgeVariant {
  switch (category) {
    case "devis":    return "orange";
    case "facture":  return "purple";
    case "lead":     return "green";
    case "support":  return "blue";
    case "urgent":   return "red";
    case "relance":  return "yellow";
    case "commande": return "teal";
    default:         return "gray";
  }
}

function categoryLabel(category: string): string {
  switch (category) {
    case "lead":     return "Lead";
    case "devis":    return "Devis";
    case "commande": return "Commande";
    case "facture":  return "Facture";
    case "relance":  return "Relance";
    case "suivi":    return "Suivi";
    case "support":  return "Support";
    case "question": return "Question";
    case "general":  return "Général";
    case "urgent":   return "Urgent";
    default:         return category;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function thStyle(extra?: React.CSSProperties): React.CSSProperties {
  return { textAlign: "left", fontSize: "0.78rem", fontWeight: 600, color: "#66667a", textTransform: "uppercase", letterSpacing: "0.4px", padding: "0 12px 12px", borderBottom: "1px solid #2a2a3a", ...extra };
}

export function EmailTable({ emails }: { emails: Email[] }) {
  if (emails.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", color: "#66667a" }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          style={{ margin: "0 auto 14px", opacity: 0.4, display: "block" }}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p style={{ fontSize: "0.9rem" }}>Aucun email traité pour le moment.</p>
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
          {emails.map(email => (
            <tr
              key={email.id}
              style={{ transition: "background 0.15s", borderBottom: "1px solid rgba(42,42,58,0.5)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#1c1c28")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "14px 12px", verticalAlign: "middle" }}>
                <p style={{ fontWeight: 500, color: "#f0f0f5", fontSize: "0.88rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {email.from_name || email.from_email}
                </p>
                <p style={{ fontSize: "0.75rem", color: "#66667a", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {email.from_email}
                </p>
              </td>
              <td style={{ padding: "14px 12px", verticalAlign: "middle" }}>
                <p style={{ color: "#9999b0", fontSize: "0.88rem", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {email.subject}
                </p>
              </td>
              <td style={{ padding: "14px 12px", verticalAlign: "middle" }} className="hidden md:table-cell">
                {email.category && (
                  <Badge variant={categoryVariant(email.category)} dot>
                    {categoryLabel(email.category)}
                  </Badge>
                )}
              </td>
              <td style={{ padding: "14px 12px", color: "#66667a", fontSize: "0.88rem", whiteSpace: "nowrap", verticalAlign: "middle" }} className="hidden md:table-cell">
                {formatDate(email.created_at)}
              </td>
              <td style={{ padding: "14px 12px", verticalAlign: "middle" }}>
                <Badge variant={statusVariant(email.status)} dot>
                  {statusLabel(email.status)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
