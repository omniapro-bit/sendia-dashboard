"use client";
import { useEffect, useState } from "react";
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

// ─── Provider config ──────────────────────────────────────────────────────────

type ProviderId = "gmail" | "outlook";

// All per-provider data in one place: label, OAuth base URL, and params.
// hrefs are derived once at module load — no duplicate const declarations.
const PROVIDERS = ((): Record<ProviderId, { label: string; href: string }> => {
  function oauthHref(base: string, params: Record<string, string>) {
    return `${base}?${new URLSearchParams(params).toString()}`;
  }
  return {
    gmail: {
      label: "Gmail",
      href: oauthHref("https://accounts.google.com/o/oauth2/v2/auth", {
        client_id: "274786161227-iiip3l1i6bm5rnjngp9r8tsqa57ssrah.apps.googleusercontent.com",
        redirect_uri: "https://n8n.getsendia.com/webhook/oauth-callback",
        response_type: "code",
        scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email",
        access_type: "offline",
        prompt: "consent",
      }),
    },
    outlook: {
      label: "Outlook",
      href: oauthHref("https://login.microsoftonline.com/common/oauth2/v2.0/authorize", {
        client_id: "ead1260f-07d2-4220-b215-e0af081e67fc",
        redirect_uri: "https://n8n.getsendia.com/webhook/outlook-oauth-callback",
        response_type: "code",
        scope: "offline_access Mail.ReadWrite Mail.Send Calendars.ReadWrite User.Read",
        prompt: "consent",
      }),
    },
  };
})();

const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

function ProviderIcon({ id }: { id: ProviderId }) {
  if (id === "gmail") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.583a.793.793 0 0 1-.583.238h-8.404V6.566h8.404c.23 0 .424.08.583.238.159.159.238.353.238.583zM13.5 2.25v19.5L0 19.5V4.5l13.5-2.25z" />
    </svg>
  );
}

