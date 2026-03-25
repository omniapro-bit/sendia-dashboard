"use client";
import { type InputHTMLAttributes } from "react";
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}
export function Input(props: InputProps) {
  const { label, error, hint, className = "", id, ...rest } = props;
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#9999b0]">
          {label}
        </label>
      )}
      <input
        {...rest}
        id={inputId}
        className={`w-full px-4 py-2.5 rounded-xl bg-[#12121a] border text-[#f0f0f5] placeholder-[#66667a] text-sm transition-colors outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 ${error ? "border-[#f87171]/60 focus:border-[#f87171]" : "border-[#2a2a3a] focus:border-[#4f6ef7]/60"} ${className}`}
      />
      {error && <p className="text-xs text-[#f87171]">{error}</p>}
      {hint && !error && <p className="text-xs text-[#66667a]">{hint}</p>}
    </div>
  );
}
