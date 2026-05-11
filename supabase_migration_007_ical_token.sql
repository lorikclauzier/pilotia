-- ============================================================
-- pylotIA — Migration 007 : token iCal pour synchronisation agenda
-- À exécuter dans : Supabase > SQL Editor > New Query
-- ============================================================

ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS ical_token UUID DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_plans_ical_token ON user_plans(ical_token);
