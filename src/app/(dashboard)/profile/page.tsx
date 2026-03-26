"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { ProfileUpdateBody } from "@/lib/types";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Spinner } from "@/components/ui/Spinner";
import { TONE_OPTIONS, DEFAULT_TONE } from "./profile-config";

// ─── Provider config ───────────────────────────────────────────────────────────

type ProviderId = "gmail" | "outlook";
type ProviderHrefs = Record<ProviderId, string>;

function buildOAuthHref(base: string, params: Record<string, string>): string {
  return `${base}?${new URLSearchParams(params).toString()}`;
}

function getProviderHrefs(clientId: string): ProviderHrefs {
  const state = encodeURIComponent(JSON.stringify({ client_id: clientId }));
  return {
    gmail: buildOAuthHref("https://accounts.google.com/o/oauth2/v2/auth", {
      client_id: "274786161227-iiip3l1i6bm5rnjngp9r8tsqa57ssrah.apps.googleusercontent.com",
      redirect_uri: "https://n8n.getsendia.com/webhook/oauth-callback",
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.labels",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    }),
    outlook: buildOAuthHref("https://login.microsoftonline.com/common/oauth2/v2.0/authorize", {
      client_id: "ead1260f-07d2-4220-b215-e0af081e67fc",
      redirect_uri: "https://n8n.getsendia.com/webhook/outlook-oauth-callback",
      response_type: "code",
      scope: "offline_access Mail.ReadWrite Mail.Send Calendars.ReadWrite User.Read",
      prompt: "consent",
      state,
    }),
  };
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

// Single icon component for both providers — eliminates the duplicate svg-wrapper pattern
function ProviderIcon({ id, size = 20 }: { id: ProviderId; size?: number }) {
  if (id === "gmail") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.583a.793.793 0 0 1-.583.238h-8.404V6.566h8.404c.23 0 .424.08.583.238.159.159.238.353.238.583zM13.5 2.25v19.5L0 19.5V4.5l13.5-2.25z" />
    </svg>
  );
}

// Reusable card with titled header + body
function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#12121a] border border-[#2a2a3a] rounded-2xl overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-[#2a2a3a]">
        <h2 className="text-base font-semibold text-[#f0f0f5]">{title}</h2>
      </div>
      <div className="px-6 py-5 flex flex-col gap-5">{children}</div>
    </div>
  );
}

// Reusable provider anchor — type inlined to avoid duplicate type+function structural pattern
function ProviderLink(props: { href: string; id: ProviderId; label: string; iconSize: number; className: string }) {
  return (
    <a href={props.href} className={`flex items-center gap-2.5 no-underline transition-all ${props.className}`}>
      <ProviderIcon id={props.id} size={props.iconSize} />
      {props.label}
    </a>
  );
}

// ─── Email connection section ──────────────────────────────────────────────────

function ProviderInfo({ label, email }: { label: string; email?: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#f0f0f5] flex items-center gap-2">
        {label} connecté
        <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse inline-block" />
      </p>
      {email && <p className="text-xs text-[#9999b0] mt-0.5">{email}</p>}
    </div>
  );
}

