# pylotIA — Contexte projet pour Claude Code

## Projet
Site web pylotIA — CRM intelligent pour TPE/PME.
Développé en duo : **Lorik** (DG, dev) + **Flo** (Président, commercial).

## Stack technique
- **Frontend** : HTML / CSS / JavaScript vanilla
- **Auth & Base de données** : Supabase
- **Hébergement** : Vercel (déploiement automatique via GitHub)
- **Versioning** : Git + GitHub

## Fichiers principaux
- `index.html` — Landing page
- `signup.html` — Inscription (Supabase Auth)
- `login.html` — Connexion (Supabase Auth)
- `forgot-password.html` — Reset mot de passe
- `reset-password.html` — Nouveau mot de passe
- `dashboard.html` — Dashboard CRM complet
- `success.html` — Page après paiement réussi
- `cancel.html` — Page après annulation paiement
- `cgu.html` — CGU
- `mentions-legales.html` — Mentions légales
- `api/claude.js` — Proxy Vercel vers Anthropic API

## Liens
- Site : https://pilotia.vercel.app
- GitHub : https://github.com/lorikclauzier/pilotia
- Supabase : https://supabase.com (projet pilotia)
- Email contact : pylotia.app@gmail.com

## Base de données Supabase
4 tables avec RLS strict activé :
- `contacts` — contacts clients par utilisateur
- `prospects` — prospects pipeline par utilisateur
- `user_plans` — plan de chaque utilisateur (free/starter/pro)
- `appointments` — RDV agenda par utilisateur

Plus aucune donnée métier en localStorage — tout est en Supabase.

## Plans tarifaires
- **Gratuit** : 0€, 10 contacts max, pas de carte requise
- **Starter** : 199€/mois, 14 jours d'essai, carte requise
- **Pro** : 449€/mois, 14 jours d'essai, carte requise

## Stripe
Pas encore intégré — en attente configuration micro-entreprise Flo.
Pages success.html et cancel.html prêtes.

## Assistant IA
Fonctionne via /api/claude.js sur Vercel.
Connecté aux vraies données Supabase de l'utilisateur connecté.
5 modes : chat libre, relances prioritaires, prospects chauds, message de relance, rapport hebdo.
Accessible uniquement en plan Pro.

## Domaine
Futur domaine : pylotia.com (pas encore acheté).
URL actuelle : pilotia.vercel.app

## Collaboration Lorik + Flo
On travaille à deux sur le même repo GitHub.
Vercel se met à jour automatiquement à chaque push.

### Workflow OBLIGATOIRE
1. `git pull origin main`
2. Faire les modifications
3. `git add .`
4. `git commit -m "description courte"`
5. `git push origin main`
6. Vercel met à jour en 30 secondes

### En cas de problème de push
```
git push https://[PSEUDO]:[TOKEN]@github.com/lorikclauzier/pilotia.git main
```
Token : github.com/settings/tokens → classic → cocher repo

## Règles
- Toujours git pull avant de commencer
- Ne jamais modifier le même fichier en même temps
- En cas de conflit Git → demander à Claude de résoudre

## Rôle de Claude Code
- Développeur expert
- Solutions simples et efficaces
- Pas de stratégie business
- Proposer synthèse Notion quand un système est terminé
