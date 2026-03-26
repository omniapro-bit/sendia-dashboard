"use client";
import Link from "next/link";

export function UpgradeGate({
  allowed,
  featureName,
  children,
}: {
  allowed: boolean;
  featureName: string;
  children: React.ReactNode;
}) {
  if (allowed) return <>{children}</>;

  return (
    <div className="relative">
      <div className="opacity-30 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-[#12121a] border border-[#2a2a3a] rounded-2xl p-6 text-center max-w-sm">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[rgba(79,110,247,0.1)] border border-[rgba(79,110,247,0.3)] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f6ef7" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#f0f0f5]">{featureName}</p>
          <p className="text-xs text-[#66667a] mt-1">Disponible avec le plan Professional</p>
          <Link
            href="/billing"
            className="inline-block mt-4 px-4 py-2 bg-[#4f6ef7] text-white text-xs font-semibold rounded-lg hover:bg-[#3d5ce5] transition-colors"
          >
            Voir les plans
          </Link>
        </div>
      </div>
    </div>
  );
}
