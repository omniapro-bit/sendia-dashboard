"use client";
import { type ButtonHTMLAttributes } from "react";
type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}
function variantClass(v: Variant): string {
  if (v === "primary") return "bg-[#4f6ef7] hover:bg-[#6b85ff] text-white shadow-[0_0_20px_rgba(79,110,247,0.3)]";
  if (v === "secondary") return "bg-[#1c1c28] hover:bg-[#24243a] text-[#f0f0f5] border border-[#2a2a3a]";
  if (v === "danger") return "bg-[#f87171]/10 hover:bg-[#f87171]/20 text-[#f87171] border border-[#f87171]/30";
  return "hover:bg-[#1c1c28] text-[#9999b0] hover:text-[#f0f0f5]";
}
function sizeClass(s: Size): string {
  if (s === "sm") return "px-3 py-1.5 text-xs rounded-lg";
  if (s === "lg") return "px-6 py-3 text-base rounded-xl";
  return "px-4 py-2 text-sm rounded-xl";
}
export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", loading, disabled, children, className = "", ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled ?? loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variantClass(variant)} ${sizeClass(size)} ${className}`}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {children}
    </button>
  );
}
