# pylotIA — Référence projet pour Claude Code
> Mis à jour : mai 2026 — Post-audit production complet

---

## 1. PRÉSENTATION DU PROJET

- **Nom** : pylotIA
- **Tagline** : CRM intelligent pour TPE/PME
- **Cible** : entreprises 1-30 salariés — agents immobiliers, artisans BTP, indépendants, garages, formateurs, santé
- **URL production** : https://pilotia.vercel.app
- **Domaine prévu** : pylotia.fr (pas encore acheté)
- **GitHub** : https://github.com/lorikclauzier/pilotia
- **Email** : pylotia.app@gmail.com

---

## 2. ÉQUIPE

| Rôle | Personne | Outil |
|------|----------|-------|
| Co-fondateur, DG, dev | Lorik Clauzier | Claude Code |
| Co-fondateur, Président, commercial | Florian Valognes | ChatGPT |

Partenariat 50/50. Travail sur le même repo GitHub, Vercel déploie automatiquement.

---

## 3. STACK TECHNIQUE

- **Frontend** : HTML / CSS / JS vanilla (pas de framework)
- **Auth & DB** : Supabase — RLS strict activé sur toutes les tables
- **Storage** : Supabase Storage — bucket `contact-documents` (documents joints aux fiches contact)
- **Hébergement** : Vercel (déploiement auto à chaque push GitHub)
- **API IA** : `/api/claude.js` — proxy Vercel vers Anthropic API (plan Pro uniquement, vérification JWT serveur)
- **Emails** : EmailJS (formulaires contact, Business, chatbot leads)
- **Paiement** : Stripe — non intégré, en attente SIRET Florian

---

## 4. TARIFICATION

| Plan | Prix | Accès |
|------|------|-------|
| Gratuit | 0€/mois | Dashboard, Contacts (10 max), Agenda, Activité, Paramètres |
| Starter | 29€/mois | + Contacts illimités, Campagnes, Relances/Kanban, Import CSV/Excel, Recherche globale |
| Pro | 89€/mois | + Assistant IA, Performance, Post-vente, Export Excel |
| Business | Sur devis | Tout Pro + multi-comptes (à venir) |

**Argument commercial clé** : flat rate — pas de facturation par utilisateur.
Boutons Starter/Pro affichent "Prochainement" (non cliquables). Business = formulaire devis → email.

---

## 5. DESIGN SYSTEM

### Règle absolue — Light mode uniquement
Dark mode supprimé définitivement. **Ne jamais réintroduire** de variables CSS sombres (`#080c14`, `#0e1420`, `#141c2e`, `--text:#f0f4ff`) dans aucun fichier.

### Pages auth (login, signup, forgot-password, reset-password)
Variables CSS light :
```
--dark:#f6f9ff  --dark2:#ffffff  --dark3:#f0f5ff
--blue:#3b82f6  --blue2:#2563eb
--text:#0d1628  --text2:#4a5a78  --text3:#8393b5
--border:rgba(0,0,0,0.08)  --border2:rgba(0,0,0,0.14)
```

### Landing page (index.html)
```
--bg:#f6f9ff  --bg2:#edf2ff  --bg3:#e2eafc  --bg4:#d6e2f8
--surface:#ffffff  --surface2:#f0f5ff
--blue:#4d8ef5  --blue2:#3b7ce8  --blue3:#2563eb
--text:#0d1628  --text2:#4a5a78  --text3:#8393b5
--border:rgba(0,0,0,0.08)  --border2:rgba(0,0,0,0.14)
--border-blue:rgba(77,142,245,0.3)
--r:14px  --r2:10px  --r3:8px
```
Polices : Syne (titres, 700-800) + Inter (corps, 300-500)

### Dashboard (dashboard.html)
```
--dark:#f0f5ff  --dark2:#ffffff  --dark3:#e8eef9
--blue:#3b82f6  --blue2:#2563eb
--text:#0f172a  --text2:#475569  --text3:#94a3b8
--border:rgba(0,0,0,0.08)  --border2:rgba(0,0,0,0.14)
```

