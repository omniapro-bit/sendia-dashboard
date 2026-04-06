import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Warn at build time (SSG pages), throw at runtime (client-side)
  if (typeof window !== "undefined") {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  console.warn("⚠ Supabase env vars missing — SSG pre-render will skip auth.");
}

export const supabase = createClient(SUPABASE_URL || "https://placeholder.supabase.co", SUPABASE_ANON_KEY || "placeholder", {
  auth: {
    storageKey: "sendia-auth",
    persistSession: true,
    autoRefreshToken: true,
  },
});
