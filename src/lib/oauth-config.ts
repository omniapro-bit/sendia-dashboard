/**
 * OAuth configuration — single source of truth.
 * Used by both /connect and /profile pages.
 */

export const OAUTH_CONFIG = {
  google: {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "274786161227-iiip3l1i6bm5rnjngp9r8tsqa57ssrah.apps.googleusercontent.com",
    redirectUri: "https://n8n.getsendia.com/webhook/oauth-callback",
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.labels",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  },
  outlook: {
    clientId: process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID || "ead1260f-07d2-4220-b215-e0af081e67fc",
    redirectUri: "https://n8n.getsendia.com/webhook/outlook-oauth-callback",
    scopes: "offline_access Mail.ReadWrite Mail.Send Calendars.ReadWrite User.Read",
  },
} as const;

/** Build OAuth URLs for a given client_id with CSRF nonce */
export function buildOAuthUrls(clientId: string) {
  // Generate random nonce for CSRF protection and store in sessionStorage
  const nonce = crypto.randomUUID();
  if (typeof window !== "undefined") {
    sessionStorage.setItem("oauth_nonce", nonce);
  }
  const state = encodeURIComponent(JSON.stringify({ client_id: clientId, nonce }));
  return {
    gmail: "https://accounts.google.com/o/oauth2/v2/auth?" +
      new URLSearchParams({
        client_id: OAUTH_CONFIG.google.clientId,
        redirect_uri: OAUTH_CONFIG.google.redirectUri,
        response_type: "code",
        scope: OAUTH_CONFIG.google.scopes.join(" "),
        access_type: "offline",
        prompt: "consent",
        state,
      }).toString(),
    outlook: "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?" +
      new URLSearchParams({
        client_id: OAUTH_CONFIG.outlook.clientId,
        redirect_uri: OAUTH_CONFIG.outlook.redirectUri,
        response_type: "code",
        scope: OAUTH_CONFIG.outlook.scopes,
        prompt: "consent",
        state,
      }).toString(),
  };
}