function ProviderButton({ id, isActive, variant }: { id: ProviderId; isActive: boolean; variant: "compact" | "large" }) {
  const { label, href } = PROVIDERS[id];
  const isCompact = variant === "compact";
  const cls = isCompact
    ? (isActive ? "bg-white/10 text-[#f0f0f5] border border-[#34d399]/30" : "bg-[#12121a] text-[#9999b0] border border-[#2a2a3a] hover:border-[#4f6ef7]")
    : (id === "gmail" ? "bg-white text-[#1a1a1a] hover:bg-[#f0f0f0] hover:shadow-lg" : "bg-[#12121a] text-[#f0f0f5] border border-[#333348] hover:bg-[#1c1c28] hover:border-[#4f6ef7]");
  const baseClass = isCompact
    ? `flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all no-underline ${cls}`
    : `flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5 no-underline ${cls}`;
  const text = isCompact ? (isActive ? `${label} (actif)` : label) : `Connecter ${label}`;
  return (
    <a href={href} className={baseClass}>
      <ProviderIcon id={id} />
      {text}
    </a>
  );
}
function EmailConnectionSection({ emailConnected, emailLoading, provider }: {
  emailConnected: boolean;
  emailLoading: boolean;
  provider: string | undefined;
}) {
  const activeId = (emailConnected && (provider === "gmail" || provider === "outlook")) ? provider : undefined;
  const badgeLabel = activeId === "gmail" ? "Gmail connecté" : activeId === "outlook" ? "Outlook connecté" : "Email connecté";

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-[#2a2a3a]">
        <h2 className="text-base font-semibold text-[#f0f0f5]">Connexion email</h2>
      </div>
      <div className="px-6 py-5">
        {emailLoading && (
          <div className="flex justify-center py-4"><Spinner size="md" /></div>
        )}

        {!emailLoading && emailConnected && (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#34d399]/15 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#34d399]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}
                >
                  {activeId && <ProviderIcon id={activeId} />}
                  {badgeLabel}
                </span>
                <div className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse inline-block ml-2 align-middle" />
              </div>
            </div>
            <div className="flex gap-2">
              {PROVIDER_IDS.map(id => (
                <ProviderButton key={id} id={id} isActive={activeId === id} variant="compact" />
              ))}
            </div>
          </div>
        )}

        {!emailLoading && !emailConnected && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[#9999b0] mb-1">
              Connectez votre boîte mail pour que Sendia puisse analyser vos emails et vous proposer des réponses via WhatsApp.
            </p>
            <div className="flex gap-3 flex-wrap">
              {PROVIDER_IDS.map(id => (
                <ProviderButton key={id} id={id} isActive={false} variant="large" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ProfileFields = {
  client_name: string;
  company_name: string;
  signature: string;
  tone_preference: string;
  custom_prompt_context: string;
  is_active: boolean;
};
// ProfileInput: raw API shape (whatsapp_number optional).
type ProfileInput = ProfileFields & { whatsapp_number?: string };
// FormState: controlled form shape (whatsapp_number always a string).
type FormState = ProfileFields & { whatsapp_number: string };

// ─── helpers ──────────────────────────────────────────────────────────────────

function emptyForm(): FormState {
  return {
    client_name: "", company_name: "", whatsapp_number: "", signature: "",
    tone_preference: DEFAULT_TONE, custom_prompt_context: "", is_active: false,
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

// ─── page component ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { profile, profileLoading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (profile) setForm(profileToForm(profile as unknown as ProfileInput));
  }, [profile]);
  function setField(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
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

  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Mon profil</h1>
        <p className="text-[#9999b0] mt-1">Personnalisez le comportement de votre assistant Sendia.</p>
      </div>

      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-[#f0f0f5]">Statut Sendia</p>
          <p className={`text-xs mt-0.5 ${isActive ? "text-emerald-400" : "text-[#66667a]"}`}>
            {isActive ? "Actif — votre assistant traite vos emails" : "Inactif — aucun email ne sera traité"}
          </p>
        </div>
        <Toggle checked={isActive} onChange={handleToggle} disabled={toggling}
          label={isActive ? "Actif" : "Inactif"} />
      </div>

      <form onSubmit={handleSave}>
        <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[#2a2a3a]">
            <h2 className="text-base font-semibold text-[#f0f0f5]">Informations générales</h2>
          </div>
          <div className="px-6 py-5 flex flex-col gap-5">
            <Input label="Votre nom" value={form.client_name}
              onChange={e => setField("client_name", e.target.value)} placeholder="Jean Dupont" />
            <Input label="Nom de l'entreprise" value={form.company_name}
              onChange={e => setField("company_name", e.target.value)} placeholder="Acme SAS" />
            <Input label="Numéro WhatsApp" value={form.whatsapp_number}
              onChange={e => setField("whatsapp_number", e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="33664365030"
              hint="Format international sans + ni espaces (ex: 33664365030)" />
          </div>
        </div>

        <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[#2a2a3a]">
            <h2 className="text-base font-semibold text-[#f0f0f5]">Paramètres de réponse</h2>
          </div>
          <div className="px-6 py-5 flex flex-col gap-5">
            <Select label="Ton par défaut" value={form.tone_preference}
              onChange={e => setField("tone_preference", e.target.value)} options={TONE_OPTIONS} />
            <Textarea label="Signature" value={form.signature} rows={4}
              onChange={e => setField("signature", e.target.value)}
              placeholder={"Cordialement,\nJean Dupont"}
              hint="Cette signature sera ajoutée à la fin de chaque réponse." />
            <Textarea label="Contexte personnalisé" value={form.custom_prompt_context} rows={5}
              onChange={e => setField("custom_prompt_context", e.target.value)}
              placeholder="Décrivez votre activité, vos préférences ou toute information utile pour Sendia..."
              hint="Ces informations aident Sendia à mieux comprendre votre contexte métier." />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} size="md">Enregistrer les modifications</Button>
        </div>
      </form>
    </div>
  );
}
