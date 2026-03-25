"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative w-11 h-6 rounded-full
          transition-colors duration-200
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4f6ef7]/60
          disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? "bg-[#34d399]" : "bg-[#2a2a3a]"}
        `.replace(/\s+/g, " ").trim()}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-5 h-5
            bg-white rounded-full shadow-sm
            transition-transform duration-200
            ${checked ? "translate-x-5" : "translate-x-0"}
          `.replace(/\s+/g, " ").trim()}
        />
      </button>
      {label && (
        <span className="text-sm font-medium text-[#f0f0f5]">{label}</span>
      )}
    </label>
  );
}
