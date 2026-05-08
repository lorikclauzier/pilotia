-- Migration 004 — Navbar order personnalisable par utilisateur
-- Ajouter la colonne navbar_order (jsonb) sur la table user_plans

ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS navbar_order jsonb;

-- Commentaire de colonne
COMMENT ON COLUMN user_plans.navbar_order IS 'Ordre personnalisé des items de la navbar (tableau de IDs, ex: ["nav-dashboard","nav-contacts",...])';
