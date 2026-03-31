"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
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

function TwoFactorSection() {
  const { toast } = useToast();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrUri, setQrUri] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp ?? [];
      const verified = totp.find((f) => f.status === "verified");
      setMfaEnabled(!!verified);
      if (verified) setFactorId(verified.id);
      setLoading(false);
    });
  }, []);

  async function handleEnroll() {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Sendia" });
      if (error) throw error;
      setQrUri(data.totp.uri);
      setFactorId(data.id);
    } catch {
      toast("Erreur lors de la configuration 2FA.", "error");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (verifyCode.length !== 6) return;
    setVerifying(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: verifyCode });
      if (verify.error) throw verify.error;
      setMfaEnabled(true);
      setQrUri("");
      setVerifyCode("");
      toast("2FA activ\u00e9e avec succ\u00e8s.", "success");
    } catch {
      toast("Code invalide. R\u00e9essayez.", "error");
    } finally {
      setVerifying(false);
    }
  }

  async function handleUnenroll() {
    setUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setMfaEnabled(false);
      setFactorId("");
      toast("2FA d\u00e9sactiv\u00e9e.", "success");
    } catch {
      toast("Erreur lors de la d\u00e9sactivation.", "error");
    } finally {
      setUnenrolling(false);
    }
  }

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-[#2a2a3a]">
        <h2 className="text-base font-semibold text-[#f0f0f5]">{"Authentification \u00e0 deux facteurs"}</h2>
      </div>
      <div className="px-6 py-5">
        {loading ? (
          <p className="text-sm text-[#66667a]">Chargement...</p>
        ) : mfaEnabled ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#34d399]" />
                <p className="text-sm font-medium text-[#f0f0f5]">{"2FA activ\u00e9e"}</p>
              </div>
              <p className="text-xs text-[#66667a] mt-0.5">{"Votre compte est prot\u00e9g\u00e9 par l'authentification \u00e0 deux facteurs."}</p>
            </div>
            <Button variant="danger" size="md" loading={unenrolling} onClick={handleUnenroll}>
              {"D\u00e9sactiver la 2FA"}
            </Button>
          </div>
        ) : qrUri ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-[#9999b0] text-center">{"Scannez ce QR code avec Google Authenticator, Authy ou toute application TOTP."}</p>
            <div className="bg-white p-4 rounded-xl">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`} alt="QR Code 2FA" width={200} height={200} />
            </div>
            <form onSubmit={handleVerify} className="flex items-center gap-3 mt-2">
              <Input
                label=""
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Code à 6 chiffres"
                autoComplete="one-time-code"
              />
              <Button type="submit" loading={verifying} size="md" disabled={verifyCode.length !== 6}>
                Activer
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-[#f0f0f5]">{"Double authentification (2FA)"}</p>
              <p className="text-xs text-[#66667a] mt-0.5">{"Ajoutez une couche de s\u00e9curit\u00e9 suppl\u00e9mentaire \u00e0 votre compte."}</p>
            </div>
            <Button variant="secondary" size="md" loading={enrolling} onClick={handleEnroll}>
              Configurer la 2FA
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [exporting, setExporting] = useState(false);
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
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Paramètres</h1>
        <p className="text-[#9999b0] mt-1">Gérez votre compte et votre sécurité.</p>
      </div>

      {/* Abonnement */}
      <Link
        href="/billing"
        className="no-underline block bg-[#16161f] border border-[#2a2a3a] rounded-2xl overflow-hidden mb-6 hover:border-[#4f6ef7]/50 transition-colors group"
      >
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#66667a] mb-1">Compte</p>
            <p className="text-base font-semibold text-[#f0f0f5]">Abonnement</p>
            <p className="text-xs text-[#9999b0] mt-0.5">Gérez votre plan et votre facturation</p>
          </div>
          <svg
            className="w-5 h-5 text-[#66667a] group-hover:text-[#4f6ef7] transition-colors shrink-0"
            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

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

      {/* 2FA */}
      <TwoFactorSection />

      {/* Export */}
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#2a2a3a]">
          <h2 className="text-base font-semibold text-[#f0f0f5]">Vos données</h2>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-[#f0f0f5]">Exporter mes données</p>
              <p className="text-xs text-[#66667a] mt-0.5">Téléchargez un export JSON de votre profil, emails traités et documents.</p>
            </div>
            <Button variant="secondary" size="md" loading={exporting} onClick={async () => {
              setExporting(true);
              try {
                const [stats, emails, profileData] = await Promise.all([
                  api.getStats(),
                  api.getEmails(100, 0),
                  api.getProfile(),
                ]);
                const exportData = { profile: profileData, stats, emails: emails.emails, exported_at: new Date().toISOString() };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `sendia-export-${new Date().toISOString().split("T")[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast("Export téléchargé.", "success");
              } catch {
                toast("Erreur lors de l'export.", "error");
              } finally {
                setExporting(false);
              }
            }}>
              Exporter (JSON)
            </Button>
          </div>
        </div>
      </div>

      {/* Zone de danger */}
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
        <div className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap border-t border-[#f87171]/20">
          <div>
            <p className="text-sm font-medium text-[#f0f0f5]">Supprimer mon compte</p>
            <p className="text-xs text-[#66667a] mt-0.5">Toutes vos données seront définitivement supprimées. Cette action est irréversible.</p>
          </div>
          <a
            href="mailto:contact@getsendia.com?subject=Demande%20de%20suppression%20de%20compte&body=Bonjour%2C%0A%0AJe%20souhaite%20supprimer%20mon%20compte%20Sendia.%0A%0AEmail%20du%20compte%20%3A%20%0A%0AMerci."
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171] hover:bg-[#f87171]/20 transition-colors no-underline"
          >
            Contacter le support
          </a>
        </div>
      </div>
    </div>
  );
}
