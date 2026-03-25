interface StatCardProps {
  label: string;
  value: number | string;
  color?: "green" | "blue" | "orange" | "red" | "purple";
  subtitle?: string;
}

const COLORS: Record<string, { border: string; glow: string }> = {
  blue:   { border: "#4f6ef7", glow: "rgba(79,110,247,0.06)" },
  green:  { border: "#34d399", glow: "rgba(52,211,153,0.06)" },
  orange: { border: "#fb923c", glow: "rgba(251,146,60,0.06)" },
  red:    { border: "#f87171", glow: "rgba(248,113,113,0.06)" },
  purple: { border: "#a78bfa", glow: "rgba(167,139,250,0.06)" },
};

export function StatCard({ label, value, color = "blue", subtitle }: StatCardProps) {
  const c = COLORS[color] ?? COLORS.blue;
  return (
    <div style={{
      background: `linear-gradient(135deg, ${c.glow}, #16161f 60%)`,
      border: "1px solid #2a2a3a",
      borderTop: `2px solid ${c.border}`,
      borderRadius: 16,
      padding: "20px 22px",
      transition: "border-color 0.2s, transform 0.2s",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = "#333348"; e.currentTarget.style.transform = "translateY(-1px)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.borderTopColor = c.border; e.currentTarget.style.transform = "none"; }}
    >
      <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#66667a", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
        {label}
      </p>
      <p style={{ fontSize: "1.85rem", fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1, color: "#f0f0f5" }}>
        {value}
      </p>
      {subtitle && (
        <p style={{ fontSize: "0.72rem", color: "#555568", marginTop: 6 }}>{subtitle}</p>
      )}
    </div>
  );
}
