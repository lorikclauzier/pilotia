-- ============================================================
-- pylotIA — Migration Supabase
-- À exécuter dans : Supabase > SQL Editor > New Query
-- ============================================================

-- ─── TABLE : contacts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nom           TEXT NOT NULL,
  entreprise    TEXT,
  email         TEXT,
  tel           TEXT,
  statut        TEXT DEFAULT 'Lead',
  note          TEXT,
  date_ajout    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_isolation"
  ON contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index pour accélérer les requêtes par user_id
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(user_id, email);

-- ─── TABLE : prospects ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS prospects (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nom           TEXT NOT NULL,
  entreprise    TEXT,
  email         TEXT,
  tel           TEXT,
  statut        TEXT DEFAULT 'nouveau_lead'
                  CHECK (statut IN ('nouveau_lead','lead_contacte','prospect_qualifie',
                                    'proposition_envoyee','lead_converti','non_retenu')),
  source        TEXT DEFAULT 'Manuel',
  valeur        NUMERIC,
  relance       DATE,
  note          TEXT,
  date_ajout    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospects_isolation"
  ON prospects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_prospects_user_id ON prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_statut  ON prospects(user_id, statut);

-- ─── TABLE : user_plans ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_plans (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan              TEXT DEFAULT 'free'
                      CHECK (plan IN ('free','starter','pro')),
  date_activation   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stripe_customer_id TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- L'utilisateur peut lire et écrire uniquement sa propre ligne
CREATE POLICY "user_plans_isolation"
  ON user_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- IMPORTANT : seul un admin (service_role) peut changer le plan en production.
-- Pour l'instant la RLS autorise l'update par l'utilisateur (démo sans Stripe).
-- Quand Stripe sera intégré, remplacer la policy par :
--   CREATE POLICY "user_plans_read_only"
--     ON user_plans FOR SELECT USING (auth.uid() = user_id);
-- Et utiliser la clé service_role côté Stripe webhook pour les updates.

CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);

-- ─── VÉRIFICATION ────────────────────────────────────────────
-- Après exécution, vous devriez voir "Success. No rows returned."
-- Vérifiez dans Table Editor que les 3 tables sont créées.
