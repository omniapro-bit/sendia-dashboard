"use client";
import { type TextareaHTMLAttributes } from "react";
import { FormField, FieldAnnotations, fieldId, borderClass } from "./FormField";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldAnnotations {}

export function Textarea(props: TextareaProps) {
  const { label, error, hint, className = "", id, ...rest } = props;
  const fid = fieldId(id, label);

  return (
    <FormField fieldId={fid} label={label} error={error} hint={hint}>
      <textarea
        {...rest}
        id={fid}
        className={`w-full px-4 py-2.5 rounded-xl bg-[#12121a] border text-[#f0f0f5] placeholder-[#66667a] text-sm leading-relaxed transition-colors duration-150 outline-none resize-none focus:ring-2 focus:ring-[#4f6ef7]/30 ${borderClass(error)} ${className}`}
      />
    </FormField>
  );
}
