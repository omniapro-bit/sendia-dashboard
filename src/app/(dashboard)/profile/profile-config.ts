export type ToneOption = { value: string; label: string };

function buildToneOptions(): ToneOption[] {
  return [
    { value: "professionnel", label: "Professionnel" },
    { value: "amical",        label: "Amical" },
    { value: "formel",        label: "Formel" },
    { value: "concis",        label: "Concis" },
    { value: "detaille",      label: "Détaillé" },
  ];
}

export const TONE_OPTIONS = buildToneOptions();
export const DEFAULT_TONE = "professionnel";
