type StatColor = "green" | "blue" | "orange" | "red" | "purple";

interface StatCardProps {
  label: string;
  value: number | string;
  color?: StatColor;
  subtitle?: string;
}

export function StatCard(props: StatCardProps) {
  const { label, value, color = "blue", subtitle } = props;

  return (
    <div
      className={`stat-border-${color} relative overflow-hidden card-hover`}
      style={{
        background: "#16161f",
        border: "1px solid #2a2a3a",
        borderRadius: 20,
        padding: "20px 22px 22px",
      }}
    >
      <p style={{
        fontSize: "0.72rem",
        fontWeight: 700,
        color: "#66667a",
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        marginBottom: 12,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: "2rem",
        fontWeight: 800,
        letterSpacing: "-1px",
        lineHeight: 1,
        color: "#f0f0f5",
      }}>
        {value}
      </p>
      {subtitle && (
        <p style={{ fontSize: "0.75rem", color: "#66667a", marginTop: 6 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
