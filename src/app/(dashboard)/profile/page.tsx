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

// ─── types ────────────────────────────────────────────────────────────────────

type ToneValue = "professionnel" | "amical" | "formel" | "direct" | "commercial";
type FormState = Required<Omit<ProfileUpdateBody, "greeting_style" | "is_active">> & { is_active: boolean };

// ─── helpers ──────────────────────────────────────────────────────────────────

function toneOptions() {
  const tones: ToneValue[] = ["professionnel", "amical", "formel", "direct", "commercial"];
  return tones.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
}

function emptyForm(): FormState {
  return {
    client_name: "",
    company_name: "",
    whatsapp_number: "",
    signature: "",
    tone_preference: "professionnel",
    custom_prompt_context: "",
    is_active: false,
  };
}

function profileToForm(p: {
  client_name: string;
  company_name: string;
  whatsapp_number?: string;
  signature: string;
  tone_preference: string;
  custom_prompt_context: string;
  is_active: boolean;
}): FormState {
  return {
    client_name: p.client_name ?? "",
    company_name: p.company_name ?? "",
    whatsapp_number: p.whatsapp_number ?? "",
    signature: p.signature ?? "",
    tone_preference: p.tone_preference ?? "professionnel",
    custom_prompt_context: p.custom_prompt_context ?? "",
    is_active: p.is_active ?? false,
  };
}

async function withLoading(set: (v: boolean) => void, fn: () => Promise<void>) {
  set(true);
  try { await fn(); } finally { set(false); }
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { profile, profileLoading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  useEffect(() => {
    if (profile) setForm(profileToForm(profile));
  }, [profile]);
  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await withLoading(setSaving, async () => {
      try {
        const { client_name, company_name, whatsapp_number, signature, tone_preference, custom_prompt_context } = form;
        await api.updateProfile({ client_name, company_name, whatsapp_number, signature, tone_preference, custom_prompt_context });
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
              onChange={e => set("client_name", e.target.value)} placeholder="Jean Dupont" />
            <Input label="Nom de l'entreprise" value={form.company_name}
              onChange={e => set("company_name", e.target.value)} placeholder="Acme SAS" />
            <Input label="Numéro WhatsApp" value={form.whatsapp_number}
              onChange={e => set("whatsapp_number", e.target.value)} placeholder="+33 6 12 34 56 78" />
          </div>
        </div>

        <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[#2a2a3a]">
            <h2 className="text-base font-semibold text-[#f0f0f5]">Paramètres de réponse</h2>
          </div>
          <div className="px-6 py-5 flex flex-col gap-5">
            <Select label="Ton préféré" value={form.tone_preference}
              onChange={e => set("tone_preference", e.target.value)} options={toneOptions()} />
            <Textarea label="Signature" value={form.signature} rows={4}
              onChange={e => set("signature", e.target.value)}
              placeholder={"Cordialement,\nJean Dupont"}
              hint="Cette signature sera ajoutée à la fin de chaque réponse." />
            <Textarea label="Contexte personnalisé" value={form.custom_prompt_context} rows={5}
              onChange={e => set("custom_prompt_context", e.target.value)}
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
