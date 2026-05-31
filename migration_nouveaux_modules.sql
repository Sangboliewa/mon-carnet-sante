-- ============================================================
-- Mon Carnet Santé — Migration : Nouveaux modules
-- À exécuter dans Supabase Dashboard > SQL Editor
-- Utilise CREATE TABLE IF NOT EXISTS — sans danger si re-exécuté
-- ============================================================

-- ─── 1. Suivi des menstrues ───────────────────────────────────

CREATE TABLE IF NOT EXISTS menstrual_cycles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id         UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  start_date        DATE NOT NULL,
  end_date          DATE,
  flow              TEXT CHECK (flow IN ('light','medium','heavy','very_heavy')),
  symptoms          TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_updated_at_menstrual_cycles ON menstrual_cycles;
CREATE TRIGGER trg_updated_at_menstrual_cycles
  BEFORE UPDATE ON menstrual_cycles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE menstrual_cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mc_all" ON menstrual_cycles;
DROP POLICY IF EXISTS "mc_insert" ON menstrual_cycles;
CREATE POLICY "mc_all"    ON menstrual_cycles USING (user_has_access(person_id));
CREATE POLICY "mc_insert" ON menstrual_cycles FOR INSERT WITH CHECK (user_has_access(person_id));

-- ─── 2. Suivi de grossesse ────────────────────────────────────

CREATE TABLE IF NOT EXISTS pregnancies (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id             UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  lmp_date              DATE,
  expected_due_date     DATE,
  actual_delivery_date  DATE,
  status                TEXT NOT NULL DEFAULT 'ongoing'
                          CHECK (status IN ('ongoing','delivered','miscarriage','interrupted')),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prenatal_appointments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id           UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  pregnancy_id        UUID REFERENCES pregnancies(id) ON DELETE CASCADE,
  appointment_date    DATE NOT NULL,
  appointment_time    TEXT,
  appointment_type    TEXT NOT NULL,
  healthcare_provider TEXT,
  location            TEXT,
  completed           BOOLEAN NOT NULL DEFAULT FALSE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_updated_at_pregnancies ON pregnancies;
CREATE TRIGGER trg_updated_at_pregnancies
  BEFORE UPDATE ON pregnancies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_prenatal_appointments ON prenatal_appointments;
CREATE TRIGGER trg_updated_at_prenatal_appointments
  BEFORE UPDATE ON prenatal_appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE pregnancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE prenatal_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "preg_all"   ON pregnancies;
DROP POLICY IF EXISTS "preg_insert" ON pregnancies;
DROP POLICY IF EXISTS "pna_all"    ON prenatal_appointments;
DROP POLICY IF EXISTS "pna_insert" ON prenatal_appointments;
DROP POLICY IF EXISTS "pna_update" ON prenatal_appointments;

CREATE POLICY "preg_all"    ON pregnancies USING (user_has_access(person_id));
CREATE POLICY "preg_insert" ON pregnancies FOR INSERT WITH CHECK (user_has_access(person_id));
CREATE POLICY "pna_all"     ON prenatal_appointments USING (user_has_access(person_id));
CREATE POLICY "pna_insert"  ON prenatal_appointments FOR INSERT WITH CHECK (user_has_access(person_id));
CREATE POLICY "pna_update"  ON prenatal_appointments FOR UPDATE USING (user_has_access(person_id));

-- ─── 3. Mesures vitales ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS vital_measurements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id         UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  measurement_type  TEXT NOT NULL CHECK (measurement_type IN (
                      'blood_pressure','blood_glucose','heart_rate',
                      'weight','temperature','oxygen_saturation'
                    )),
  value_primary     NUMERIC(7,2) NOT NULL,
  value_secondary   NUMERIC(7,2),
  unit              TEXT NOT NULL,
  measured_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context           TEXT CHECK (context IN ('fasting','after_meal','before_meal','at_rest','after_exercise','other')),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vital_measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vm_all"    ON vital_measurements;
DROP POLICY IF EXISTS "vm_insert" ON vital_measurements;
CREATE POLICY "vm_all"    ON vital_measurements USING (user_has_access(person_id));
CREATE POLICY "vm_insert" ON vital_measurements FOR INSERT WITH CHECK (user_has_access(person_id));

-- ─── 4. Carnet de consultations ───────────────────────────────

CREATE TABLE IF NOT EXISTS medical_consultations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id             UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  consultation_date     DATE NOT NULL,
  doctor_name           TEXT,
  specialty             TEXT,
  reason                TEXT,
  diagnosis             TEXT,
  prescription_text     TEXT,
  follow_up_date        DATE,
  location              TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_updated_at_medical_consultations ON medical_consultations;
CREATE TRIGGER trg_updated_at_medical_consultations
  BEFORE UPDATE ON medical_consultations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE medical_consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mc2_all"    ON medical_consultations;
DROP POLICY IF EXISTS "mc2_insert" ON medical_consultations;
CREATE POLICY "mc2_all"    ON medical_consultations USING (user_has_access(person_id));
CREATE POLICY "mc2_insert" ON medical_consultations FOR INSERT WITH CHECK (user_has_access(person_id));

-- ─── 5. Rappels médicaments ───────────────────────────────────

CREATE TABLE IF NOT EXISTS medication_reminders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id         UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  medication_name   TEXT NOT NULL,
  dosage            TEXT,
  reminder_times    JSONB NOT NULL DEFAULT '[]',
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  start_date        DATE,
  end_date          DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_updated_at_medication_reminders ON medication_reminders;
CREATE TRIGGER trg_updated_at_medication_reminders
  BEFORE UPDATE ON medication_reminders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mr_all"    ON medication_reminders;
DROP POLICY IF EXISTS "mr_insert" ON medication_reminders;
DROP POLICY IF EXISTS "mr_update" ON medication_reminders;
CREATE POLICY "mr_all"    ON medication_reminders USING (user_has_access(person_id));
CREATE POLICY "mr_insert" ON medication_reminders FOR INSERT WITH CHECK (user_has_access(person_id));
CREATE POLICY "mr_update" ON medication_reminders FOR UPDATE USING (user_has_access(person_id));

-- ─── 6. Journal des symptômes ─────────────────────────────────

CREATE TABLE IF NOT EXISTS symptom_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id       UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  logged_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  pain_level      SMALLINT CHECK (pain_level BETWEEN 0 AND 10),
  fatigue_level   SMALLINT CHECK (fatigue_level BETWEEN 0 AND 10),
  mood            SMALLINT CHECK (mood BETWEEN 1 AND 5),
  symptoms_text   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (person_id, logged_date)
);

