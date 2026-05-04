-- ============================================================
-- pylotIA — Migration 002 : Ajout du plan Business
-- À exécuter dans : Supabase > SQL Editor > New Query
-- ============================================================
-- Cette migration met à jour la contrainte CHECK de la colonne
-- `plan` de la table `user_plans` pour accepter la valeur 'business'.
-- Les RLS existantes ne sont pas affectées (elles sont indépendantes
-- de la contrainte CHECK).
-- ============================================================

-- 1) Supprimer l'ancienne contrainte (free / starter / pro)
ALTER TABLE user_plans
  DROP CONSTRAINT IF EXISTS user_plans_plan_check;

-- 2) Recréer la contrainte avec 'business' inclus
ALTER TABLE user_plans
  ADD CONSTRAINT user_plans_plan_check
  CHECK (plan IN ('free','starter','pro','business'));

-- ─── VÉRIFICATIONS ───────────────────────────────────────────
-- a) Voir la contrainte mise à jour :
--    SELECT conname, pg_get_constraintdef(oid)
--    FROM pg_constraint
--    WHERE conrelid = 'user_plans'::regclass AND contype = 'c';
--
-- b) Tester l'insertion d'un plan business (à supprimer après) :
--    INSERT INTO user_plans (user_id, plan)
--    VALUES (auth.uid(), 'business');
--
-- c) Vérifier que les RLS sont toujours actives :
--    SELECT relname, relrowsecurity
--    FROM pg_class
--    WHERE relname = 'user_plans';
--    -- relrowsecurity doit être 't'
--
-- d) Vérifier que la policy existe toujours :
--    SELECT polname, polcmd FROM pg_policy
--    WHERE polrelid = 'user_plans'::regclass;
--    -- doit retourner "user_plans_isolation"
