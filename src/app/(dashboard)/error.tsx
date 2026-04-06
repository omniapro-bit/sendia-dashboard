"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
          <span className="text-red-400 text-xl">!</span>
        </div>
        <h2 className="text-lg font-semibold text-white">Une erreur est survenue</h2>
        <p className="text-sm text-gray-400">
          Un probleme inattendu s&apos;est produit. Vous pouvez reessayer ou revenir au tableau de bord.
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition"
          >
            Reessayer
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition"
          >
            Tableau de bord
          </a>
        </div>
      </div>
    </div>
  );
}
