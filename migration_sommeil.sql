-- Migration Module 17 — Sommeil
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sleep_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  log_date      date NOT NULL DEFAULT CURRENT_DATE,   -- date du réveil
  bedtime       time,                                  -- heure coucher
  wake_time     time,                                  -- heure réveil
  duration_min  integer,                              -- durée en minutes (calc ou saisi)
  quality       integer CHECK (quality BETWEEN 1 AND 5), -- 1=très mauvais 5=excellent
  notes         text,                                  -- rêves, réveils nocturnes, etc.
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sleep_logs_person_date ON sleep_logs(person_id, log_date DESC);

ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sleep_logs_select" ON sleep_logs;
DROP POLICY IF EXISTS "sleep_logs_insert" ON sleep_logs;
DROP POLICY IF EXISTS "sleep_logs_update" ON sleep_logs;
DROP POLICY IF EXISTS "sleep_logs_delete" ON sleep_logs;

CREATE POLICY "sleep_logs_select" ON sleep_logs FOR SELECT
  USING (person_id IN (
    SELECT id FROM persons WHERE created_by = auth.uid()
    UNION
    SELECT person_id FROM person_access WHERE user_id = auth.uid()
  ));

CREATE POLICY "sleep_logs_insert" ON sleep_logs FOR INSERT
  WITH CHECK (person_id IN (
    SELECT id FROM persons WHERE created_by = auth.uid()
    UNION
    SELECT person_id FROM person_access WHERE user_id = auth.uid() AND role IN ('owner','editor')
  ));

CREATE POLICY "sleep_logs_update" ON sleep_logs FOR UPDATE
  USING (person_id IN (
    SELECT id FROM persons WHERE created_by = auth.uid()
    UNION
    SELECT person_id FROM person_access WHERE user_id = auth.uid() AND role IN ('owner','editor')
  ));

CREATE POLICY "sleep_logs_delete" ON sleep_logs FOR DELETE
  USING (person_id IN (
    SELECT id FROM persons WHERE created_by = auth.uid()
  ));
