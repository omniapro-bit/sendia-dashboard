"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const { toast } = useToast();
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
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-xl bg-[#4f6ef7] flex items-center justify-center text-white font-bold text-lg">S</div>
        <span className="text-2xl font-extrabold tracking-tight text-[#f0f0f5]">Sendia</span>
      </div>
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-8 md:p-10">
        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-emerald-400">✓</span>
            </div>
            <h1 className="text-xl font-bold text-[#f0f0f5] mb-2">Email envoyé</h1>
            <p className="text-sm text-[#9999b0] mb-6">Vérifiez votre boîte mail et cliquez sur le lien de réinitialisation.</p>
            <Link href="/login" className="text-sm text-[#4f6ef7] hover:text-[#6b85ff] font-medium transition-colors">Retour à la connexion</Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-[#f0f0f5] mb-1">Mot de passe oublié</h1>
            <p className="text-sm text-[#9999b0] mb-7">Entrez votre email pour recevoir un lien de réinitialisation.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" required autoComplete="email" />
              <Button type="submit" loading={loading} size="lg" className="w-full">Envoyer le lien</Button>
            </form>
            <p className="mt-6 text-center text-sm text-[#66667a]">
              <Link href="/login" className="text-[#4f6ef7] hover:text-[#6b85ff] font-medium transition-colors">Retour à la connexion</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
