-- ============================================================
-- pylotIA — Migration 005 : Suggestions IA todos persistées
-- À exécuter dans : Supabase > SQL Editor > New Query
-- ============================================================

ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS ai_todos_suggestions JSONB,
  ADD COLUMN IF NOT EXISTS ai_todos_date DATE;
