"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@/hooks/useAuthActions";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
export default function SignupPage() {
  const { signUp, toast } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast("Les mots de passe ne correspondent pas", "error"); return; }
    if (password.length < 8) { toast("Minimum 8 caractères requis", "error"); return; }
    setLoading(true);
    try {
      await signUp(email, password);
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur lors de la création du compte", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Créer un compte" subtitle="Rejoignez Sendia et automatisez vos emails.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <Input label="Email" type="email" value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="vous@exemple.com" required autoComplete="email" />
        <Input label="Mot de passe" type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••" required autoComplete="new-password" hint="Minimum 8 caractères" />
        <Input label="Confirmer le mot de passe" type="password" value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••" required autoComplete="new-password" />
        <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
          Créer mon compte
        </Button>
      </form>
      <p className="mt-6 text-center text-[0.9rem] text-[#9999b0]">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-[#6b85ff] hover:underline font-semibold">
          Se connecter
        </Link>
      </p>
    </AuthCard>
  );
}
