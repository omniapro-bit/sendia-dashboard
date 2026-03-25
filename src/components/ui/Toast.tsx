"use client";
import { createContext, useContext, useState, useCallback } from "react";
type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };
type ToastContextValue = { toast: (message: string, type?: ToastType) => void };
const ToastContext = createContext<ToastContextValue | null>(null);
let toastCounter = 0;
const TOAST_ICON: Record<ToastType, string> = { success: "✓", error: "✕", info: "i" };
function toastClass(type: ToastType): string {
  if (type === "success") return "bg-emerald-400/10 border-emerald-400/30 text-emerald-400";
  if (type === "error") return "bg-red-400/10 border-red-400/30 text-red-400";
  return "bg-indigo-400/10 border-indigo-400/30 text-indigo-400";
}
function ToastItem({ t }: { t: Toast }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium backdrop-blur-sm shadow-lg pointer-events-auto ${toastClass(t.type)}`}>
      <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs shrink-0">
        {TOAST_ICON[t.type]}
      </span>
      {t.message}
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
