-- ============================================================
-- Migration : Sécurisation des liens partagés
-- Appliquer via : Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Ajouter token_hash à shared_links (SHA-256 hex du token brut)
ALTER TABLE shared_links
  ADD COLUMN IF NOT EXISTS token_hash TEXT;

-- Créer un index unique sur token_hash pour les lookups rapides
CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_links_token_hash
  ON shared_links (token_hash);

-- 2. Table d'audit des accès aux liens partagés
CREATE TABLE IF NOT EXISTS share_access_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id       UUID NOT NULL REFERENCES shared_links(id) ON DELETE CASCADE,
  accessed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address    TEXT,
  user_agent    TEXT
);

-- Pas de RLS sur cette table : l'écriture se fait via service_role (API route)
-- La lecture est réservée au propriétaire du lien (policy ci-dessous)
ALTER TABLE share_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sal_owner_select" ON share_access_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_links sl
      WHERE sl.id = share_access_log.link_id
        AND sl.created_by = auth.uid()
    )
  );

-- 3. Policy RLS pour que l'API route (service_role) puisse lire un lien par token_hash
-- Note : avec service_role la RLS est bypassée, donc pas besoin d'une policy supplémentaire.
-- Cette policy permet à un utilisateur ANONYME de lire un lien valide par hash
-- (utile si l'on veut interroger en anon key depuis l'API route côté serveur)
CREATE POLICY "sl_public_by_hash" ON shared_links
  FOR SELECT
  USING (
    token_hash IS NOT NULL
    AND revoked = FALSE
    AND expires_at > NOW()
  );
