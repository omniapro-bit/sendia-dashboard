type BadgeVariant = "green" | "red" | "orange" | "purple" | "blue" | "gray";
interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}
function badgeClass(v: BadgeVariant): string {
  if (v === "green") return "bg-emerald-400/10 text-emerald-400 border-emerald-400/20";
  if (v === "red") return "bg-red-400/10 text-red-400 border-red-400/20";
  if (v === "orange") return "bg-orange-400/10 text-orange-400 border-orange-400/20";
  if (v === "purple") return "bg-violet-400/10 text-violet-400 border-violet-400/20";
  if (v === "blue") return "bg-indigo-400/10 text-indigo-400 border-indigo-400/20";
  return "bg-[#2a2a3a] text-[#9999b0] border-[#333348]";
}
export function Badge(props: BadgeProps) {
  const { variant = "gray", children, className = "" } = props;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass(variant)} ${className}`}>
      {children}
    </span>
  );
}
