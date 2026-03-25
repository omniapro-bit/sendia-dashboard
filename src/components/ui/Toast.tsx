"use client";
import { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };
type ToastContextValue = { toast: (message: string, type?: ToastType) => void };

const ToastContext = createContext<ToastContextValue | null>(null);
let toastCounter = 0;

type ToastConfig = {
  iconPath: string;
  background: string;
  borderColor: string;
  color: string;
};

const TOAST_CONFIG: Record<ToastType, ToastConfig> = {
  success: {
    iconPath:    "M5 13l4 4L19 7",
    background:  "rgba(52,211,153,0.10)",
    borderColor: "rgba(52,211,153,0.22)",
    color:       "#34d399",
  },
  error: {
    iconPath:    "M18 6L6 18M6 6l12 12",
    background:  "rgba(248,113,113,0.10)",
    borderColor: "rgba(248,113,113,0.22)",
    color:       "#f87171",
  },
  info: {
    iconPath:    "M12 8v4M12 16h.01",
    background:  "rgba(79,110,247,0.10)",
    borderColor: "rgba(79,110,247,0.22)",
    color:       "#6b85ff",
  },
};

function ToastItem({ t }: { t: Toast }) {
  const cfg = TOAST_CONFIG[t.type];
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium pointer-events-auto animate-in"
      style={{
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        minWidth: 260,
        maxWidth: 380,
        background: cfg.background,
        borderColor: cfg.borderColor,
        color: cfg.color,
      }}
    >
      <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <path d={cfg.iconPath} />
        </svg>
      </span>
      <span className="leading-snug">{t.message}</span>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => <ToastItem key={t.id} t={t} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
