# pylotIA — Référence projet pour Claude Code
> Mis à jour : mai 2026 — État complet du projet

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
- **Hébergement** : Vercel (déploiement auto à chaque push GitHub)
- **API IA** : `/api/claude.js` — proxy Vercel vers Anthropic API (plan Pro uniquement)
- **Emails** : EmailJS (formulaires contact, Business, chatbot leads)
- **Paiement** : Stripe — non intégré, en attente SIRET Florian

---

## 4. TARIFICATION

| Plan | Prix | Limites clés |
|------|------|--------------|
| Gratuit | 0€/mois | 10 contacts max, agenda basique |
| Starter | 29€/mois | Contacts illimités, campagnes, agenda complet, import CSV/Excel |
| Pro | 89€/mois | Tout Starter + Assistant IA, Post-vente, Performance avancée, relances auto |
| Business | Sur devis | Tout Pro + multi-comptes commerciaux, agents IA (à venir) |

**Argument commercial clé** : flat rate — pas de facturation par utilisateur.
Boutons Starter/Pro affichent "Prochainement" (non cliquables). Business = formulaire devis → email.

---

## 5. DESIGN SYSTEM

### Landing page (index.html)
- **Mode** : light uniquement (dark supprimé définitivement en V2)
- **CSS variables** :
  ```
  --bg:#f6f9ff  --bg2:#edf2ff  --bg3:#e2eafc  --bg4:#d6e2f8
  --surface:#ffffff  --surface2:#f0f5ff
  --blue:#4d8ef5  --blue2:#3b7ce8  --blue3:#2563eb
  --text:#0d1628  --text2:#4a5a78  --text3:#8393b5
  --border:rgba(0,0,0,0.08)  --border2:rgba(0,0,0,0.14)
  --border-blue:rgba(77,142,245,0.3)
  --r:14px  --r2:10px  --r3:8px
  ```
- **Polices** : Syne (titres, 700-800) + Inter (corps, 300-500)

### Dashboard (dashboard.html)
- **CSS variables** :
  ```
  --dark:#f0f5ff  --dark2:#ffffff  --dark3:#e8eef9
  --blue:#3b82f6  --blue2:#2563eb
  --text:#0f172a  --text2:#475569  --text3:#94a3b8
  --border:rgba(0,0,0,0.08)  --border2:rgba(0,0,0,0.14)
  ```

### Carte Pro (pricing)
- Fond blanc/bleu clair, bordure bleue, prix en bleu — se distingue des autres cartes

---

## 6. STRUCTURE DES FICHIERS

```
pilotia/
├── index.html                    # Landing page V2 (~1900 lignes) — i18n FR/EN complet
├── dashboard.html                # Interface CRM complète (~4700 lignes)
├── signup.html                   # Inscription (Supabase Auth)
├── login.html                    # Connexion (Supabase Auth)
├── forgot-password.html          # Demande reset mot de passe
├── reset-password.html           # Nouveau mot de passe
├── success.html                  # Après paiement Stripe réussi (prête)
├── cancel.html                   # Après annulation Stripe (prête)
├── cgu.html                      # CGU — à compléter avec SIRET Flo
├── mentions-legales.html         # Mentions légales — à compléter avec SIRET Flo
├── 404.html                      # Page d'erreur 404
├── favicon.svg                   # Logo SVG
├── og-image.svg                  # Open Graph image
├── robots.txt                    # SEO
├── sitemap.xml                   # SEO
├── vercel.json                   # Config Vercel (maxDuration: 30s pour api/claude.js)
├── package.json                  # Minimal (pas de framework)
├── supabase_migration.sql        # Migration initiale (contacts, prospects, user_plans, appointments)
├── supabase_migration_002_business_plan.sql  # Ajout plan Business
└── api/
    └── claude.js                 # Proxy Vercel → Anthropic API (plan Pro)
```

---

## 7. BASE DE DONNÉES SUPABASE

4 tables avec RLS strict (chaque user voit uniquement ses données) :

| Table | Contenu |
|-------|---------|
| `contacts` | Clients par utilisateur |
| `prospects` | Pipeline de prospection par utilisateur |
| `user_plans` | Plan actif par utilisateur (free/starter/pro/business) |
| `appointments` | Rendez-vous agenda par utilisateur |

**Important** : plus aucune donnée métier en localStorage — tout est en Supabase.

---

## 8. FONCTIONNALITÉS IMPLÉMENTÉES

### Auth
- Inscription / Connexion / Mot de passe oublié / Reset — Supabase Auth complet
- Redirection automatique après login

