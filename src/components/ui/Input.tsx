"use client";
import { type InputHTMLAttributes } from "react";
import { FormField, FieldAnnotations, fieldId, borderClass } from "./FormField";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldAnnotations {}

export function Input(props: InputProps) {
  const { label, error, hint, className = "", id, ...rest } = props;
  const fid = fieldId(id, label);

  return (
    <FormField fieldId={fid} label={label} error={error} hint={hint}>
      <input
        {...rest}
        id={fid}
        className={`w-full px-4 py-2.5 rounded-xl bg-[#12121a] border text-[#f0f0f5] placeholder-[#66667a] text-sm transition-colors duration-150 outline-none focus:ring-2 focus:ring-[#4f6ef7]/30 ${borderClass(error)} ${className}`}
      />
    </FormField>
  );
}
