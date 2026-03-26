import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://mhfuellvcjtlyehldqja.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZnVlbGx2Y2p0bHllaGxkcWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5MDc1NjQsImV4cCI6MjA1NzQ4MzU2NH0.7FfmjMDOpRqNLj2Eqk1gZNNWNhx6Q3Y1gHmLxMVPoHc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: "sendia-auth",
    persistSession: true,
    autoRefreshToken: true,
  },
});
