"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function clearLocalStorageAuth() {
  const keys = Object.keys(localStorage).filter(
    k => k.startsWith("sb-") || k.startsWith("sendia-auth"),
  );
  keys.forEach(k => localStorage.removeItem(k));
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    if (newPassword.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas.");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast("Mot de passe mis à jour avec succès.", "success");
    } catch {
      toast("Erreur lors de la mise à jour du mot de passe.", "error");
    } finally {
      setSavingPassword(false);
    }
  }
  async function handleSignOut() {
    setSigningOut(true);
    try {
      clearLocalStorageAuth();
      await signOut();
    } catch {
      toast("Erreur lors de la déconnexion.", "error");
      setSigningOut(false);
    }
  }
  return (
    <div className="px-4 md:px-8 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Paramètres</h1>
        <p className="text-[#9999b0] mt-1">Gérez votre compte et votre sécurité.</p>
      </div>

      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#2a2a3a]">
          <h2 className="text-base font-semibold text-[#f0f0f5]">Informations du compte</h2>
        </div>
        <div className="px-6 py-5 flex flex-col gap-3">
          <div className="flex items-center justify-between py-2 border-b border-[#2a2a3a]/60">
            <span className="text-sm text-[#9999b0]">Adresse e-mail</span>
            <span className="text-sm font-medium text-[#f0f0f5]">{user?.email ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#2a2a3a]/60">
            <span className="text-sm text-[#9999b0]">Identifiant utilisateur</span>
            <span className="text-xs font-mono text-[#66667a] truncate max-w-[180px]">{user?.id ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-[#9999b0]">Membre depuis</span>
            <span className="text-sm font-medium text-[#f0f0f5]">{formatDate(user?.created_at)}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#2a2a3a]">
          <h2 className="text-base font-semibold text-[#f0f0f5]">Changer le mot de passe</h2>
        </div>
        <div className="px-6 py-5 flex flex-col gap-5">
          <Input
            label="Nouveau mot de passe"
            type="password"
            value={newPassword}
            onChange={e => { setNewPassword(e.target.value); setPasswordError(""); }}
            placeholder="8 caractères minimum"
            autoComplete="new-password"
          />
          <Input
            label="Confirmer le mot de passe"
            type="password"
            value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); setPasswordError(""); }}
            placeholder="Répétez le mot de passe"
            autoComplete="new-password"
            error={passwordError || undefined}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={savingPassword} size="md">
              Mettre à jour le mot de passe
            </Button>
          </div>
        </div>
      </form>

      <div className="bg-[#16161f] border border-[#f87171]/20 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f87171]/20">
          <h2 className="text-base font-semibold text-[#f87171]">Zone de danger</h2>
        </div>
        <div className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-medium text-[#f0f0f5]">Se déconnecter</p>
            <p className="text-xs text-[#66667a] mt-0.5">Vous serez redirigé vers la page de connexion.</p>
          </div>
          <Button variant="danger" size="md" loading={signingOut} onClick={handleSignOut}>
            Se déconnecter
          </Button>
        </div>
      </div>
    </div>
  );
}
