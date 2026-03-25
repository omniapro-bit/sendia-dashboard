export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const s = size === "sm" ? "w-4 h-4 border-2" : size === "lg" ? "w-10 h-10 border-4" : "w-6 h-6 border-2";
  return <span className={`${s} border-[#4f6ef7] border-t-transparent rounded-full animate-spin inline-block ${className}`} />;
}
