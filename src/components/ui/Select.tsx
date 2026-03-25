"use client";
import { type SelectHTMLAttributes } from "react";
import { FormField, FieldAnnotations, SelectOption, fieldId, borderClass } from "./FormField";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldAnnotations {
  options: SelectOption[];
}

export type { SelectOption };

export function Select(props: SelectProps) {
  const { label, error, hint, options, className = "", id, ...rest } = props;
  const fid = fieldId(id, label);

  return (
    <FormField fieldId={fid} label={label} error={error} hint={hint}>
      <select
        {...rest}
        id={fid}
        className={`w-full px-4 py-2.5 rounded-xl bg-[#12121a] border text-[#f0f0f5] text-sm transition-colors duration-150 outline-none focus:ring-2 focus:ring-[#4f6ef7]/30 ${borderClass(error)} ${className}`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </FormField>
  );
}