ALTER TABLE symptom_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sl2_all"    ON symptom_logs;
DROP POLICY IF EXISTS "sl2_insert" ON symptom_logs;
DROP POLICY IF EXISTS "sl2_update" ON symptom_logs;
CREATE POLICY "sl2_all"    ON symptom_logs USING (user_has_access(person_id));
CREATE POLICY "sl2_insert" ON symptom_logs FOR INSERT WITH CHECK (user_has_access(person_id));
CREATE POLICY "sl2_update" ON symptom_logs FOR UPDATE USING (user_has_access(person_id));

-- ─── 7. Agenda santé (rendez-vous) ───────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id             UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  appointment_date      DATE NOT NULL,
  appointment_time      TEXT,
  title                 TEXT NOT NULL,
  specialty             TEXT,
  doctor_name           TEXT,
  location              TEXT,
  completed             BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_days_before  SMALLINT NOT NULL DEFAULT 1,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_updated_at_appointments ON appointments;
CREATE TRIGGER trg_updated_at_appointments
  BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "appt_all"    ON appointments;
DROP POLICY IF EXISTS "appt_insert" ON appointments;
DROP POLICY IF EXISTS "appt_update" ON appointments;
CREATE POLICY "appt_all"    ON appointments USING (user_has_access(person_id));
CREATE POLICY "appt_insert" ON appointments FOR INSERT WITH CHECK (user_has_access(person_id));
CREATE POLICY "appt_update" ON appointments FOR UPDATE USING (user_has_access(person_id));

-- ─── 8. Résultats de laboratoire ─────────────────────────────

CREATE TABLE IF NOT EXISTS lab_results (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id       UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  test_date       DATE NOT NULL,
  test_name       TEXT NOT NULL,
  category        TEXT,
  value           NUMERIC(12,4) NOT NULL,
  unit            TEXT NOT NULL,
  ref_min         NUMERIC(12,4),
  ref_max         NUMERIC(12,4),
  lab_name        TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_updated_at_lab_results ON lab_results;
CREATE TRIGGER trg_updated_at_lab_results
  BEFORE UPDATE ON lab_results FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lr_all"    ON lab_results;
DROP POLICY IF EXISTS "lr_insert" ON lab_results;
CREATE POLICY "lr_all"    ON lab_results USING (user_has_access(person_id));
CREATE POLICY "lr_insert" ON lab_results FOR INSERT WITH CHECK (user_has_access(person_id));

-- ─── 9. Suivi pédiatrique (courbe de croissance) ─────────────

CREATE TABLE IF NOT EXISTS growth_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id       UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  recorded_date   DATE NOT NULL,
  height_cm       NUMERIC(5,1),
  weight_kg       NUMERIC(5,2),
  head_cm         NUMERIC(5,1),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE growth_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gr_all"    ON growth_records;
DROP POLICY IF EXISTS "gr_insert" ON growth_records;
DROP POLICY IF EXISTS "gr_delete" ON growth_records;
CREATE POLICY "gr_all"    ON growth_records USING (user_has_access(person_id));
CREATE POLICY "gr_insert" ON growth_records FOR INSERT WITH CHECK (user_has_access(person_id));
CREATE POLICY "gr_delete" ON growth_records FOR DELETE USING (user_has_access(person_id));

-- ─── Fin de migration ─────────────────────────────────────────
-- Vérification : toutes les tables doivent apparaître ici
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'menstrual_cycles','pregnancies','prenatal_appointments',
    'vital_measurements','medical_consultations','medication_reminders',
    'symptom_logs','appointments','lab_results','growth_records'
  )
ORDER BY table_name;
