"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
export default function SignupPage() {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast("Les mots de passe ne correspondent pas", "error"); return; }
    if (password.length < 8) { toast("Le mot de passe doit contenir au moins 8 caractères", "error"); return; }
    setLoading(true);
    try {
      await signUp(email, password);
      toast("Compte créé ! Vérifiez votre email pour confirmer.", "success");
      router.push("/login");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur lors de la création du compte", "error");
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
        <h1 className="text-xl font-bold text-[#f0f0f5] mb-1">Créer un compte</h1>
        <p className="text-sm text-[#9999b0] mb-7">Rejoignez Sendia et automatisez vos emails.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" required autoComplete="email" />
          <Input label="Mot de passe" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="new-password" hint="Minimum 8 caractères" />
          <Input label="Confirmer le mot de passe" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required autoComplete="new-password" />
          <Button type="submit" loading={loading} size="lg" className="w-full mt-1">Créer mon compte</Button>
        </form>
        <p className="mt-6 text-center text-sm text-[#66667a]">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-[#4f6ef7] hover:text-[#6b85ff] font-medium transition-colors">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