### Pages secondaires (success, cancel, cgu, mentions-legales)
Mêmes variables light que les pages auth — toutes en fond clair.

---

## 6. STRUCTURE DES FICHIERS

```
pilotia/
├── index.html                    # Landing page V2 (~1900 lignes) — i18n FR/EN complet
├── dashboard.html                # Interface CRM complète (~4700 lignes)
├── signup.html                   # Inscription (Supabase Auth)
├── login.html                    # Connexion (Supabase Auth)
├── forgot-password.html          # Demande reset mot de passe
├── reset-password.html           # Nouveau mot de passe (light mode ✓)
├── success.html                  # Après paiement Stripe réussi (light mode ✓)
├── cancel.html                   # Après annulation Stripe (light mode ✓)
├── cgu.html                      # CGU — à compléter avec SIRET Flo (light mode ✓)
├── mentions-legales.html         # Mentions légales — à compléter avec SIRET Flo (light mode ✓)
├── 404.html                      # Page d'erreur 404
├── favicon.svg                   # Logo SVG
├── og-image.svg                  # Open Graph image
├── robots.txt                    # SEO
├── sitemap.xml                   # SEO
├── vercel.json                   # Config Vercel (maxDuration: 30s pour api/claude.js)
├── package.json                  # Minimal (pas de framework)
├── supabase_migration.sql        # Migration 001 — contacts, prospects, user_plans, appointments
├── supabase_migration_002_business_plan.sql  # Migration 002 — plan Business
├── supabase_migration_003_contact_documents.sql  # Migration 003 — contact_documents + bucket storage
├── pilotia_tests/
│   ├── test-dashboard.js         # Tests Playwright — 34 checks automatisés
│   ├── package.json              # Dépendance Playwright
│   └── *.xlsx / *.csv            # Fichiers de test import contacts
└── api/
    └── claude.js                 # Proxy Vercel → Anthropic API (vérif JWT + plan Pro côté serveur)
```

---

## 7. BASE DE DONNÉES SUPABASE

5 tables avec RLS strict (chaque user voit uniquement ses données) :

| Table | Contenu |
|-------|---------|
| `contacts` | Clients par utilisateur |
| `prospects` | Pipeline de prospection par utilisateur |
| `user_plans` | Plan actif par utilisateur (free/starter/pro/business) |
| `appointments` | Rendez-vous agenda par utilisateur |
| `contact_documents` | Documents joints aux fiches contact (PDF, Word, Excel, images) |

**Storage** : bucket `contact-documents` — chemins `{user_id}/{contact_id}/{timestamp}.{ext}`, 10 Mo max par fichier, types MIME restreints.

**Important** : plus aucune donnée métier en localStorage — tout est en Supabase.

---

## 8. PLAN GATING — RÈGLES STRICTES

### Fonctions clés (dashboard.html)
```js
planAllows(name) // retourne false si section inaccessible pour le plan courant
getPlan()        // retourne 'free' | 'starter' | 'pro' | 'business'
```

### Matrice d'accès
| Section | Free | Starter | Pro | Business |
|---------|------|---------|-----|----------|
| dashboard, contacts, agenda, activite, parametres | ✓ | ✓ | ✓ | ✓ |
| messages, prospection, import CSV | ✗ | ✓ | ✓ | ✓ |
| Recherche globale ⌘K | ✗ | ✓ | ✓ | ✓ |
| performance, postvente, assistant | ✗ | ✗ | ✓ | ✓ |
| Export Excel (exportContacts) | ✗ | ✗ | ✓ | ✓ |

### Comportement
- Clic sur section verrouillée → `openUpgradeModal()`
- Nav items verrouillés : `opacity: 0.45` + badge STARTER ou PRO
- Contacts Free : limite 10, bannière `#contacts-free-banner` avec compteur
- `api/claude.js` : vérification JWT + plan **côté serveur** — retourne 401/403 si non Pro

---

