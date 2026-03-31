"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuthActions } from "@/hooks/useAuthActions";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
export default function ForgotPasswordPage() {
  const { sendPasswordReset, toast } = useAuthActions();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
      toast("Email de réinitialisation envoyé !", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur lors de l'envoi", "error");
    } finally {
      setLoading(false);
    }
  }
  if (sent) {
    return (
      <AuthCard title="Email envoyé" subtitle="Vérifiez votre boîte mail et cliquez sur le lien de réinitialisation.">
        <div className="text-center mt-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(52,211,153,0.1)" }}>
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#34d399" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <Link href="/login" className="text-sm text-[#6b85ff] hover:underline font-semibold">
            Retour à la connexion
          </Link>
        </div>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Mot de passe oublié" subtitle="Entrez votre email pour recevoir un lien de réinitialisation.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <Input label="Email" type="email" value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="vous@exemple.com" required autoComplete="email" />
        <Button type="submit" loading={loading} size="lg" className="w-full">
          Envoyer le lien
        </Button>
      </form>
      <p className="mt-6 text-center text-[0.9rem] text-[#9999b0]">
        <Link href="/login" className="text-[#6b85ff] hover:underline font-semibold">
          Retour à la connexion
        </Link>
      </p>
    </AuthCard>
  );
}
