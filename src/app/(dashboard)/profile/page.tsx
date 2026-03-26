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
import toneDataJson from "./tone-data.json";
import toneRowsJson from "./tone-rows.json";

// ─── types ────────────────────────────────────────────────────────────────────

type ToneKey = keyof typeof toneDataJson;
type ToneMeta = { label: string; instruction: string };
type ToneRowKey = "devis" | "lead" | "support" | "relance" | "autre";
type ToneRow = { key: ToneRowKey; label: string; promptField: keyof ProfileUpdateBody };
type PerTypeToneState = { [K in ToneRowKey]: ToneKey };
type ProfileInput = {
  client_name: string; company_name: string; whatsapp_number?: string;
  signature: string; tone_preference: string; custom_prompt_context: string;
  is_active: boolean; [k: string]: unknown;
};
type FormState = Required<Omit<ProfileUpdateBody, "greeting_style" | "is_active">>
  & { is_active: boolean } & PerTypeToneState;

// Data derived from JSON — no inline literals in this file
const TONE_DATA = toneDataJson as Record<ToneKey, ToneMeta>;
const TONE_ROWS = toneRowsJson as ToneRow[];
const TONE_KEYS = Object.keys(TONE_DATA) as ToneKey[];
const TONE_OPTIONS = TONE_KEYS.map(k => ({ value: k, label: TONE_DATA[k].label }));
const DEFAULT_TONE = "professionnel" as ToneKey;

// ─── helpers ──────────────────────────────────────────────────────────────────

function instructionToTone(instruction: string | undefined): ToneKey {
  if (!instruction) return DEFAULT_TONE;
  return TONE_KEYS.find(k => TONE_DATA[k].instruction === instruction) ?? DEFAULT_TONE;
}

function emptyPromptTones(): Record<string, string> {
  return Object.fromEntries(TONE_ROWS.map(r => [r.promptField, ""]));
}

function emptyForm(): FormState {
  const perType = Object.fromEntries(TONE_ROWS.map(r => [r.key, DEFAULT_TONE])) as PerTypeToneState;
  return {
    client_name: "", company_name: "", whatsapp_number: "", signature: "",
    tone_preference: DEFAULT_TONE, custom_prompt_context: "",
    is_active: false, ...emptyPromptTones(), ...perType,
  } as FormState;
}

function profileToForm(p: ProfileInput): FormState {
  const prompts = Object.fromEntries(TONE_ROWS.map(r => [r.promptField, (p[r.promptField] as string) ?? ""]));
  const tones = Object.fromEntries(TONE_ROWS.map(r => [r.key, instructionToTone(p[r.promptField] as string | undefined)])) as PerTypeToneState;
  return {
    client_name: p.client_name ?? "", company_name: p.company_name ?? "",
    whatsapp_number: (p.whatsapp_number as string) ?? "", signature: p.signature ?? "",
    tone_preference: p.tone_preference ?? DEFAULT_TONE,
    custom_prompt_context: p.custom_prompt_context ?? "",
    is_active: p.is_active ?? false, ...prompts, ...tones,
  } as FormState;
}

function buildUpdateBody(form: FormState): ProfileUpdateBody {
  const { client_name, company_name, whatsapp_number, signature, tone_preference, custom_prompt_context } = form;
  const prompts = Object.fromEntries(TONE_ROWS.map(r => [r.promptField, form[r.promptField as keyof FormState] as string]));
  return { client_name, company_name, whatsapp_number, signature, tone_preference, custom_prompt_context, ...prompts };
}

async function withLoading(set: (v: boolean) => void, fn: () => Promise<void>) {
  set(true);
  try { await fn(); } finally { set(false); }
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ToneSelect({ value, onChange }: { value: ToneKey; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full max-w-[200px] px-3 py-2 rounded-xl bg-[#12121a] border border-[#2a2a3a] text-[#f0f0f5] text-sm transition-colors outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]/60"
    >
      {TONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── page component ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { profile, profileLoading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => { if (profile) setForm(profileToForm(profile as unknown as ProfileInput)); }, [profile]);

  function setField(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleToneChange(row: ToneRow, value: string) {
    const tone = value as ToneKey;
    setForm(prev => ({ ...prev, [row.key]: tone, [row.promptField]: TONE_DATA[tone].instruction }));
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

        <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[#2a2a3a]">
            <h2 className="text-base font-semibold text-[#f0f0f5]">Ton de réponse par type d'email</h2>
            <p className="text-xs text-[#66667a] mt-1">
              Choisissez un ton spécifique pour chaque catégorie d'email.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a3a]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#66667a] uppercase tracking-wider w-1/2">
                    Type d'email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#66667a] uppercase tracking-wider w-1/2">
                    Ton
                  </th>
                </tr>
              </thead>
              <tbody>
                {TONE_ROWS.map((row, idx) => (
                  <tr key={row.key} className={idx < TONE_ROWS.length - 1 ? "border-b border-[#2a2a3a]/60" : ""}>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-[#f0f0f5]">{row.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <ToneSelect value={form[row.key]} onChange={v => handleToneChange(row, v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} size="md">Enregistrer les modifications</Button>
        </div>
      </form>
    </div>
  );
}
