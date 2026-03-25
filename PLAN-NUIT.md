# Plan Nuit + Journée — Sendia V1 Complète

> Date: 25 mars 2026
> Objectif: Livrer Sendia prêt à monétiser

## Prérequis (Alex)

- [ ] Créer compte Qonto
- [ ] Créer compte Stripe (lié à Qonto)
- [ ] Créer 3 produits Stripe (mode test d'abord):
  - Starter: 29€/mois HT
  - Professional: 79€/mois HT
  - Enterprise: 119€/mois HT
- [ ] Configurer webhook Stripe → `https://api.getsendia.com/api/webhooks/stripe`
- [ ] Récupérer: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, 3x PRICE_IDs
- [ ] Copier le template email Sendia dans Supabase > Auth > Email Templates

---

## Phase 1 — Sécurité (2h) 🔒

> On blinde AVANT d'ouvrir au public

- [ ] Fix CRITICAL: JWT signature verification (vérifier le token, pas juste le décoder)
- [ ] Fix CRITICAL: timing-safe compare pour API secret (`crypto.timingSafeEqual`)
- [ ] Rate limiting login (max 5 tentatives / 15min par IP)
- [ ] Headers sécurité (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- [ ] Password policy Supabase (min 8 chars)
- [ ] RLS policies Supabase (chaque client voit que ses données)
- [ ] Audit CORS (retirer localhost en prod)

## Phase 2 — Stripe + Billing (2h) 💳

> Monétisation

### Backend (sendia-api)
- [ ] `npm install stripe`
- [ ] Migration SQL 006: colonnes Stripe + table plan_features + subscription_events
- [ ] `src/lib/stripe.ts` — client Stripe + price mapping
- [ ] `src/lib/plan-gate.ts` — vérification limites par plan
- [ ] `src/routes/stripe.ts`:
  - `GET /api/client/billing/status`
  - `GET /api/client/billing/plans`
  - `POST /api/client/billing/checkout` → redirige Stripe Checkout
  - `POST /api/client/billing/portal` → portail client Stripe
  - `POST /api/webhooks/stripe` → webhook signature-vérifié
- [ ] Enregistrer routes dans `index.ts`
- [ ] Trial expiration cron (plan_status = 'expired' après 14j)

### Dashboard (sendia-dashboard)
- [ ] Page `/billing` — plan actuel, grille pricing, boutons checkout
- [ ] Nav "Abonnement" dans sidebar
- [ ] Bannière trial expiration (≤5 jours restants)
- [ ] Redirect après paiement (success/cancel)

## Phase 3 — OAuth Dashboard (1h) 🔗

> Le client connecte son email depuis le dashboard

- [ ] Page `/connect` améliorée:
  - Afficher "Outlook connecté avec x@outlook.fr" si déjà connecté
  - Bouton déconnecter OAuth
  - État visuel clair (connecté ✅ / non connecté ⚠️)
- [ ] Modifier callback n8n → redirect vers `app.getsendia.com/connect?success=true`
- [ ] Backend: endpoint pour vérifier état OAuth du client

## Phase 4 — Features Premium (2h) ⭐

> Enrichir le produit pour justifier le pricing

### Stats avancées
- [ ] Queries time-series (emails par jour/semaine/mois, par type)
- [ ] Graphiques dans le dashboard (recharts ou chart.js)
- [ ] Taux de réponse, temps moyen de traitement

### Export CSV
- [ ] `GET /api/client/emails/export` — retourne CSV
- [ ] Bouton "Exporter" dans le dashboard

### Multi-tons
- [ ] Permettre plusieurs profils de ton (par type d'email)
- [ ] Config dans la page profil

### Relances automatiques
- [ ] Table `follow_up_rules` (délai, template, actif/inactif)
- [ ] Cron job qui scan les emails sans réponse > X jours
- [ ] Config dans paramètres dashboard
- [ ] Gating: Pro + Enterprise uniquement

### Calendrier
- [ ] Afficher les RDV détectés dans le dashboard
- [ ] Config rappels (calendar_reminder_minutes existe déjà)
- [ ] Gating: Pro + Enterprise uniquement

### Historique configurable
- [ ] Filtre `created_at` selon le plan (30j/90j/1an)
- [ ] Déjà dans la query, juste ajouter le WHERE

### Signature + prompts gated
- [ ] Signature personnalisée: Pro + Enterprise
- [ ] Prompts par type: Pro + Enterprise
- [ ] Starter: prompt par défaut uniquement

## Phase 5 — Tests + Deploy (1h) 🚀

- [ ] Build dashboard (0 errors)
- [ ] TypeScript check backend (0 errors)
- [ ] Test signup → verify email → dashboard
- [ ] Test checkout Stripe (carte test 4242...)
- [ ] Test webhook (invoice.paid → plan activé)
- [ ] Test plan gating (Starter bloqué sur features Pro)
- [ ] Test OAuth connect → état affiché
- [ ] Test relance auto
- [ ] Test export CSV
- [ ] Deploy dashboard: `ssh root@46.225.239.79 "cd /opt/sendia-dashboard && bash deploy.sh"`
- [ ] Deploy backend: `ssh root@46.225.239.79 "/opt/sendia-api/deploy.sh"`
- [ ] Smoke test en prod

---

## Pricing Final

| Plan | Prix HT/mois | Emails/mois | Comptes email | RAG docs | Prompts perso | Relances | Calendrier | Support |
|------|-------------|-------------|---------------|----------|--------------|----------|------------|---------|
| Starter | 29€ | 200 | 1 | 5 docs | ❌ | ❌ | ❌ | Email 48h |
| Professional | 79€ | 1 000 | 3 | 30 docs | ✅ | ✅ | ✅ | Prioritaire 12h |
| Enterprise | 119€ | Illimité | 10 | Illimité | ✅ | ✅ | ✅ | Dédié |

**Essai gratuit**: 14 jours en mode Professional complet, sans carte bancaire.

---

## Commandes utiles

```bash
# Deploy dashboard
ssh root@46.225.239.79 "cd /opt/sendia-dashboard && bash deploy.sh"

# Deploy backend
ssh root@46.225.239.79 "/opt/sendia-api/deploy.sh"

# Logs dashboard
ssh root@46.225.239.79 "docker logs sendia-dashboard --tail 50"

# Logs backend
ssh root@46.225.239.79 "docker logs sendia-api --tail 50"
```
