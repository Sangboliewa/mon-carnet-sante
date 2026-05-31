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
