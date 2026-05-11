-- ============================================================
-- pylotIA — Migration 004 : Table todos
-- À exécuter dans : Supabase > SQL Editor > New Query
-- ============================================================

-- ─── TABLE : todos ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS todos (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titre         TEXT NOT NULL,
  priorite      TEXT DEFAULT 'normale' CHECK (priorite IN ('haute','normale','basse')),
  date_echeance DATE,
  contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
  cochee        BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at  TIMESTAMP WITH TIME ZONE
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos_isolation"
  ON todos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_cochee   ON todos(user_id, cochee);
CREATE INDEX IF NOT EXISTS idx_todos_echeance ON todos(user_id, date_echeance);
