type BadgeVariant = "green" | "red" | "orange" | "purple" | "blue" | "yellow" | "teal" | "gray";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

function badgeStyle(v: BadgeVariant): React.CSSProperties {
  switch (v) {
    case "green":  return { background: "rgba(52,211,153,0.10)",  color: "#34d399", border: "1px solid rgba(52,211,153,0.18)" };
    case "red":    return { background: "rgba(248,113,113,0.10)", color: "#f87171", border: "1px solid rgba(248,113,113,0.18)" };
    case "orange": return { background: "rgba(251,146,60,0.10)",  color: "#fb923c", border: "1px solid rgba(251,146,60,0.18)" };
    case "purple": return { background: "rgba(167,139,250,0.10)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.18)" };
    case "blue":   return { background: "rgba(79,110,247,0.10)",  color: "#6b85ff", border: "1px solid rgba(79,110,247,0.18)" };
    case "yellow": return { background: "rgba(250,204,21,0.10)",  color: "#facc15", border: "1px solid rgba(250,204,21,0.18)" };
    case "teal":   return { background: "rgba(45,212,191,0.10)",  color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.18)" };
    default:       return { background: "#1c1c28", color: "#9999b0", border: "1px solid #333348" };
  }
}

function dotColor(v: BadgeVariant): string {
  switch (v) {
    case "green":  return "#34d399";
    case "red":    return "#f87171";
    case "orange": return "#fb923c";
    case "purple": return "#a78bfa";
    case "blue":   return "#6b85ff";
    case "yellow": return "#facc15";
    case "teal":   return "#2dd4bf";
    default:       return "#9999b0";
  }
}

export function Badge({ variant = "gray", children, className = "", dot }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${className}`}
      style={{
        fontSize: "0.7rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.4px",
        whiteSpace: "nowrap",
        ...badgeStyle(variant),
      }}
    >
      {dot && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            flexShrink: 0,
            background: dotColor(variant),
          }}
        />
      )}
      {children}
    </span>
  );
}
