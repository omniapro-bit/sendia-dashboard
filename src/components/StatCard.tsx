interface StatCardProps {
  label: string;
  value: number | string;
  color?: "green" | "blue" | "orange" | "red" | "purple";
  subtitle?: string;
}

function valueColor(c: NonNullable<StatCardProps["color"]>): string {
  switch (c) {
    case "green":  return "#34d399";
    case "orange": return "#fb923c";
    case "red":    return "#f87171";
    case "purple": return "#a78bfa";
    default:       return "#6b85ff";
  }
}

export function StatCard({ label, value, color = "blue", subtitle }: StatCardProps) {
  return (
    <div
      className={`stat-border-${color} relative overflow-hidden card-hover`}
      style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: "20px", padding: "22px 24px" }}
    >
      <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#66667a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
        {label}
      </p>
      <p style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-1px", lineHeight: 1, color: "#f0f0f5" }}>
        {value}
      </p>
      {subtitle && (
        <p style={{ fontSize: "0.8rem", color: "#66667a", marginTop: "6px" }}>{subtitle}</p>
      )}
    </div>
  );
}
