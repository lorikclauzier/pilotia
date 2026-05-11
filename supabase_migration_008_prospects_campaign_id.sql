-- ============================================================
-- pylotIA — Migration 008 : campaign_id sur la table prospects
-- À exécuter dans : Supabase > SQL Editor > New Query
-- ============================================================

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_campaign_id ON prospects(campaign_id);