## 9. FONCTIONNALITÉS IMPLÉMENTÉES

### Auth
- Inscription / Connexion / Mot de passe oublié / Reset — Supabase Auth complet
- Redirection automatique après login

### Landing page (index.html)
- Sélecteur FR/EN avec système `data-i18n` / `data-i18n-html` / `data-i18n-placeholder`
- Fonction `setLang(lang)` — `textContent` pour `data-i18n`, `innerHTML` pour `data-i18n-html`
- Sections : Hero, Problème, Solution, Fonctionnalités, Démo interactive, Tarifs, FAQ, Contact
- **Démo interactive 7 onglets** (sidebar identique au vrai dashboard sur chaque onglet) :
  Dashboard, Contacts, Agenda, Activité, Campagnes, Relances, Assistant IA
- Sidebar démo : 9 items (Performance + Post-vente verrouillés PRO, grisés)
- Chatbot IA flottant : limite 3 messages → formulaire lead → EmailJS
- Formulaire contact général → EmailJS
- Formulaire devis Business → EmailJS + modal
- Carte Pro pricing : fond blanc/bleu clair, sort du lot visuellement

### Dashboard (dashboard.html)
11 éléments de navigation (Recherche + 10 sections) via `showSection(name)` :

| Section | État | Plan requis |
|---------|------|-------------|
| `dashboard` | Fonctionnel | Gratuit |
| `contacts` | Fonctionnel (import CSV/Excel Starter+, export Excel Pro+) | Gratuit (limité 10) |
| `agenda` | Fonctionnel | Gratuit |
| `activite` | Fonctionnel | Gratuit |
| `performance` | Fonctionnel | Pro |
| `postvente` | Fonctionnel | Pro |
| `messages` | Fonctionnel (campagnes) | Starter |
| `prospection` | Fonctionnel (kanban) | Starter |
| `import` | Fonctionnel (CSV/Excel) | Starter |
| `assistant` | Fonctionnel (IA connectée aux vraies données) | Pro |
| `parametres` | Fonctionnel | Gratuit |

Assistant IA — 5 modes : chat libre, relances prioritaires, prospects chauds, message de relance, rapport hebdo.
Modèle : `claude-sonnet-4-6`.

### Documents joints (fiche contact)
- Upload dans Supabase Storage (bucket `contact-documents`)
- Chemin : `{user_id}/{contact_id}/{timestamp}.{ext}`
- Taille max : 10 Mo — types : PDF, Word, Excel, JPG, PNG
- Fonctions : `uploadContactDocument()`, `loadContactDocuments()`, `deleteContactDocument()`

---

## 10. CONVENTIONS DE CODE

### Variables CSS — dashboard
- Fonds : `--dark` (fond global), `--dark2` (cartes/blanc), `--dark3` (zones légèrement teintées)
- Couleurs : `--blue`, `--blue2`, `--text`, `--text2`, `--text3`, `--border`, `--border2`
- Préfixes de classes par section : `perf-` (Performance), `pv-` (Post-vente)

### Variables CSS — landing
- Fonds : `--bg`, `--bg2`, `--bg3`, `--bg4`, `--surface`, `--surface2`
- Couleurs : `--blue`, `--blue2`, `--blue3`, `--indigo`

### i18n (index.html)
- Objet `TRANSLATIONS = { fr: {...}, en: {...} }` en bas de fichier
- Attributs HTML : `data-i18n="clé"` (textContent), `data-i18n-html="clé"` (innerHTML), `data-i18n-placeholder="clé"` (placeholder)
- **IMPORTANT** : dans le JS, les valeurs de traduction doivent utiliser du texte brut — pas `&amp;` (`textContent` ne décode pas les entités HTML)
- Fonction `toggleLang()` — bascule FR↔EN et appelle `setLang(lang)`

### EmailJS (index.html)
- publicKey : `u3mve1BFOCwBPKRBc`
- serviceID : `service_xql0hy1`
- templateID : `template_dz1anao`

