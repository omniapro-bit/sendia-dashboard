"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";

/**
 * Convenience hook that co-locates the auth context and toast helper
 * so individual auth pages don't repeat the same two hook calls.
 */
export function useAuthActions() {
  const auth = useAuth();
  const { toast } = useToast();
  return { ...auth, toast };
}
