export type SelectOption = { value: string; label: string };

function buildToneOptions(): SelectOption[] {
  return [
    { value: "professionnel", label: "Professionnel" },
    { value: "amical",        label: "Amical" },
    { value: "formel",        label: "Formel" },
    { value: "direct",        label: "Direct" },
    { value: "concis",        label: "Concis" },
    { value: "detaille",      label: "Detaille" },
  ];
}

function buildIndustryOptions(): SelectOption[] {
  return [
    { value: "general",      label: "General" },
    { value: "btp",           label: "BTP / Construction" },
    { value: "immobilier",    label: "Immobilier" },
    { value: "commerce",      label: "Commerce / Retail" },
    { value: "tech",          label: "Tech / IT" },
    { value: "consulting",    label: "Consulting" },
    { value: "sante",         label: "Sante" },
    { value: "restauration",  label: "Restauration / Hotellerie" },
    { value: "transport",     label: "Transport / Logistique" },
    { value: "autre",         label: "Autre" },
  ];
}

function buildGreetingOptions(): SelectOption[] {
  return [
    { value: "",              label: "Automatique" },
    { value: "Bonjour",       label: "Bonjour" },
    { value: "Cher",          label: "Cher/Chere" },
    { value: "Salut",         label: "Salut" },
    { value: "Hello",         label: "Hello" },
    { value: "Madame, Monsieur", label: "Madame, Monsieur" },
  ];
}

export type ToneOption = SelectOption;
export const TONE_OPTIONS = buildToneOptions();
export const INDUSTRY_OPTIONS = buildIndustryOptions();
export const GREETING_OPTIONS = buildGreetingOptions();
export const DEFAULT_TONE = "professionnel";
export const DEFAULT_INDUSTRY = "general";
