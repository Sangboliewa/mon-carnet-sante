-- ============================================================
-- Configuration du Storage Supabase — Bucket medical-documents
--
-- ÉTAPE 1 (obligatoire avant ce SQL) :
--   Dashboard Supabase > Storage > "New bucket"
--   Nom : medical-documents
--   Public : NON (laisser privé)
--   Allowed MIME types : application/pdf, image/jpeg, image/png
--   Max upload size : 10MB
--
-- ÉTAPE 2 : Exécuter ce fichier dans SQL Editor
-- ============================================================

-- ─── Policies sur storage.objects ────────────────────────────
-- Les paths suivent la structure : {person_id}/{document_id}/{filename}
-- Exemple : "abc123/def456/bilan_sanguin.pdf"

-- 1. SELECT — un utilisateur peut lire ses propres fichiers
--    (vérifié via medical_documents qui contient person_id)
DROP POLICY IF EXISTS "storage_select_own" ON storage.objects;
CREATE POLICY "storage_select_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'medical-documents'
    AND (
      -- Propriétaire du fichier (person_id est le premier segment du path)
      EXISTS (
        SELECT 1 FROM public.medical_documents md
        JOIN public.person_access pa ON pa.person_id = md.person_id
        WHERE md.storage_path = name
          AND pa.user_id = auth.uid()
      )
    )
  );

-- 2. INSERT — un utilisateur peut uploader dans son propre dossier
DROP POLICY IF EXISTS "storage_insert_own" ON storage.objects;
CREATE POLICY "storage_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'medical-documents'
    AND (
      -- Vérifie que le premier segment du path est un person_id accessible
      EXISTS (
        SELECT 1 FROM public.person_access pa
        WHERE pa.user_id = auth.uid()
          AND pa.role IN ('owner', 'editor')
          AND (split_part(name, '/', 1))::text = pa.person_id::text
      )
    )
  );

-- 3. DELETE — seul le propriétaire (owner) peut supprimer
DROP POLICY IF EXISTS "storage_delete_own" ON storage.objects;
CREATE POLICY "storage_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'medical-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.medical_documents md
        JOIN public.person_access pa ON pa.person_id = md.person_id
        WHERE md.storage_path = name
          AND pa.user_id = auth.uid()
          AND pa.role = 'owner'
      )
    )
  );

-- 4. UPDATE — pas d'update direct des fichiers (on supprime et ré-uploade)
--    Aucune policy UPDATE = bloqué par défaut (bonne pratique)


-- ─── Vérification des policies (optionnel) ───────────────────
-- Exécutez cette requête pour confirmer que les policies sont actives :
--
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
-- ORDER BY policyname;
