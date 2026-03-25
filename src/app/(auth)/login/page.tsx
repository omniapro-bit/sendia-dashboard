"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@/hooks/useAuthActions";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const { signIn, toast } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur de connexion", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Connexion" subtitle="Accedez a votre tableau de bord.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <Input label="Email" type="email" value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="vous@exemple.com" required autoComplete="email" />
        <div>
          <Input label="Mot de passe" type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password" />
          <div className="flex justify-end mt-2">
            <Link href="/forgot-password" className="text-[0.82rem] text-[#66667a] hover:text-[#6b85ff] transition-colors">
              Mot de passe oublie ?
            </Link>
          </div>
        </div>
        <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
          Se connecter
        </Button>
      </form>
      <p className="mt-6 text-center text-[0.9rem] text-[#9999b0]">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="text-[#6b85ff] hover:underline font-semibold">
          S&apos;inscrire
        </Link>
      </p>
    </AuthCard>
  );
}
