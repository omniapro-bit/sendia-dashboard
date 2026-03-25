"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthActions } from "@/hooks/useAuthActions";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
export default function ResetPasswordPage() {
  const { toast } = useAuthActions();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
  }, []);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast("Les mots de passe ne correspondent pas", "error"); return; }
    if (password.length < 8) { toast("Minimum 8 caracteres requis", "error"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast("Mot de passe mis a jour avec succes !", "success");
      router.push("/login");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur lors de la mise a jour", "error");
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthCard title="Nouveau mot de passe" subtitle="Choisissez un nouveau mot de passe securise.">
      {!ready && (
        <p className="text-sm mb-4" style={{ color: "#fb923c" }}>
          Lien de reinitialisation en cours de verification...
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <Input label="Nouveau mot de passe" type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••" required disabled={!ready} hint="Minimum 8 caracteres" />
        <Input label="Confirmer le mot de passe" type="password" value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••" required disabled={!ready} />
        <Button type="submit" loading={loading} disabled={!ready} size="lg" className="w-full">
          Mettre a jour
        </Button>
      </form>
    </AuthCard>
  );
}
