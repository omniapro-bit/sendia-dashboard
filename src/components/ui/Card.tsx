import { type HTMLAttributes } from "react";
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
}
export function Card(props: CardProps) {
  const { padding = "md", className = "", children, ...rest } = props;
  const p = padding === "sm" ? "p-4" : padding === "lg" ? "p-8" : "p-6";
  return (
    <div
      {...rest}
      className={`bg-[#16161f] border border-[#2a2a3a] rounded-2xl ${p} ${className}`}
    >
      {children}
    </div>
  );
}
