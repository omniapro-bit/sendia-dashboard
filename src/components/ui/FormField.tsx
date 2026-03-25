/**
 * Shared primitives for form field components (Input, Textarea, Select).
 * Single source of truth for layout, id derivation, and border state.
 */

/** Common annotation props shared by all field components. */
export interface FieldAnnotations {
  label?: string;
  error?: string;
  hint?: string;
}

export interface SelectOption { value: string; label: string }

export function FormField(props: {
  fieldId: string | undefined;
  label: string | undefined;
  error: string | undefined;
  hint: string | undefined;
  children: React.ReactNode;
}) {
  const { fieldId, label, error, hint, children } = props;
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={fieldId} className="text-sm font-semibold text-[#b0b0c0] leading-none">
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-[#f87171] leading-none">{error}</p>}
      {hint && !error && <p className="text-xs text-[#66667a] leading-none">{hint}</p>}
    </div>
  );
}

/** Derives a stable element id from an optional label string. */
export function fieldId(id: string | undefined, label: string | undefined): string | undefined {
  return id ?? label?.toLowerCase().replace(/\s+/g, "-");
}

/** Returns border classes driven by error presence. */
export function borderClass(error: string | undefined): string {
  return error
    ? "border-[#f87171]/50 focus:border-[#f87171]/80"
    : "border-[#2a2a3a] hover:border-[#333348] focus:border-[#4f6ef7]/50";
}
