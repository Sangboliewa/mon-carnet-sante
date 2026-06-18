-- Migration Module 16 — Activité physique
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS activity_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  log_date      date NOT NULL DEFAULT CURRENT_DATE,
  activity_type text NOT NULL,            -- 'marche','course','velo','natation','gym','yoga','football','autre'
  duration_min  integer NOT NULL CHECK (duration_min > 0),
  calories_burned integer,               -- kcal estimées
  steps         integer,                 -- nombre de pas (optionnel)
  distance_km   numeric(5,2),           -- distance en km (optionnel)
  intensity     text DEFAULT 'modere',   -- 'leger','modere','intense'
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_person_date ON activity_logs(person_id, log_date DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_update" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_delete" ON activity_logs;

CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT
  USING (person_id IN (
    SELECT id FROM persons WHERE created_by = auth.uid()
    UNION
    SELECT person_id FROM person_access WHERE user_id = auth.uid()
  ));

CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT
  WITH CHECK (person_id IN (
    SELECT id FROM persons WHERE created_by = auth.uid()
    UNION
    SELECT person_id FROM person_access WHERE user_id = auth.uid() AND role IN ('owner','editor')
  ));

CREATE POLICY "activity_logs_update" ON activity_logs FOR UPDATE
  USING (person_id IN (
    SELECT id FROM persons WHERE created_by = auth.uid()
    UNION
    SELECT person_id FROM person_access WHERE user_id = auth.uid() AND role IN ('owner','editor')
  ));

CREATE POLICY "activity_logs_delete" ON activity_logs FOR DELETE
  USING (person_id IN (
    SELECT id FROM persons WHERE created_by = auth.uid()
  ));
