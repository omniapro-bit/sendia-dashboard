"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Image from "next/image";
export default function LoginPage() {
  const { signIn } = useAuth();
  const { toast } = useToast();
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
      const msg = err instanceof Error ? err.message : "Erreur de connexion";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-center gap-2.5 mb-10">
        <Image src="/logo-icon.png" alt="Sendia" width={36} height={36} className="rounded-xl" />
        <span className="text-2xl font-extrabold tracking-tight text-[#f0f0f5]">Sendia</span>
      </div>
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-8 md:p-10">
        <h1 className="text-xl font-bold text-[#f0f0f5] mb-1">Connexion</h1>
        <p className="text-sm text-[#9999b0] mb-7">Accédez à votre tableau de bord.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            required
            autoComplete="email"
          />
          <Input
            label="Mot de passe"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-[#4f6ef7] hover:text-[#6b85ff] transition-colors">
              Mot de passe oublié ?
            </Link>
          </div>
          <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
            Se connecter
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-[#66667a]">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="text-[#4f6ef7] hover:text-[#6b85ff] font-medium transition-colors">
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
