"use client";
import { type SelectHTMLAttributes } from "react";
export interface SelectOption { value: string; label: string }
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}
export function Select(props: SelectProps) {
  const { label, error, options, className = "", id, ...rest } = props;
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-[#9999b0]">{label}</label>
      )}
      <select
        {...rest}
        id={selectId}
        className={`w-full px-4 py-2.5 rounded-xl bg-[#12121a] border text-[#f0f0f5] text-sm transition-colors outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 ${error ? "border-[#f87171]/60" : "border-[#2a2a3a] focus:border-[#4f6ef7]/60"} ${className}`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-[#f87171]">{error}</p>}
    </div>
  );
}
