-- ============================================================
-- pylotIA — Migration 003 : Documents joints aux contacts
-- À exécuter dans : Supabase > SQL Editor > New Query
-- ============================================================

-- ─── TABLE : contact_documents ───────────────────────────────
CREATE TABLE IF NOT EXISTS contact_documents (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id    UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  nom_fichier   TEXT NOT NULL,
  url           TEXT NOT NULL,
  chemin        TEXT NOT NULL,
  taille        BIGINT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE contact_documents ENABLE ROW LEVEL SECURITY;

-- Chaque user voit et gère uniquement ses propres documents
CREATE POLICY "contact_documents_select" ON contact_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "contact_documents_insert" ON contact_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contact_documents_delete" ON contact_documents
  FOR DELETE USING (auth.uid() = user_id);

-- ─── BUCKET : contact-documents ──────────────────────────────
-- Bucket public (les URLs sont stockées en DB, accès en lecture ouvert)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contact-documents',
  'contact-documents',
  true,
  10485760,  -- 10 Mo max par fichier
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─── RLS STORAGE : contact-documents ─────────────────────────
-- Lecture publique (bucket public — pas de policy SELECT nécessaire)

-- Upload : authentifié + chemin commence par son propre user_id
CREATE POLICY "storage_contact_docs_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'contact-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Suppression : authentifié + chemin commence par son propre user_id
CREATE POLICY "storage_contact_docs_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'contact-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