function ProviderRow({
  id, connected, email, href,
}: {
  id: ProviderId;
  connected: boolean;
  email?: string;
  href: string;
}) {
  const label = id === "gmail" ? "Gmail" : "Outlook";
  if (connected) {
    return (
      <div className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl bg-[#1a1a2a] border border-green-500/20">
        <div className="flex items-center gap-3">
          <ProviderIcon id={id} size={18} />
          <ProviderInfo label={label} email={email} />
        </div>
        <a
          href={href}
          className="text-xs text-[#66667a] hover:text-[#9999b0] border border-[#2a2a3a] rounded-lg px-2.5 py-1 transition-colors no-underline"
        >
          Reconnecter
        </a>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl bg-[#1a1a2a] border border-[#2a2a3a]">
      <div className="flex items-center gap-3">
        <ProviderIcon id={id} size={18} />
        <p className="text-sm text-[#9999b0]">{label} — non connecté</p>
      </div>
      <a
        href={href}
        className="text-xs font-semibold text-[#4f6ef7] hover:text-[#6b85ff] border border-[#4f6ef7]/40 hover:border-[#6b85ff] rounded-lg px-2.5 py-1 transition-colors no-underline"
      >
        Connecter
      </a>
    </div>
  );
}

function EmailConnectionSection(props: {
  gmailConnected: boolean;
  outlookConnected: boolean;
  emailLoading: boolean;
  gmailEmail: string | undefined;
  outlookEmail: string | undefined;
  hrefs: ProviderHrefs;
}) {
  const { gmailConnected, outlookConnected, emailLoading, gmailEmail, outlookEmail, hrefs } = props;
  const anyConnected = gmailConnected || outlookConnected;
  const borderCls = emailLoading || !anyConnected ? "border-[#4f6ef7]/30" : "border-green-500/30";

  return (
    <div className={`bg-[#12121a] border ${borderCls} rounded-2xl p-6 mb-6`}>
      {emailLoading ? (
        <div className="flex justify-center py-4"><Spinner size="md" /></div>
      ) : (
        <>
          <h2 className="text-base font-semibold text-[#f0f0f5] mb-1">
            {anyConnected ? "Email connecté" : "Connectez votre boîte email"}
          </h2>
          {!anyConnected && (
            <p className="text-sm text-[#9999b0] mb-4">
              Sendia analyse vos emails et vous propose des réponses intelligentes via WhatsApp.
            </p>
          )}
          <div className="flex flex-col gap-2 mt-3">
            <ProviderRow
              id="gmail"
              connected={gmailConnected}
              email={gmailConnected ? gmailEmail : undefined}
              href={hrefs.gmail}
            />
            <ProviderRow
              id="outlook"
              connected={outlookConnected}
              email={outlookConnected ? outlookEmail : undefined}
              href={hrefs.outlook}
            />
          </div>
          {!anyConnected && (
            <p className="text-xs text-[#66667a] mt-4">
              Vos données restent privées — aucun contenu d&apos;email n&apos;est stocké.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Form types & helpers ──────────────────────────────────────────────────────

type ProfileFields = {
  client_name: string;
  company_name: string;
  signature: string;
  tone_preference: string;
  custom_prompt_context: string;
  is_active: boolean;
};
type ProfileInput = ProfileFields & { whatsapp_number?: string };
type FormState = ProfileFields & { whatsapp_number: string };

function emptyForm(): FormState {
  return {
    client_name: "",
    company_name: "",
    whatsapp_number: "",
    signature: "",
    tone_preference: DEFAULT_TONE,
    custom_prompt_context: "",
    is_active: false,
  };
}

function profileToForm(p: ProfileInput): FormState {
  return {
    client_name: p.client_name ?? "",
    company_name: p.company_name ?? "",
    whatsapp_number: p.whatsapp_number ?? "",
    signature: p.signature ?? "",
    tone_preference: p.tone_preference ?? DEFAULT_TONE,
    custom_prompt_context: p.custom_prompt_context ?? "",
    is_active: p.is_active ?? false,
  };
}

function buildUpdateBody(form: FormState): ProfileUpdateBody {
  return {
    client_name: form.client_name,
    company_name: form.company_name,
    whatsapp_number: form.whatsapp_number,
    signature: form.signature,
    tone_preference: form.tone_preference,
    custom_prompt_context: form.custom_prompt_context,
  };
}

async function withLoading(set: (v: boolean) => void, fn: () => Promise<void>) {
  set(true);
  try { await fn(); } finally { set(false); }
}

// ─── Page component ────────────────────────────────────────────────────────────

function ProfileContent() {
  const { profile, profileLoading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [outlookEmail, setOutlookEmail] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(true);

  // Detect OAuth callback redirect (?connected=gmail or ?connected=outlook) — fire once only
  const [oauthHandled, setOauthHandled] = useState(false);
  useEffect(() => {
    if (oauthHandled) return;
    const connected = searchParams.get("connected");
    if (connected) {
      setOauthHandled(true);
      toast(`${connected === "gmail" ? "Gmail" : "Outlook"} connecté avec succès !`, "success");
      refreshProfile();
      window.history.replaceState(null, "", "/profile");
    }
  }, [searchParams, refreshProfile, toast, oauthHandled]);

  // Single effect: populate form from profile + fetch email connection status
  useEffect(() => {
    if (profile) setForm(profileToForm(profile as unknown as ProfileInput));
    api
      .getProviders()
      .then((p) => {
        setGmailConnected(p.gmail.connected);
        setOutlookConnected(p.outlook.connected);
        setGmailEmail(p.gmail.email);
        setOutlookEmail(p.outlook.email);
      })
      .catch(() => {})
      .finally(() => setEmailLoading(false));
  }, [profile]);

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await withLoading(setSaving, async () => {
      try {
        await api.updateProfile(buildUpdateBody(form));
        await refreshProfile();
        toast("Profil enregistré avec succès.", "success");
      } catch {
        toast("Erreur lors de la sauvegarde du profil.", "error");
      }
    });
  }

  async function handleToggle(val: boolean) {
    await withLoading(setToggling, async () => {
      try {
        await api.toggleActive(val);
        await refreshProfile();
        toast(val ? "Sendia activé !" : "Sendia désactivé.", "success");
      } catch {
        toast("Erreur lors du changement de statut.", "error");
      }
    });
  }

  if (profileLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  const isActive = form.is_active;
  const hrefs = getProviderHrefs(profile?.client_id ?? "");

  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Mon profil</h1>
        <p className="text-[#9999b0] mt-1">
          Personnalisez le comportement de votre assistant Sendia.
        </p>
      </div>

      {/* Section 1: Email connection */}
      <EmailConnectionSection
        gmailConnected={gmailConnected}
        outlookConnected={outlookConnected}
        emailLoading={emailLoading}
        gmailEmail={gmailEmail ?? undefined}
        outlookEmail={outlookEmail ?? undefined}
        hrefs={hrefs}
      />

      {/* Section 2: Sendia status toggle */}
      <div className="bg-[#12121a] border border-[#2a2a3a] rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-[#f0f0f5]">Statut Sendia</p>
          {(gmailConnected || outlookConnected) ? (
            <p className={`text-xs mt-0.5 ${isActive ? "text-emerald-400" : "text-[#66667a]"}`}>
              {isActive ? "Actif — votre assistant traite vos emails" : "Inactif — aucun email ne sera traité"}
            </p>
          ) : (
            <p className="text-xs mt-0.5 text-[#66667a]">
              Connectez votre email d&apos;abord pour activer Sendia
            </p>
          )}
        </div>
        <Toggle checked={isActive} onChange={handleToggle}
          disabled={toggling || (!gmailConnected && !outlookConnected)} label={isActive ? "Actif" : "Inactif"} />
      </div>

      {/* Section 2b: Current plan */}
      {profile?.plan && (
        <div className="bg-[#12121a] border border-[#2a2a3a] rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-[#f0f0f5]">Plan actuel</p>
            <p className="text-xs mt-0.5 text-[#9999b0]">
              {profile.plan === "trial" ? "Essai gratuit" :
               profile.plan === "starter" ? "Starter — 29€/mois" :
               profile.plan === "professional" ? "Professional — 79€/mois" :
               profile.plan === "enterprise" ? "Enterprise — 119€/mois" :
               profile.plan}
            </p>
          </div>
          <a href="/billing" className="text-sm text-[#4f6ef7] hover:underline font-medium">
            {profile.plan === "trial" ? "Choisir un plan →" : "Gérer →"}
          </a>
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Section 3: General information */}
        <CardSection title="Informations générales">
          <Input label="Votre nom" value={form.client_name}
            onChange={(e) => setField("client_name", e.target.value)} placeholder="Jean Dupont" />
          <Input label="Nom de l'entreprise" value={form.company_name}
            onChange={(e) => setField("company_name", e.target.value)} placeholder="Acme SAS" />
          <Input label="Numéro WhatsApp" value={form.whatsapp_number}
            onChange={(e) => setField("whatsapp_number", e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="33612345678"
            hint="Format international sans + ni espaces (ex: 33612345678)" />
        </CardSection>

        {/* Section 4: Response settings */}
        <CardSection title="Paramètres de réponse">
          <Select label="Ton par défaut" value={form.tone_preference}
            onChange={(e) => setField("tone_preference", e.target.value)} options={TONE_OPTIONS} />
          <Textarea label="Signature" value={form.signature} rows={4}
            onChange={(e) => setField("signature", e.target.value)}
            placeholder={"Cordialement,\nJean Dupont"}
            hint="Cette signature sera ajoutée à la fin de chaque réponse." />
          <Textarea label="Contexte personnalise" value={form.custom_prompt_context} rows={5}
            onChange={(e) => setField("custom_prompt_context", e.target.value)}
            placeholder="Décrivez votre activité, vos préférences ou toute information utile pour Sendia..."
            hint="Ces informations aident Sendia à mieux comprendre votre contexte métier." />
        </CardSection>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} size="md">
            Enregistrer les modifications
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileContent />
    </Suspense>
  );
}
