-- ============================================================
-- Module Suivi Paludisme
-- ============================================================

CREATE TABLE IF NOT EXISTS malaria_episodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,

  -- Épisode
  episode_date    DATE NOT NULL,
  end_date        DATE,

  -- Symptômes
  fever           BOOLEAN DEFAULT false,
  fever_temp      NUMERIC(4,1),          -- °C
  chills          BOOLEAN DEFAULT false,
  headache        BOOLEAN DEFAULT false,
  vomiting        BOOLEAN DEFAULT false,
  fatigue         BOOLEAN DEFAULT false,
  joint_pain      BOOLEAN DEFAULT false,
  sweating        BOOLEAN DEFAULT false,

  -- Diagnostic
  test_type       TEXT,                  -- TDR, Goutte_Epaisse, PCR, Frottis, Aucun
  test_result     TEXT,                  -- positif, negatif, non_fait
  parasite_species TEXT,                 -- P_falciparum, P_vivax, P_malariae, P_ovale, inconnu

  -- Traitement
  treatment_name  TEXT,                  -- Coartem, Artemether, Quinine, Artésunate, Autre
  treatment_other TEXT,
  treatment_start DATE,
  treatment_end   DATE,
  treatment_completed BOOLEAN DEFAULT false,

  -- Prise en charge
  hospitalized    BOOLEAN DEFAULT false,
  hospital_name   TEXT,
  severity        TEXT,                  -- simple, grave, cerebral

  -- Résultat
  outcome         TEXT,                  -- gueri, complications, hospitalise, deces

  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_malaria_person ON malaria_episodes(person_id);
CREATE INDEX IF NOT EXISTS idx_malaria_date ON malaria_episodes(episode_date DESC);

-- RLS
ALTER TABLE malaria_episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "malaria_select" ON malaria_episodes;
CREATE POLICY "malaria_select" ON malaria_episodes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM person_access pa
      WHERE pa.person_id = malaria_episodes.person_id
        AND pa.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "malaria_insert" ON malaria_episodes;
CREATE POLICY "malaria_insert" ON malaria_episodes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM person_access pa
      WHERE pa.person_id = malaria_episodes.person_id
        AND pa.user_id = auth.uid()
        AND pa.role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "malaria_update" ON malaria_episodes;
CREATE POLICY "malaria_update" ON malaria_episodes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM person_access pa
      WHERE pa.person_id = malaria_episodes.person_id
        AND pa.user_id = auth.uid()
        AND pa.role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "malaria_delete" ON malaria_episodes;
CREATE POLICY "malaria_delete" ON malaria_episodes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM person_access pa
      WHERE pa.person_id = malaria_episodes.person_id
        AND pa.user_id = auth.uid()
        AND pa.role = 'owner'
    )
  );
