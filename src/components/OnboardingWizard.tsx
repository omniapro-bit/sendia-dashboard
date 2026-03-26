"use client";
import Link from "next/link";
import type { ClientProfile } from "@/lib/types";

// Each step in the onboarding checklist.
export type OnboardingStep = {
  label: string; done: boolean; href: string; description: string; skippable?: boolean;
};

// Colour/layout helpers — keep inline style blocks concise.
function stepRowStyle(isDone: boolean, isActive: boolean): React.CSSProperties {
  return {
    background: isActive ? "rgba(79,110,247,0.06)" : isDone ? "rgba(34,197,94,0.04)" : "#12121a",
    border: isActive ? "1px solid rgba(79,110,247,0.35)" : isDone ? "1px solid rgba(34,197,94,0.2)" : "1px solid #2a2a3a",
    borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, transition: "all 0.2s",
  };
}

function badgeStyle(isDone: boolean, isActive: boolean): React.CSSProperties {
  return {
    width: 32, height: 32, borderRadius: "50%",
    background: isDone ? "rgba(34,197,94,0.15)" : isActive ? "rgba(79,110,247,0.15)" : "#1c1c28",
    border: isDone ? "1px solid rgba(34,197,94,0.4)" : isActive ? "1px solid rgba(79,110,247,0.4)" : "1px solid #2a2a3a",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 as const,
  };
}

function stepLinkStyle(isActive: boolean): React.CSSProperties {
  return { flexShrink: 0, fontSize: "0.75rem", fontWeight: 700, padding: "6px 14px", borderRadius: 8, background: isActive ? "#4f6ef7" : "#1c1c28", color: isActive ? "#fff" : "#9999b0", border: isActive ? "none" : "1px solid #2a2a3a", textDecoration: "none", transition: "all 0.15s", whiteSpace: "nowrap" as const };
}

export function buildOnboardingSteps(profile: ClientProfile): OnboardingStep[] {
  const profileDone = Boolean(profile.client_name && profile.company_name && profile.whatsapp_number);
  return [
    { label: "Complétez votre profil", done: profileDone, href: "/profile", description: "Nom, entreprise et numéro WhatsApp" },
    { label: "Connectez votre boîte email", done: Boolean(profile.email_provider), href: "/profile", description: "Gmail ou Outlook" },
    { label: "Ajoutez vos documents", done: false, href: "/documents", description: "Facultatif — enrichit les réponses de Sendia", skippable: true },
  ];
}

// Shared SVG checkmark icon.
const CheckIcon = ({ size = 14, color = "#22c55e" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

function StepBadge({ isDone, isActive, index }: { isDone: boolean; isActive: boolean; index: number }) {
  return (
    <div style={badgeStyle(isDone, isActive)}>
      {isDone
        ? <CheckIcon size={14} />
        : <span style={{ fontSize: "0.7rem", fontWeight: 700, color: isActive ? "#4f6ef7" : "#66667a" }}>{index + 1}</span>}
    </div>
  );
}

function WizardSuccess() {
  return (
    <div className="mb-8" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.06), #12121a 60%)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 20, padding: "24px 28px" }}>
      <div className="flex items-center gap-3">
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CheckIcon size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-[#f0f0f5]">Sendia est configuré !</p>
          <p className="text-xs text-[#9999b0] mt-0.5">Votre assistant traite vos emails.</p>
        </div>
      </div>
    </div>
  );
}

export function OnboardingWizard({ profile }: { profile: ClientProfile }) {
  const steps = buildOnboardingSteps(profile);
  const requiredSteps = steps.filter(s => !s.skippable);
  const completedRequired = requiredSteps.filter(s => s.done).length;
  const progressPct = Math.round((completedRequired / requiredSteps.length) * 100);
  const currentStepIndex = steps.findIndex(s => !s.done && !s.skippable);
  if (completedRequired === requiredSteps.length) return <WizardSuccess />;
  return (
    <div className="mb-8" style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: 20, overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg, rgba(79,110,247,0.08), #12121a 60%)", borderBottom: "1px solid #2a2a3a", padding: "20px 24px" }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-bold text-[#f0f0f5]">Configuration de Sendia</p>
            <p className="text-xs text-[#9999b0] mt-0.5">{completedRequired} sur {requiredSteps.length} étapes obligatoires complétées</p>
          </div>
          <div className="flex items-center gap-3">
            <div style={{ width: 100, height: 6, background: "#1c1c28", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${progressPct}%`, height: "100%", background: "linear-gradient(90deg, #4f6ef7, #6b85ff)", borderRadius: 3, transition: "width 0.5s ease" }} />
            </div>
            <span className="text-xs font-semibold text-[#4f6ef7]">{progressPct}%</span>
          </div>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {steps.map((step, idx) => {
          const isActive = idx === currentStepIndex;
          const isDone = step.done;
          return (
            <div key={step.label} style={stepRowStyle(isDone, isActive)}>
              <StepBadge isDone={isDone} isActive={isActive} index={idx} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p style={{ fontSize: "0.85rem", fontWeight: 600, color: isDone ? "#9999b0" : "#f0f0f5", textDecoration: isDone ? "line-through" : "none" }}>
                    {step.label}
                  </p>
                  {step.skippable && (
                    <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#66667a", background: "#1c1c28", border: "1px solid #2a2a3a", borderRadius: 6, padding: "1px 6px" }}>
                      Facultatif
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "0.75rem", color: isDone ? "#66667a" : "#9999b0", marginTop: 2 }}>{step.description}</p>
              </div>
              {!isDone && <Link href={step.href} style={stepLinkStyle(isActive)}>Configurer</Link>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
