import type { Email } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
type BadgeVariant = "green" | "red" | "orange" | "purple" | "blue" | "yellow" | "teal" | "gray";
function statusVariant(status: string): BadgeVariant {
  if (status === "SENT") return "green";
  if (status === "REJECTED") return "red";
  if (status === "PENDING") return "orange";
  return "gray";
}
function statusLabel(status: string): string {
  if (status === "SENT") return "Envoyé";
  if (status === "REJECTED") return "Rejeté";
  if (status === "PENDING") return "En attente";
  return status;
}
function categoryVariant(category: string): BadgeVariant {
  if (category === "devis") return "orange";
  if (category === "facture") return "purple";
  if (category === "lead") return "green";
  if (category === "support") return "blue";
  if (category === "urgent") return "red";
  if (category === "relance") return "yellow";
  if (category === "commande") return "teal";
  return "gray";
}
function categoryLabel(category: string): string {
  if (category === "lead") return "Lead";
  if (category === "devis") return "Devis";
  if (category === "commande") return "Commande";
  if (category === "facture") return "Facture";
  if (category === "relance") return "Relance";
  if (category === "suivi") return "Suivi";
  if (category === "support") return "Support";
  if (category === "question") return "Question";
  if (category === "general") return "Général";
  if (category === "urgent") return "Urgent";
  return category;
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
export function EmailTable({ emails }: { emails: Email[] }) {
  if (emails.length === 0) {
    return <p className="text-sm text-[#66667a] py-6 text-center">Aucun email traité pour le moment.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2a2a3a]">
            <th className="text-left py-3 px-4 text-xs font-semibold text-[#66667a] uppercase tracking-wide">Expéditeur</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-[#66667a] uppercase tracking-wide">Objet</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-[#66667a] uppercase tracking-wide hidden md:table-cell">Type</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-[#66667a] uppercase tracking-wide hidden md:table-cell">Date</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-[#66667a] uppercase tracking-wide">Statut</th>
          </tr>
        </thead>
        <tbody>
          {emails.map(email => (
            <tr key={email.id} className="border-b border-[#2a2a3a]/50 hover:bg-[#1c1c28]/50 transition-colors">
              <td className="py-3 px-4">
                <p className="font-medium text-[#f0f0f5] truncate max-w-[140px]">{email.from_name || email.from_email}</p>
                <p className="text-xs text-[#66667a] truncate max-w-[140px]">{email.from_email}</p>
              </td>
              <td className="py-3 px-4">
                <p className="text-[#9999b0] truncate max-w-[200px]">{email.subject}</p>
              </td>
              <td className="py-3 px-4 hidden md:table-cell">
                {email.category && (
                  <Badge variant={categoryVariant(email.category)}>{categoryLabel(email.category)}</Badge>
                )}
              </td>
              <td className="py-3 px-4 text-[#66667a] hidden md:table-cell whitespace-nowrap">{formatDate(email.created_at)}</td>
              <td className="py-3 px-4">
                <Badge variant={statusVariant(email.status)}>{statusLabel(email.status)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
