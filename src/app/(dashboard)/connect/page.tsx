"use client";
import { useAuth } from "@/contexts/AuthContext";

const GMAIL_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
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
  }).toString();

const OUTLOOK_AUTH_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" +
  new URLSearchParams({
    client_id: "ead1260f-07d2-4220-b215-e0af081e67fc",
    redirect_uri: "https://n8n.getsendia.com/webhook/outlook-oauth-callback",
    response_type: "code",
    scope: "offline_access Mail.ReadWrite Mail.Send Calendars.ReadWrite User.Read",
    prompt: "consent",
  }).toString();

function CheckIcon() {
  return (
    <div className="w-5 h-5 rounded-full bg-[#34d399]/15 flex items-center justify-center shrink-0 mt-0.5">
      <svg className="w-3 h-3 text-[#34d399]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </div>
  );
}

export default function ConnectPage() {
  const { profile } = useAuth();

  const hasGmail = Boolean(profile && ("gmail_access_token" in profile) && (profile as Record<string, unknown>).gmail_access_token);
  const hasOutlook = Boolean(profile && ("outlook_access_token" in profile) && (profile as Record<string, unknown>).outlook_access_token);
  const isConnected = hasGmail || hasOutlook;

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Connectez votre boîte mail</h1>
        <p className="text-[#9999b0] mt-2">
          Sendia a besoin d'un accès à votre messagerie pour analyser vos emails et vous proposer des réponses intelligentes via WhatsApp.
        </p>
      </div>

      {/* Status banner */}
      {isConnected && (
        <div className="bg-[#34d399]/10 border border-[#34d399]/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#34d399]/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#34d399]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#34d399]">Email connecté</p>
            <p className="text-xs text-[#9999b0]">
              {hasGmail ? "Gmail" : "Outlook"} est lié à votre compte Sendia.
            </p>
          </div>
        </div>
      )}

      {/* Connect buttons */}
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-8 mb-6">
        <div className="flex flex-col gap-4 mb-8">
          <a
            href={GMAIL_AUTH_URL}
            className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white text-[#1a1a1a] font-semibold text-base hover:bg-[#f0f0f0] transition-all hover:-translate-y-0.5 hover:shadow-lg no-underline"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {hasGmail ? "Gmail connecté ✔" : "Connecter Gmail"}
          </a>

          <a
            href={OUTLOOK_AUTH_URL}
            className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-[#12121a] text-[#f0f0f5] font-semibold text-base border border-[#333348] hover:bg-[#1c1c28] hover:border-[#4f6ef7] transition-all hover:-translate-y-0.5 no-underline"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.583a.793.793 0 0 1-.583.238h-8.404V6.566h8.404c.23 0 .424.08.583.238.159.159.238.353.238.583zM13.5 2.25v19.5L0 19.5V4.5l13.5-2.25zM9.69 8.166c-.478-.158-.97-.237-1.478-.237-.99 0-1.818.36-2.487 1.08C5.056 9.73 4.722 10.66 4.722 11.798c0 1.055.31 1.93.93 2.625.62.696 1.396 1.044 2.33 1.044.545 0 1.054-.107 1.527-.321v-1.584c-.455.435-.949.652-1.482.652-.617 0-1.108-.223-1.473-.67-.365-.446-.547-1.05-.547-1.81 0-.736.19-1.33.57-1.782.38-.452.876-.678 1.487-.678.52 0 1.002.228 1.445.683V8.372l-.319-.206z" />
            </svg>
            {hasOutlook ? "Outlook connecté ✔" : "Connecter Outlook"}
          </a>
        </div>

        {/* Features list */}
        <div className="pt-6 border-t border-[#2a2a3a] flex flex-col gap-3">
          <div className="flex items-start gap-2.5 text-sm text-[#9999b0]">
            <CheckIcon />
            <span>Analyse intelligente de vos emails entrants</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-[#9999b0]">
            <CheckIcon />
            <span>Réponses suggérées validées par vous sur WhatsApp</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-[#9999b0]">
            <CheckIcon />
            <span>Détection automatique de rendez-vous et gestion du calendrier</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-[#9999b0]">
            <CheckIcon />
            <span>Vos données restent privées — aucun stockage de contenu</span>
          </div>
        </div>
      </div>

      {/* Security note */}
      <div className="bg-[#4f6ef7]/8 border border-[#4f6ef7]/15 rounded-xl p-4 text-sm text-[#9999b0] leading-relaxed text-center">
        Sendia respecte le RGPD et ne stocke aucun contenu d{"'"}email. Seules les métadonnées nécessaires au traitement sont conservées.
      </div>
    </div>
  );
}
