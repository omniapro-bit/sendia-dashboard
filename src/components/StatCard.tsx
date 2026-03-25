interface StatCardProps {
  label: string;
  value: number | string;
  color?: "green" | "blue" | "orange" | "red" | "purple";
}
function statColor(c: StatCardProps["color"]): string {
  if (c === "green") return "text-emerald-400";
  if (c === "orange") return "text-orange-400";
  if (c === "red") return "text-red-400";
  if (c === "purple") return "text-violet-400";
  return "text-[#6b85ff]";
}
export function StatCard({ label, value, color = "blue" }: StatCardProps) {
  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-5 flex flex-col gap-2">
      <p className="text-xs font-medium text-[#66667a] uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${statColor(color)}`}>{value}</p>
    </div>
  );
}
