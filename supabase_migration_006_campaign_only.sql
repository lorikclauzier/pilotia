-- ============================================================
-- pylotIA — Migration 006 : contacts campaign_only
-- À exécuter dans : Supabase > SQL Editor > New Query
-- ============================================================

-- Colonne pour isoler les contacts importés via une campagne
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS campaign_only BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_contacts_campaign_only ON contacts(user_id, campaign_only);
