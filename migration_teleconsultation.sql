-- Migration: Module Téléconsultation

CREATE TABLE IF NOT EXISTS teleconsultations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id            UUID        REFERENCES persons(id) ON DELETE CASCADE,
  user_id              UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  teleconsult_date     TIMESTAMPTZ NOT NULL,
  doctor_name          TEXT        NOT NULL,
  specialty            TEXT,
  platform             TEXT        DEFAULT 'autre' CHECK (platform IN ('google_meet','zoom','whatsapp','teams','autre')),
  meeting_url          TEXT,
  duration_minutes     INTEGER,
  status               TEXT        DEFAULT 'planifie' CHECK (status IN ('planifie','termine','annule')),
  chief_complaint      TEXT,
  notes                TEXT,
  prescription_notes   TEXT,
  follow_up_date       DATE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teleconsultations_user_id ON teleconsultations(user_id);
CREATE INDEX IF NOT EXISTS idx_teleconsultations_status  ON teleconsultations(status);
CREATE INDEX IF NOT EXISTS idx_teleconsultations_date    ON teleconsultations(teleconsult_date);

CREATE OR REPLACE FUNCTION update_teleconsultations_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_teleconsultations_updated_at ON teleconsultations;
CREATE TRIGGER trg_teleconsultations_updated_at
  BEFORE UPDATE ON teleconsultations
  FOR EACH ROW EXECUTE FUNCTION update_teleconsultations_updated_at();

ALTER TABLE teleconsultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teleconsultations_select_own" ON teleconsultations;
DROP POLICY IF EXISTS "teleconsultations_insert_own" ON teleconsultations;
DROP POLICY IF EXISTS "teleconsultations_update_own" ON teleconsultations;
DROP POLICY IF EXISTS "teleconsultations_delete_own" ON teleconsultations;

CREATE POLICY "teleconsultations_select_own" ON teleconsultations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "teleconsultations_insert_own" ON teleconsultations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "teleconsultations_update_own" ON teleconsultations FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "teleconsultations_delete_own" ON teleconsultations FOR DELETE USING (user_id = auth.uid());
