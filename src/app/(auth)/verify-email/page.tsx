"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

function VerifyEmailContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // L’email provient soit de l’utilisateur connecté, soit du paramètre d’URL passé depuis signup
  const email = user?.email ?? searchParams.get("email") ?? "";

  // Redirige vers /dashboard dès que l’email est confirmé
  useEffect(() => {
    if (!loading && user?.email_confirmed_at) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // Si l’utilisateur n’existe pas et que le chargement est terminé, renvoie vers /signup
  useEffect(() => {
    if (!loading && !user && !searchParams.get("email")) {
      router.replace("/signup");
    }
  }, [user, loading, router, searchParams]);

  function startCountdown() {
    setCountdown(60);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function handleResend() {
    if (!email) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast("Email de confirmation renvoyé !", "success");
      startCountdown();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Erreur lors de l’envoi",
        "error"
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthCard
      title="Vérifiez votre boîte email"
      subtitle={
        email
          ? `Un lien de confirmation a été envoyé à ${email}. Cliquez dessus pour activer votre compte.`
          : "Un lien de confirmation a été envoyé à votre adresse email. Cliquez dessus pour activer votre compte."
      }
    >
      <div className="flex flex-col items-center gap-6 mt-2">
        {/* Icône enveloppe */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "rgba(79,110,247,0.12)", border: "1px solid rgba(79,110,247,0.25)" }}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#6b85ff"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <p className="text-[0.88rem] text-[#66667a] text-center">
          Vérifiez aussi vos spams si vous ne trouvez pas l’email.
        </p>

        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          loading={resending}
          disabled={resending || countdown > 0}
          onClick={handleResend}
        >
          {countdown > 0
            ? `Renvoyer l’email (${countdown}s)`
            : "Renvoyer l’email"}
        </Button>

        <p className="text-[0.82rem] text-[#66667a] text-center">
          Déjà un compte confirmé ?{" "}
          <a href="/login" className="text-[#6b85ff] hover:underline font-semibold">
            Se connecter
          </a>
        </p>
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
