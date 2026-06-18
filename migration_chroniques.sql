-- Module 6: Suivi maladies chroniques
-- Diabète, HTA, Drépanocytose, et autres maladies chroniques

-- ─── Table chronic_conditions (si pas déjà créée) ─────────────────────────
-- Note: la table chronic_conditions existe probablement déjà, on vérifie
-- et on s'assure qu'elle a les bons champs

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chronic_conditions') THEN
    CREATE TABLE chronic_conditions (
      id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      person_id     UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      condition_name TEXT NOT NULL,
      icd_code      TEXT,
      diagnosed_date DATE,
      status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'remission', 'resolved')),
      notes         TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- ─── Table diabetes_records ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diabetes_records (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id       UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  glucose_fasting NUMERIC(5,2),   -- glycémie à jeun g/L
  glucose_postprandial NUMERIC(5,2), -- glycémie post-prandiale g/L
  hba1c           NUMERIC(4,2),   -- HbA1c %
  insulin_units   INTEGER,
  oral_meds_taken BOOLEAN DEFAULT false,
  meal_context    TEXT CHECK (meal_context IN ('fasting', 'before_meal', 'after_meal', 'bedtime', 'other')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Table hta_records ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hta_records (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id       UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  systolic        INTEGER NOT NULL,  -- mmHg
  diastolic       INTEGER NOT NULL,  -- mmHg
  heart_rate      INTEGER,
  arm             TEXT CHECK (arm IN ('left', 'right', 'both')),
  position        TEXT CHECK (position IN ('sitting', 'standing', 'lying')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Table drepanocytose_records ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drepanocytose_records (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id       UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type            TEXT CHECK (type IN ('crisis', 'transfusion', 'hospitalization', 'consultation', 'lab_result')),
  pain_level      INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  pain_locations  TEXT[],  -- ex: ['chest', 'joints', 'abdomen']
  hemoglobin      NUMERIC(4,2),   -- g/dL
  transfusion_volume INTEGER,     -- mL si transfusion
  trigger_factors TEXT[],  -- ex: ['cold', 'dehydration', 'infection', 'stress']
  hospitalized    BOOLEAN DEFAULT false,
  duration_days   INTEGER,
  treatment_given TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE diabetes_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE hta_records          ENABLE ROW LEVEL SECURITY;
ALTER TABLE drepanocytose_records ENABLE ROW LEVEL SECURITY;

-- diabetes_records
DROP POLICY IF EXISTS "diabetes_select" ON diabetes_records;
CREATE POLICY "diabetes_select" ON diabetes_records FOR SELECT
  USING (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

DROP POLICY IF EXISTS "diabetes_insert" ON diabetes_records;
CREATE POLICY "diabetes_insert" ON diabetes_records FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

DROP POLICY IF EXISTS "diabetes_update" ON diabetes_records;
CREATE POLICY "diabetes_update" ON diabetes_records FOR UPDATE
  USING (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

DROP POLICY IF EXISTS "diabetes_delete" ON diabetes_records;
CREATE POLICY "diabetes_delete" ON diabetes_records FOR DELETE
  USING (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

-- hta_records
DROP POLICY IF EXISTS "hta_select" ON hta_records;
CREATE POLICY "hta_select" ON hta_records FOR SELECT
  USING (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

DROP POLICY IF EXISTS "hta_insert" ON hta_records;
CREATE POLICY "hta_insert" ON hta_records FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

DROP POLICY IF EXISTS "hta_update" ON hta_records;
CREATE POLICY "hta_update" ON hta_records FOR UPDATE
  USING (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

DROP POLICY IF EXISTS "hta_delete" ON hta_records;
CREATE POLICY "hta_delete" ON hta_records FOR DELETE
  USING (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

-- drepanocytose_records
DROP POLICY IF EXISTS "drepa_select" ON drepanocytose_records;
CREATE POLICY "drepa_select" ON drepanocytose_records FOR SELECT
  USING (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

DROP POLICY IF EXISTS "drepa_insert" ON drepanocytose_records;
CREATE POLICY "drepa_insert" ON drepanocytose_records FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

DROP POLICY IF EXISTS "drepa_update" ON drepanocytose_records;
CREATE POLICY "drepa_update" ON drepanocytose_records FOR UPDATE
  USING (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

DROP POLICY IF EXISTS "drepa_delete" ON drepanocytose_records;
CREATE POLICY "drepa_delete" ON drepanocytose_records FOR DELETE
  USING (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));
