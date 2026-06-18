-- Migration: Module Nutrition

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id   UUID        REFERENCES persons(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date    DATE        NOT NULL,
  meal_type   TEXT        CHECK (meal_type IN ('petit_dejeuner','dejeuner','diner','collation')),
  description TEXT,
  calories    INTEGER,
  proteins_g  NUMERIC(5,1),
  carbs_g     NUMERIC(5,1),
  fats_g      NUMERIC(5,1),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nutrition_logs_select" ON nutrition_logs;
DROP POLICY IF EXISTS "nutrition_logs_insert" ON nutrition_logs;
DROP POLICY IF EXISTS "nutrition_logs_update" ON nutrition_logs;
DROP POLICY IF EXISTS "nutrition_logs_delete" ON nutrition_logs;

CREATE POLICY "nutrition_logs_select" ON nutrition_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "nutrition_logs_insert" ON nutrition_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "nutrition_logs_update" ON nutrition_logs FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "nutrition_logs_delete" ON nutrition_logs FOR DELETE USING (user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date ON nutrition_logs(user_id, log_date);

CREATE TABLE IF NOT EXISTS water_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     UUID        REFERENCES persons(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date      DATE        NOT NULL,
  glasses_count INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, person_id, log_date)
);

ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "water_logs_select" ON water_logs;
DROP POLICY IF EXISTS "water_logs_insert" ON water_logs;
DROP POLICY IF EXISTS "water_logs_update" ON water_logs;
DROP POLICY IF EXISTS "water_logs_delete" ON water_logs;

CREATE POLICY "water_logs_select" ON water_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "water_logs_insert" ON water_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "water_logs_update" ON water_logs FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "water_logs_delete" ON water_logs FOR DELETE USING (user_id = auth.uid());
