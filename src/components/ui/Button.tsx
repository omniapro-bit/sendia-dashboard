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
  switch (v) {
    case "primary":
      return "bg-[#4f6ef7] hover:bg-[#6b85ff] text-white";
    case "secondary":
      return "bg-[#1c1c28] hover:bg-[#22223a] text-[#f0f0f5] border border-[#2a2a3a] hover:border-[#333348]";
    case "danger":
      return "bg-[#f87171]/10 hover:bg-[#f87171]/20 text-[#f87171] border border-[#f87171]/25 hover:border-[#f87171]/40";
    case "ghost":
    default:
      return "hover:bg-[#1c1c28] text-[#9999b0] hover:text-[#f0f0f5]";
  }
}

function sizeClass(s: Size): string {
  switch (s) {
    case "sm":  return "px-3 py-1.5 text-xs rounded-lg gap-1.5";
    case "lg":  return "px-5 py-3 text-sm rounded-xl gap-2";
    case "md":
    default:    return "px-4 py-2 text-sm rounded-xl gap-2";
  }
}

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading,
    disabled,
    children,
    className = "",
    ...rest
  } = props;

  return (
    <button
      {...rest}
      disabled={disabled ?? loading}
      className={`
        inline-flex items-center justify-center font-semibold
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClass(variant)}
        ${sizeClass(size)}
        ${className}
      `.replace(/\s+/g, " ").trim()}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {children}
    </button>
  );
}
