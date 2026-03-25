"use client";
import { type TextareaHTMLAttributes } from "react";
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}
export function Textarea(props: TextareaProps) {
  const { label, error, hint, className = "", id, ...rest } = props;
  const areaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={areaId} className="text-sm font-medium text-[#9999b0]">{label}</label>
      )}
      <textarea
        {...rest}
        id={areaId}
        className={`w-full px-4 py-2.5 rounded-xl bg-[#12121a] border text-[#f0f0f5] placeholder-[#66667a] text-sm transition-colors outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 resize-none ${error ? "border-[#f87171]/60 focus:border-[#f87171]" : "border-[#2a2a3a] focus:border-[#4f6ef7]/60"} ${className}`}
      />
      {error && <p className="text-xs text-[#f87171]">{error}</p>}
      {hint && !error && <p className="text-xs text-[#66667a]">{hint}</p>}
    </div>
  );
}
