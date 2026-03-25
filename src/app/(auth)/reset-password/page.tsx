"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
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
    if (password.length < 8) { toast("Minimum 8 caractères requis", "error"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast("Mot de passe mis à jour avec succès !", "success");
      router.push("/login");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur lors de la mise à jour", "error");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-xl bg-[#4f6ef7] flex items-center justify-center text-white font-bold text-lg">S</div>
        <span className="text-2xl font-extrabold tracking-tight text-[#f0f0f5]">Sendia</span>
      </div>
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-8 md:p-10">
        <h1 className="text-xl font-bold text-[#f0f0f5] mb-1">Nouveau mot de passe</h1>
        <p className="text-sm text-[#9999b0] mb-7">Choisissez un nouveau mot de passe sécurisé.</p>
        {!ready && (
          <p className="text-sm text-[#fb923c] mb-4">Lien de réinitialisation en cours de vérification...</p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nouveau mot de passe" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required disabled={!ready} hint="Minimum 8 caractères" />
          <Input label="Confirmer le mot de passe" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required disabled={!ready} />
          <Button type="submit" loading={loading} disabled={!ready} size="lg" className="w-full">Mettre à jour</Button>
        </form>
      </div>
    </div>
  );
}