### Fonctions JS principales (dashboard.html)
- `showSection(name)` — navigation (hook intercepte les sections verrouillées)
- `planAllows(name)` — vérification plan pour une section donnée
- `openUpgradeModal()` / `closeUpgradeModal()` — modal upgrade plan
- `loadContacts()`, `loadProspects()`, `loadAppointments()` — chargement Supabase
- `renderKanban()` — affichage kanban prospects
- `renderPostVente()` — section post-vente
- `callClaude(systemPrompt, messages, maxTokens)` — appel `/api/claude` avec JWT
- `updatePlanBadges()` — met à jour badges + opacité nav items selon plan

---

## 11. SÉCURITÉ

- **RLS Supabase** : actif sur toutes les tables — chaque user voit uniquement ses données
- **api/claude.js** : vérifie le JWT Supabase + interroge `user_plans` côté serveur avant tout appel Anthropic. Retourne 401 si non authentifié, 403 si plan insuffisant.
- **Storage** : RLS sur upload/delete — un user ne peut écrire que dans `{son_user_id}/`
- **Plan gating** : double vérification — JS frontend + serveur pour l'API IA

---

## 12. ÉTAT ACTUEL ET BLOQUANTS

| Élément | État |
|---------|------|
| Clients payants | 0 |
| Prospects contactés | 1 (agence immo, sans réponse) |
| Stripe | Non intégré — en attente SIRET Florian |
| Domaine pylotia.fr | À acheter |
| CGU / Mentions légales | Squelettes prêts — à compléter avec SIRET |
| SIRET Florian | En cours de création |
| Tests automatisés | 34/34 ✅ (Playwright, compte Free, production) |

---

## 13. PROCHAINS CHANTIERS

### Priorité haute
1. **Stripe** — intégrer paiements Starter/Pro dès que SIRET disponible
2. **Acquisition** — construire liste 100 prospects qualifiés
3. **Domaine** — acheter pylotia.fr

### Priorité moyenne
4. **Plan Business multi-comptes** (gros chantier) :
   - Nouvelle table `organizations` + `members`
   - RLS multi-comptes (chaque commercial voit ses données, directeur voit tout)
   - Système d'invitations
   - Vue consolidée direction
5. **Agents IA** prospection + closing (pour plan Business)

### Priorité basse
6. Compléter CGU + Mentions légales avec SIRET
7. Profil LinkedIn Florian

---

## 14. RÈGLES DE TRAVAIL AVEC CLAUDE CODE

- **Tutoiement uniquement**
- **Réponses concises, orientées action** — pas de blabla
- **Backtest systématique** après chaque grosse modification : `TEST_EMAIL=xxx TEST_PASSWORD=yyy node pilotia_tests/test-dashboard.js`
- **Ne jamais casser** :
  - i18n FR/EN (landing)
  - Chatbot flottant + formulaires EmailJS
  - RLS Supabase (chaque user voit uniquement ses données)
  - Light mode (dark supprimé volontairement — ne jamais réintroduire)
  - Auth Supabase (redirections login/signup/dashboard)
  - Plan gating (planAllows + hook showSection + vérif serveur api/claude.js)

---

## 15. VARIABLES D'ENVIRONNEMENT VERCEL

| Variable | Utilisation |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Clé API Anthropic pour `/api/claude.js` (Assistant IA Pro) |

Les clés Supabase et EmailJS sont dans le code frontend (clés publiques/anon — normal).

---

## 16. WORKFLOW GIT OBLIGATOIRE

```bash
git pull origin main          # Toujours avant de commencer
# ... modifications ...
git add <fichiers>
git commit -m "description courte"
git push origin main          # Vercel déploie en ~30 secondes
```

En cas de problème de push :
```
git push https://[PSEUDO]:[TOKEN]@github.com/lorikclauzier/pilotia.git main
```
Token : github.com/settings/tokens → classic → cocher repo

**Règles** :
- Toujours `git pull` avant de commencer
- Ne jamais modifier le même fichier en même temps que Flo
- En cas de conflit Git → demander à Claude de résoudre