### Landing page (index.html)
- Sélecteur FR/EN avec système `data-i18n` / `data-i18n-html` / `data-i18n-placeholder`
- Fonction `setLang(lang)` — `textContent` pour `data-i18n`, `innerHTML` pour `data-i18n-html`
- Sections : Hero, Problème, Solution, Fonctionnalités, Démo interactive, Tarifs, FAQ, Contact
- **Démo interactive 7 onglets** (sidebar identique au vrai dashboard sur chaque onglet) :
  - Dashboard (stats + tableau contacts récents)
  - Contacts (liste clients)
  - Agenda (calendrier + RDV du jour)
  - Activité (fil d'activité chronologique)
  - Campagnes (3 cartes campagne avec barres de progression)
  - Relances (kanban 3 colonnes)
  - Assistant IA (chat démo)
- Sidebar démo : 9 items (Performance + Post-vente verrouillés PRO, grisés)
- Chatbot IA flottant : limite 3 messages → formulaire lead → EmailJS
- Formulaire contact général → EmailJS
- Formulaire devis Business → EmailJS + modal
- Carte Pro pricing : fond blanc/bleu clair, sort du lot visuellement

### Dashboard (dashboard.html)
10 sections accessibles via `showSection(name)` :

| Section | État | Plan requis |
|---------|------|-------------|
| `dashboard` | Fonctionnel | Gratuit |
| `contacts` | Fonctionnel (import CSV/Excel) | Gratuit (limité 10) |
| `agenda` | Fonctionnel | Gratuit |
| `activite` | Fonctionnel | Gratuit |
| `performance` | Fonctionnel | Pro |
| `postvente` | Fonctionnel | Pro |
| `messages` | Fonctionnel (campagnes) | Starter |
| `prospection` | Fonctionnel (kanban) | Starter |
| `assistant` | Fonctionnel (IA connectée aux vraies données) | Pro |
| `parametres` | Fonctionnel | Gratuit |

Assistant IA — 5 modes : chat libre, relances prioritaires, prospects chauds, message de relance, rapport hebdo.

---

## 9. CONVENTIONS DE CODE

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
- **IMPORTANT** : dans le JS, les valeurs de traduction doivent utiliser des entités HTML (`&#233;` etc.) ou du texte brut — pas `&amp;` (textContent ne décode pas les entités HTML)
- Fonction `toggleLang()` — bascule FR↔EN et appelle `setLang(lang)`

### EmailJS (index.html)
- publicKey : `u3mve1BFOCwBPKRBc`
- serviceID : `service_xql0hy1`
- templateID : `template_dz1anao`

### Fonctions JS principales (dashboard.html)
- `showSection(name)` — navigation entre les 10 sections
- `loadContacts()`, `loadProspects()`, `loadAppointments()` — chargement Supabase
- `renderKanban()` — affichage kanban prospects
- `renderPostVente()` — section post-vente
- `askAI(prompt)` / `sendToAssistant()` — appels `/api/claude.js`

---

## 10. ÉTAT ACTUEL ET BLOQUANTS

| Élément | État |
|---------|------|
| Clients payants | 0 |
| Prospects contactés | 1 (agence immo, sans réponse) |
| Stripe | Non intégré — en attente SIRET Florian |
| Domaine pylotia.fr | À acheter |
| CGU / Mentions légales | Squelettes prêts — à compléter avec SIRET |
| SIRET Florian | En cours de création |

---

## 11. PROCHAINS CHANTIERS

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

## 12. RÈGLES DE TRAVAIL AVEC CLAUDE CODE

- **Tutoiement uniquement**
- **Réponses concises, orientées action** — pas de blabla
- **Modifications par priorités numérotées** — montrer le résultat avant de passer à la suivante
- **Backtest systématique** après chaque grosse modification (naviguer sur le site, screenshot)
- **Ne jamais casser** :
  - i18n FR/EN (landing)
  - Chatbot flottant + formulaires EmailJS
  - RLS Supabase (chaque user voit uniquement ses données)
  - Light mode (dark supprimé volontairement — ne pas réintroduire)
  - Auth Supabase (redirections login/signup/dashboard)

---

## 13. VARIABLES D'ENVIRONNEMENT VERCEL

| Variable | Utilisation |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Clé API Anthropic pour `/api/claude.js` (Assistant IA Pro) |

Les clés Supabase et EmailJS sont dans le code frontend (clés publiques/anon — normal).

---

## 14. WORKFLOW GIT OBLIGATOIRE

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
