export type SelectOption = { value: string; label: string };

function buildToneOptions(): SelectOption[] {
  return [
    { value: "professionnel", label: "Professionnel" },
    { value: "amical",        label: "Amical" },
    { value: "formel",        label: "Formel" },
    { value: "direct",        label: "Direct" },
    { value: "concis",        label: "Concis" },
    { value: "detaille",      label: "D\u00e9taill\u00e9" },
  ];
}

function buildIndustryOptions(): SelectOption[] {
  return [
    { value: "general",      label: "G\u00e9n\u00e9ral" },
    { value: "btp",           label: "BTP / Construction" },
    { value: "immobilier",    label: "Immobilier" },
    { value: "commerce",      label: "Commerce / Retail" },
    { value: "tech",          label: "Tech / IT" },
    { value: "consulting",    label: "Consulting" },
    { value: "sante",         label: "Sant\u00e9" },
    { value: "restauration",  label: "Restauration / H\u00f4tellerie" },
    { value: "transport",     label: "Transport / Logistique" },
    { value: "autre",         label: "Autre" },
  ];
}

function buildGreetingOptions(): SelectOption[] {
  return [
    { value: "",              label: "Automatique" },
    { value: "Bonjour",       label: "Bonjour" },
    { value: "Cher",          label: "Cher/Ch\u00e8re" },
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
