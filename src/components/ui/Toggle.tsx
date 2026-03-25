"use client";
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}
export function Toggle(props: ToggleProps) {
  const { checked, onChange, disabled, label } = props;
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 disabled:opacity-50 disabled:cursor-not-allowed ${checked ? "bg-[#4f6ef7]" : "bg-[#2a2a3a]"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
      {label && <span className="text-sm font-medium text-[#f0f0f5]">{label}</span>}
    </label>
  );
}
