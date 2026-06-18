-- ============================================================
-- FICHIER : schema_supabase_rls.sql
-- ============================================================

-- ============================================================
-- Mon Carnet Santé — Schéma Supabase avec RLS
-- Appliquer via : Supabase Dashboard > SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS persons (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by                      UUID NOT NULL REFERENCES auth.users(id),
  first_name                      TEXT NOT NULL,
  last_name                       TEXT NOT NULL,
  date_of_birth                   DATE,
  gender                          TEXT CHECK (gender IN ('male', 'female', 'other')),
  blood_type                      TEXT CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  height_cm                       NUMERIC(5,1),
  weight_kg                       NUMERIC(5,1),
  emergency_contact_name          TEXT,
  emergency_contact_phone         TEXT,
  social_security_number_encrypted TEXT,
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS person_access (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id   UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  role        TEXT NOT NULL CHECK (role IN ('owner', 'viewer', 'editor')),
  granted_by  UUID NOT NULL REFERENCES auth.users(id),
  granted_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (person_id, user_id)
);

-- Trigger : crée automatiquement l'accès owner à la création d'une person
CREATE OR REPLACE FUNCTION create_owner_access()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO person_access (person_id, user_id, role, granted_by)
  VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by)
  ON CONFLICT (person_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_owner_access ON persons;
CREATE TRIGGER trg_create_owner_access
  AFTER INSERT ON persons
  FOR EACH ROW EXECUTE FUNCTION create_owner_access();

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TABLE IF NOT EXISTS allergies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id       UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  allergen        TEXT NOT NULL,
  allergen_code   TEXT,
  coding_system   TEXT NOT NULL DEFAULT 'INTERNE',
  severity        TEXT CHECK (severity IN ('mild','moderate','severe','life_threatening')),
  reaction        TEXT,
  diagnosed_date  DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chronic_conditions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id       UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  condition_name  TEXT NOT NULL,
  condition_code  TEXT,
  coding_system   TEXT NOT NULL DEFAULT 'INTERNE',
  status          TEXT CHECK (status IN ('active','remission','resolved')),
  diagnosed_date  DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treatments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id           UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  medication_name     TEXT NOT NULL,
  medication_code     TEXT,
  coding_system       TEXT NOT NULL DEFAULT 'INTERNE',
  dosage              TEXT,
  frequency           TEXT,
  start_date          DATE,
  end_date            DATE,
  prescribing_doctor  TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vaccinations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id             UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  vaccine_name          TEXT NOT NULL,
  vaccine_code          TEXT,
  coding_system         TEXT NOT NULL DEFAULT 'INTERNE',
  administered_date     DATE,
  batch_number          TEXT,
  administering_center  TEXT,
  next_dose_date        DATE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_documents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id         UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  uploaded_by       UUID NOT NULL REFERENCES auth.users(id),
  filename          TEXT NOT NULL,
  storage_path      TEXT NOT NULL DEFAULT '',
  file_type         TEXT NOT NULL,
  file_size_bytes   BIGINT,
  document_type     TEXT,
  exam_type         TEXT,
  document_date     DATE,
  issuing_facility  TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_glossary (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_type         TEXT NOT NULL UNIQUE,
  display_name      TEXT NOT NULL,
  description       TEXT,
  educational_text  TEXT NOT NULL,
  normal_ranges     JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_explanations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id   UUID NOT NULL REFERENCES medical_documents(id) ON DELETE CASCADE,
  person_id     UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  requested_by  UUID NOT NULL REFERENCES auth.users(id),
  glossary_id   UUID REFERENCES exam_glossary(id),
  viewed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared_links (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id         UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  document_id       UUID REFERENCES medical_documents(id) ON DELETE SET NULL,
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  token             TEXT NOT NULL UNIQUE,
  expires_at        TIMESTAMPTZ NOT NULL,
  access_count      INTEGER NOT NULL DEFAULT 0,
  max_access_count  INTEGER,
  revoked           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id     UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  consent_type  TEXT NOT NULL,
  granted       BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at    TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at triggers for mutable tables
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['persons','allergies','chronic_conditions','treatments','vaccinations','medical_documents','exam_glossary']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at_%s ON %s;
       CREATE TRIGGER trg_updated_at_%s BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END;
$$;

-- ─── Storage bucket ───────────────────────────────────────────
-- À créer manuellement dans le dashboard Supabase Storage :
-- Bucket name : medical-documents
-- Public : NON (private)

-- ─── RLS Policies ────────────────────────────────────────────

ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE chronic_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION user_has_access(p_person_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM person_access
    WHERE person_id = p_person_id AND user_id = auth.uid()
  );
$$;

-- persons
CREATE POLICY "persons_select" ON persons FOR SELECT USING (user_has_access(id));
CREATE POLICY "persons_insert" ON persons FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "persons_update" ON persons FOR UPDATE USING (user_has_access(id));

-- person_access
CREATE POLICY "pa_select" ON person_access FOR SELECT USING (user_id = auth.uid() OR user_has_access(person_id));
CREATE POLICY "pa_insert" ON person_access FOR INSERT WITH CHECK (user_has_access(person_id));

-- allergies
CREATE POLICY "allergies_all" ON allergies USING (user_has_access(person_id));
CREATE POLICY "allergies_insert" ON allergies FOR INSERT WITH CHECK (user_has_access(person_id));

-- chronic_conditions
CREATE POLICY "cc_all" ON chronic_conditions USING (user_has_access(person_id));
CREATE POLICY "cc_insert" ON chronic_conditions FOR INSERT WITH CHECK (user_has_access(person_id));

-- treatments
CREATE POLICY "tx_all" ON treatments USING (user_has_access(person_id));
CREATE POLICY "tx_insert" ON treatments FOR INSERT WITH CHECK (user_has_access(person_id));

-- vaccinations
CREATE POLICY "vax_all" ON vaccinations USING (user_has_access(person_id));
CREATE POLICY "vax_insert" ON vaccinations FOR INSERT WITH CHECK (user_has_access(person_id));

-- medical_documents
CREATE POLICY "docs_select" ON medical_documents FOR SELECT USING (user_has_access(person_id));
CREATE POLICY "docs_insert" ON medical_documents FOR INSERT WITH CHECK (user_has_access(person_id) AND uploaded_by = auth.uid());
CREATE POLICY "docs_update" ON medical_documents FOR UPDATE USING (user_has_access(person_id));
CREATE POLICY "docs_delete" ON medical_documents FOR DELETE USING (uploaded_by = auth.uid());

-- exam_glossary (lecture publique pour utilisateurs authentifiés)
CREATE POLICY "glossary_select" ON exam_glossary FOR SELECT USING (auth.uid() IS NOT NULL);

-- document_explanations
CREATE POLICY "de_select" ON document_explanations FOR SELECT USING (requested_by = auth.uid());
CREATE POLICY "de_insert" ON document_explanations FOR INSERT WITH CHECK (requested_by = auth.uid() AND user_has_access(person_id));

-- shared_links
CREATE POLICY "sl_select" ON shared_links FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "sl_insert" ON shared_links FOR INSERT WITH CHECK (created_by = auth.uid() AND user_has_access(person_id));
CREATE POLICY "sl_update" ON shared_links FOR UPDATE USING (created_by = auth.uid());

-- consents
CREATE POLICY "consents_all" ON consents USING (user_has_access(person_id));
CREATE POLICY "consents_insert" ON consents FOR INSERT WITH CHECK (user_has_access(person_id));

-- ─── Suivi des menstrues ──────────────────────────────────────

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
  BEFORE UPDATE ON menstrual_cycles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE menstrual_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mc_all" ON menstrual_cycles USING (user_has_access(person_id));
CREATE POLICY "mc_insert" ON menstrual_cycles FOR INSERT WITH CHECK (user_has_access(person_id));

-- ─── Suivi de grossesse ───────────────────────────────────────

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

CREATE POLICY "preg_all" ON pregnancies USING (user_has_access(person_id));
CREATE POLICY "preg_insert" ON pregnancies FOR INSERT WITH CHECK (user_has_access(person_id));

CREATE POLICY "pna_all" ON prenatal_appointments USING (user_has_access(person_id));
CREATE POLICY "pna_insert" ON prenatal_appointments FOR INSERT WITH CHECK (user_has_access(person_id));
CREATE POLICY "pna_update" ON prenatal_appointments FOR UPDATE USING (user_has_access(person_id));

-- ─── Mesures vitales ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vital_measurements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id         UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  measurement_type  TEXT NOT NULL CHECK (measurement_type IN (
                      'blood_pressure', 'blood_glucose', 'heart_rate',
                      'weight', 'temperature', 'oxygen_saturation'
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
CREATE POLICY "vm_all" ON vital_measurements USING (user_has_access(person_id));
CREATE POLICY "vm_insert" ON vital_measurements FOR INSERT WITH CHECK (user_has_access(person_id));

-- ─── Carnet de consultations ──────────────────────────────────

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
CREATE POLICY "mc2_all" ON medical_consultations USING (user_has_access(person_id));
CREATE POLICY "mc2_insert" ON medical_consultations FOR INSERT WITH CHECK (user_has_access(person_id));

-- ─── Rappels médicaments ──────────────────────────────────────

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
CREATE POLICY "mr_all" ON medication_reminders USING (user_has_access(person_id));
CREATE POLICY "mr_insert" ON medication_reminders FOR INSERT WITH CHECK (user_has_access(person_id));
CREATE POLICY "mr_update" ON medication_reminders FOR UPDATE USING (user_has_access(person_id));

-- ─── Suivi des symptômes ──────────────────────────────────────

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
CREATE POLICY "sl2_all" ON symptom_logs USING (user_has_access(person_id));
CREATE POLICY "sl2_insert" ON symptom_logs FOR INSERT WITH CHECK (user_has_access(person_id));
CREATE POLICY "sl2_update" ON symptom_logs FOR UPDATE USING (user_has_access(person_id));

-- ─── Agenda (rendez-vous général) ────────────────────────────

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
CREATE POLICY "appt_all" ON appointments USING (user_has_access(person_id));
CREATE POLICY "appt_insert" ON appointments FOR INSERT WITH CHECK (user_has_access(person_id));
CREATE POLICY "appt_update" ON appointments FOR UPDATE USING (user_has_access(person_id));

-- ─── Résultats de laboratoire ─────────────────────────────────

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
CREATE POLICY "lr_all" ON lab_results USING (user_has_access(person_id));
CREATE POLICY "lr_insert" ON lab_results FOR INSERT WITH CHECK (user_has_access(person_id));

-- ─── Suivi pédiatrique (courbe de croissance) ─────────────────

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
CREATE POLICY "gr_all" ON growth_records USING (user_has_access(person_id));
CREATE POLICY "gr_insert" ON growth_records FOR INSERT WITH CHECK (user_has_access(person_id));
CREATE POLICY "gr_delete" ON growth_records FOR DELETE USING (user_has_access(person_id));


-- ============================================================
-- FICHIER : migration_nouveaux_modules.sql
-- ============================================================

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


-- ============================================================
-- FICHIER : migration_security_shared_links.sql
-- ============================================================

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


-- ============================================================
-- FICHIER : seed_exam_glossary.sql
-- ============================================================

-- ============================================================
-- Seed : Glossaire des examens médicaux courants
-- Appliquer via : Supabase Dashboard > SQL Editor
-- ============================================================

INSERT INTO exam_glossary (exam_type, display_name, description, educational_text, normal_ranges)
VALUES

-- ─── Bilan sanguin ───────────────────────────────────────────

('NFS', 'Numération Formule Sanguine (NFS)',
'Analyse complète des cellules du sang : globules rouges, globules blancs et plaquettes.',
'La NFS (ou hémogramme) est l''examen sanguin le plus courant. Elle mesure :

• Les globules rouges (érythrocytes) : transportent l''oxygène dans l''organisme.
• L''hémoglobine : protéine contenue dans les globules rouges, porteuse de l''oxygène.
• Le taux d''hématocrite : proportion du sang occupée par les globules rouges.
• Les globules blancs (leucocytes) : défendent l''organisme contre les infections.
• Les plaquettes (thrombocytes) : interviennent dans la coagulation du sang.

Un résultat anormal peut orienter vers une anémie, une infection, une inflammation ou une maladie du sang. Votre médecin interprétera les résultats dans le contexte de vos symptômes.',
'{
  "Hémoglobine (femme)": "12–16 g/dL",
  "Hémoglobine (homme)": "13–17 g/dL",
  "Globules blancs": "4 000–10 000 /mm³",
  "Plaquettes": "150 000–400 000 /mm³",
  "Hématocrite (femme)": "36–46 %",
  "Hématocrite (homme)": "40–52 %"
}'::jsonb),

('GLYCEMIE', 'Glycémie (taux de sucre dans le sang)',
'Mesure de la concentration de glucose dans le sang, à jeun ou après un repas.',
'La glycémie mesure la quantité de sucre (glucose) dans votre sang. Le glucose est la principale source d''énergie de l''organisme.

• À jeun : reflète la capacité du corps à réguler le sucre pendant la nuit.
• Après repas (postprandiale) : évalue la réponse de l''organisme à l''alimentation.

Des valeurs élevées à jeun (hyperglycémie) peuvent indiquer un diabète ou un prédiabète. Des valeurs trop basses (hypoglycémie) peuvent causer des malaises, vertiges ou perte de conscience.

L''examen est souvent complété par un dosage de l''HbA1c (hémoglobine glyquée) pour évaluer l''équilibre glycémique sur 3 mois.',
'{
  "À jeun (normale)": "< 1,10 g/L (6,1 mmol/L)",
  "À jeun (prédiabète)": "1,10–1,25 g/L",
  "À jeun (diabète)": "≥ 1,26 g/L (2 mesures)",
  "2h après repas (normale)": "< 1,40 g/L",
  "HbA1c (cible diabétique)": "< 7 %"
}'::jsonb),

('HBA1C', 'Hémoglobine glyquée (HbA1c)',
'Indicateur de l''équilibre glycémique sur les 2 à 3 derniers mois.',
'L''HbA1c mesure la proportion d''hémoglobine liée au glucose dans les globules rouges. Contrairement à la glycémie ponctuelle, elle reflète la moyenne des taux de sucre sur environ 3 mois.

C''est l''examen clé pour surveiller l''équilibre du diabète. Chez les personnes diabétiques, l''objectif habituel est d''avoir une HbA1c < 7 % (à adapter selon l''âge et les comorbidités).

Un taux élevé indique que le sucre a été trop haut de façon prolongée, augmentant le risque de complications (rein, yeux, nerfs, cœur).',
'{
  "Normale (non diabétique)": "< 5,7 %",
  "Prédiabète": "5,7–6,4 %",
  "Diabète": "≥ 6,5 %",
  "Objectif traitement diabète": "< 7 % (en général)"
}'::jsonb),

('BILAN_LIPIDIQUE', 'Bilan lipidique (cholestérol et triglycérides)',
'Mesure des graisses dans le sang : cholestérol total, LDL, HDL et triglycérides.',
'Le bilan lipidique évalue les graisses circulant dans votre sang :

• Cholestérol total : somme de tous les types de cholestérol.
• LDL (« mauvais cholestérol ») : peut s''accumuler dans les artères et former des plaques.
• HDL (« bon cholestérol ») : transporte le cholestérol vers le foie pour élimination. Plus il est élevé, mieux c''est.
• Triglycérides : graisses provenant principalement de l''alimentation et de l''alcool.

Des niveaux élevés de LDL et de triglycérides augmentent le risque cardiovasculaire (infarctus, AVC). Le traitement peut inclure des changements alimentaires, de l''exercice ou des médicaments (statines).',
'{
  "Cholestérol total": "< 2,0 g/L (souhaitable)",
  "LDL (bas risque cardiovasculaire)": "< 1,30 g/L",
  "LDL (haut risque cardiovasculaire)": "< 0,70 g/L",
  "HDL (femme)": "> 0,60 g/L",
  "HDL (homme)": "> 0,40 g/L",
  "Triglycérides": "< 1,50 g/L"
}'::jsonb),

('CREATININE', 'Créatinine et fonction rénale',
'Indicateur de la capacité des reins à filtrer le sang.',
'La créatinine est un déchet musculaire éliminé par les reins. Son taux dans le sang permet d''évaluer la fonction rénale.

En pratique, on calcule le DFG (débit de filtration glomérulaire) à partir de la créatinine, de l''âge, du sexe et du poids pour estimer la fonction rénale globale.

Un taux de créatinine élevé peut indiquer une insuffisance rénale aiguë ou chronique. L''analyse des urines (protéinurie, microalbuminurie) complète souvent cet examen.',
'{
  "Créatinine (femme)": "50–90 µmol/L (0,6–1,0 mg/dL)",
  "Créatinine (homme)": "60–115 µmol/L (0,7–1,3 mg/dL)",
  "DFG normal": "> 90 mL/min/1,73m²",
  "Insuffisance rénale légère": "60–89 mL/min",
  "Insuffisance rénale modérée": "30–59 mL/min",
  "Insuffisance rénale sévère": "< 30 mL/min"
}'::jsonb),

('TSH', 'TSH (hormone thyréostimulante)',
'Évalue la fonction de la glande thyroïde.',
'La TSH est une hormone produite par l''hypophyse (glande dans le cerveau) qui stimule la thyroïde à produire ses hormones (T3 et T4).

• TSH élevée : la thyroïde fonctionne insuffisamment (hypothyroïdie) — fatigue, prise de poids, froid, constipation.
• TSH basse : la thyroïde est hyperactive (hyperthyroïdie) — palpitations, perte de poids, nervosité, chaleur.

Si la TSH est anormale, le médecin demandera souvent les hormones T3 libre et T4 libre pour préciser le diagnostic.',
'{
  "TSH (adulte)": "0,4–4,0 mUI/L",
  "TSH (grossesse 1er trimestre)": "0,1–2,5 mUI/L",
  "TSH (grossesse 2e–3e trimestre)": "0,2–3,0 mUI/L"
}'::jsonb),

('TRANSAMINASES', 'Transaminases (ASAT / ALAT)',
'Enzymes hépatiques indiquant l''état du foie.',
'Les transaminases (ASAT/GOT et ALAT/GPT) sont des enzymes présentes dans les cellules du foie. Quand le foie est endommagé, elles se libèrent dans le sang.

• ALAT (alanine aminotransférase) : plus spécifique du foie.
• ASAT (aspartate aminotransférase) : présente aussi dans le cœur et les muscles.

Une élévation peut indiquer une hépatite virale, une stéatose hépatique (foie gras), une toxicité médicamenteuse, ou une consommation excessive d''alcool. Des valeurs légèrement élevées sont parfois transitoires.',
'{
  "ALAT (femme)": "< 35 UI/L",
  "ALAT (homme)": "< 45 UI/L",
  "ASAT (femme)": "< 35 UI/L",
  "ASAT (homme)": "< 40 UI/L",
  "Seuil d''inquiétude": "> 3× la normale"
}'::jsonb),

('CRP', 'CRP (Protéine C-Réactive)',
'Marqueur d''inflammation ou d''infection dans l''organisme.',
'La CRP est une protéine produite par le foie en réponse à une inflammation, une infection ou une lésion tissulaire. Elle monte rapidement (en quelques heures) lors d''une infection bactérienne ou d''une inflammation.

• CRP très élevée (> 100 mg/L) : souvent une infection bactérienne sévère.
• CRP modérée (10–100 mg/L) : infection, inflammation chronique.
• CRP hs (haute sensibilité) < 1 mg/L : risque cardiovasculaire faible.

La CRP ne dit pas où est l''inflammation — le médecin cherchera l''origine avec d''autres examens.',
'{
  "CRP normale": "< 5 mg/L",
  "CRP haute sensibilité (hs-CRP) risque bas": "< 1 mg/L",
  "CRP hs risque modéré": "1–3 mg/L",
  "CRP hs risque élevé": "> 3 mg/L"
}'::jsonb),

('FERRITINE', 'Ferritine (réserves en fer)',
'Reflète les réserves de fer stockées dans l''organisme.',
'La ferritine est la protéine de stockage du fer dans l''organisme. Son taux sanguin est le meilleur indicateur des réserves en fer.

• Ferritine basse : carence en fer (anémie ferriprive) — fatigue, pâleur, essoufflement, cheveux fragiles.
• Ferritine élevée : surcharge en fer (hémochromatose), inflammation chronique, maladie hépatique.

Une carence en fer peut exister même avant l''apparition d''une anémie (carence sans anémie). Un bilan complet inclut aussi la saturation de la transferrine.',
'{
  "Ferritine (femme adulte)": "15–150 µg/L",
  "Ferritine (homme adulte)": "30–300 µg/L",
  "Carence en fer": "< 15 µg/L",
  "Surcharge en fer": "> 300 µg/L"
}'::jsonb),

-- ─── Examens d''imagerie ──────────────────────────────────────

('RADIOGRAPHIE', 'Radiographie (radio)',
'Imagerie par rayons X pour visualiser os et structures internes.',
'La radiographie utilise des rayons X pour créer des images des structures internes. Elle est particulièrement utile pour :

• Les os : fractures, arthrose, infection osseuse.
• Les poumons : pneumonie, épanchement pleural, cancer, tuberculose.
• Le cœur : taille cardiaque, congestion pulmonaire.
• L''abdomen : obstruction intestinale, calculs.

L''exposition aux rayons X est faible pour un cliché standard. Des précautions particulières sont prises pendant la grossesse (protection abdominale ou report si possible).',
null),

('ECHOGRAPHIE', 'Échographie (ultrasons)',
'Imagerie par ultrasons pour visualiser les organes internes sans rayonnement.',
'L''échographie utilise des ultrasons (ondes sonores à haute fréquence) pour créer des images des organes internes en temps réel. Elle ne nécessite pas de rayonnement et est sans danger, y compris pendant la grossesse.

Applications courantes :
• Abdomen : foie, vésicule biliaire, pancréas, rate, reins.
• Pelvis : utérus, ovaires, prostate, vessie.
• Obstétrique : suivi de grossesse, estimation du terme, développement du bébé.
• Cœur (échographie cardiaque) : structure et fonction cardiaque.
• Vaisseaux (Doppler) : circulation sanguine, phlébite, sténose artérielle.

Selon la région examinée, un gel est appliqué sur la peau. Aucune préparation spéciale n''est nécessaire sauf pour l''abdomen (jeûne de 4–6 h) ou le pelvis (vessie pleine).',
null),

('IRM', 'IRM (Imagerie par Résonance Magnétique)',
'Imagerie avancée sans rayonnement utilisant un champ magnétique.',
'L''IRM utilise un puissant champ magnétique et des ondes radio pour créer des images très détaillées des organes et tissus mous. Elle est sans rayonnement ionisant.

Applications :
• Cerveau et moelle épinière : tumeurs, AVC, sclérose en plaques, hernies discales.
• Articulations : genoux, épaules, hanches (ménisques, ligaments, cartilage).
• Abdomen et pelvis : foie, pancréas, reins, prostate, utérus.
• Cœur : structure cardiaque complexe.

L''examen dure de 20 à 60 minutes. Le patient est allongé dans un tunnel cylindrique. L''appareil produit des bruits forts (bouchons ou casque fournis). Les implants métalliques doivent être signalés au préalable. Une injection de produit de contraste (gadolinium) est parfois réalisée.',
null),

('SCANNER', 'Scanner (TDM / tomodensitométrie)',
'Imagerie par rayons X 3D pour une visualisation détaillée des structures internes.',
'Le scanner (ou TDM — tomodensitométrie) utilise des rayons X sous plusieurs angles pour produire des coupes et des reconstructions 3D du corps. Il est plus rapide que l''IRM.

Applications :
• Urgences : traumatismes, hémorragies, embolie pulmonaire.
• Poumons : nodules, cancer, infections.
• Abdomen : appendicite, calculs rénaux, tumeurs.
• Cœur : coroscanner (artères coronaires).
• Os et rachis : fractures complexes.

L''examen peut nécessiter une injection de produit de contraste iodé (informer le médecin en cas d''allergie à l''iode ou d''insuffisance rénale). La dose de rayonnement est plus élevée que pour une radiographie simple.',
null),

-- ─── Examens cardiaques ───────────────────────────────────────

('ECG', 'Électrocardiogramme (ECG)',
'Enregistrement de l''activité électrique du cœur.',
'L''ECG enregistre l''activité électrique du cœur à l''aide d''électrodes placées sur la peau. Il est indolore et dure 5 à 10 minutes.

Il permet de détecter :
• Les troubles du rythme (arythmies) : fibrillation auriculaire, tachycardie, bradycardie.
• Les signes d''infarctus du myocarde (aigu ou ancien).
• Les troubles de la conduction (bloc de branche, allongement QT).
• L''hypertrophie ventriculaire gauche (en cas d''hypertension).
• Les péricardites et autres maladies cardiaques.

Un ECG normal ne garantit pas l''absence de maladie cardiaque. Des examens complémentaires (échographie cardiaque, test d''effort) peuvent être nécessaires.',
null),

-- ─── Examens urinaires ────────────────────────────────────────

('ECBU', 'ECBU (Examen cytobactériologique des urines)',
'Analyse des urines pour détecter une infection urinaire.',
'L''ECBU (Examen Cytobactériologique des Urines) est l''analyse de référence pour diagnostiquer une infection urinaire. Il comprend :

• La cytologie : compte des globules blancs (leucocytes) et rouges dans les urines.
• La bactériologie : identification du germe responsable et son antibiogramme (quels antibiotiques sont efficaces).

Comment prélever correctement les urines :
1. Se laver les mains et les organes génitaux.
2. Éliminer le premier jet d''urine.
3. Recueillir le milieu du jet dans le flacon stérile fourni.
4. Acheminer au laboratoire dans les 2 heures (ou conserver au réfrigérateur < 4h).

Un résultat positif oriente le médecin dans le choix de l''antibiotique.',
'{
  "Leucocytes (normale)": "< 10 000 /mL",
  "Bactéries (normale)": "< 10³ UFC/mL",
  "Infection probable": "> 10⁵ UFC/mL + leucocyturie"
}'::jsonb),

('PROTEINURIE', 'Protéinurie (protéines dans les urines)',
'Détection de protéines dans les urines, indicateur de la santé rénale.',
'Normalement, les reins filtrent les déchets mais retiennent les protéines. Une protéinurie (protéines dans les urines) indique que les reins ne fonctionnent pas correctement.

Types d''examens :
• Bandelette urinaire : dépistage rapide au cabinet.
• Protéinurie des 24h : quantification précise sur un recueil d''urines de 24 heures.
• Microalbuminurie : détecte de petites quantités d''albumine (marqueur précoce de néphropathie diabétique).

Causes possibles : diabète, hypertension, glomérulonéphrite, lupus, infection. Une protéinurie persistante nécessite une investigation approfondie.',
'{
  "Protéinurie normale": "< 150 mg/24h",
  "Microalbuminurie": "30–300 mg/24h",
  "Protéinurie clinique": "> 300 mg/24h",
  "Syndrome néphrotique": "> 3000 mg/24h"
}'::jsonb)

ON CONFLICT (exam_type) DO UPDATE SET
  display_name      = EXCLUDED.display_name,
  description       = EXCLUDED.description,
  educational_text  = EXCLUDED.educational_text,
  normal_ranges     = EXCLUDED.normal_ranges,
  updated_at        = NOW();


