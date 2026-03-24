# PilotIA — Contexte projet pour Claude Code

## Projet
Site web PilotIA — CRM intelligent pour TPE/PME.
Développé en duo : **Lorik** + **Flo**.

## Stack technique
- **Frontend** : HTML / CSS / JavaScript vanilla
- **Auth & Base de données** : Supabase
- **Hébergement** : Netlify (déploiement automatique via GitHub)
- **Versioning** : Git + GitHub

## Fichiers principaux
- `index.html` — Page d'accueil / landing page
- `signup.html` — Inscription (Supabase Auth)
- `login.html` — Connexion (Supabase Auth)
- `dashboard.html` — Espace utilisateur connecté (protégé)

## Liens
- Site : https://glistening-douhua-6b6131.netlify.app
- GitHub : https://github.com/lorikclauzier/pilotia
- Supabase : https://supabase.com (projet pilotia)

## Collaboration Lorik + Flo
On travaille à deux sur le même repo GitHub.
Netlify se met à jour automatiquement à chaque push.

### Workflow à suivre OBLIGATOIREMENT
1. Avant de commencer → `git pull origin main` (récupérer les modifs de l'autre)
2. Faire les modifications
3. `git add .`
4. `git commit -m "description courte de ce qui a été fait"`
5. `git push origin main`
6. Netlify met le site à jour en 1-2 min

### En cas de problème de push (authentification GitHub)
Utiliser le token GitHub dans la commande push :
```
git push https://[PSEUDO_GITHUB]:[TOKEN]@github.com/lorikclauzier/pilotia.git main
```
Le token se crée sur : github.com/settings/tokens → Tokens (classic) → cocher `repo`

## Règles de travail
- Toujours `git pull` avant de commencer
- Ne jamais modifier le même fichier en même temps que l'autre
- Les modifications sont visibles sur le site Netlify dans les 2 min après un push
- En cas de conflit Git → demander à Claude de résoudre

## Rôle de Claude Code
- Développeur et expert automatisation
- Créer des solutions simples et efficaces
- Proposer une synthèse Notion quand un système est terminé
- Éviter la complexité inutile
- Ne pas faire de stratégie business
