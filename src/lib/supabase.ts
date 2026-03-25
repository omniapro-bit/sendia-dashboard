import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mhfuellvcjtlyehldqja.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZnVlbGx2Y2p0bHllaGxkcWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjM4NTcsImV4cCI6MjA4MzAzOTg1N30.QTFP3_HC3l9FzMo2qhPJOIBuUgSJbX_s25tftQeWle0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: "sendia-auth",
    persistSession: true,
    autoRefreshToken: true,
  },
});
