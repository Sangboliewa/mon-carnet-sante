export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ─── Row types ──────────────────────────────────────────────────────────────

export interface PersonRow {
  id: string;
  created_by: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_type: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  social_security_number_encrypted: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonAccessRow {
  id: string;
  person_id: string;
  user_id: string;
  role: "owner" | "viewer" | "editor";
  granted_by: string;
  granted_at: string;
}

export interface AllergyRow {
  id: string;
  person_id: string;
  allergen: string;
  allergen_code: string | null;
  coding_system: string;
  severity: "mild" | "moderate" | "severe" | "life_threatening" | null;
  reaction: string | null;
  diagnosed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChronicConditionRow {
  id: string;
  person_id: string;
  condition_name: string;
  condition_code: string | null;
  coding_system: string;
  status: "active" | "remission" | "resolved" | null;
  diagnosed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreatmentRow {
  id: string;
  person_id: string;
  medication_name: string;
  medication_code: string | null;
  coding_system: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  prescribing_doctor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaccinationRow {
  id: string;
  person_id: string;
  vaccine_name: string;
  vaccine_code: string | null;
  coding_system: string;
  administered_date: string | null;
  batch_number: string | null;
  administering_center: string | null;
  next_dose_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalDocumentRow {
  id: string;
  person_id: string;
  uploaded_by: string;
  filename: string;
  storage_path: string;
  file_type: string;
  file_size_bytes: number | null;
  document_type: string | null;
  exam_type: string | null;
  document_date: string | null;
  issuing_facility: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamGlossaryRow {
  id: string;
  exam_type: string;
  display_name: string;
  description: string | null;
  educational_text: string;
  normal_ranges: Json | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentExplanationRow {
  id: string;
  document_id: string;
  person_id: string;
  requested_by: string;
  glossary_id: string | null;
  viewed_at: string;
}

export interface SharedLinkRow {
  id: string;
  person_id: string;
  document_id: string | null;
  created_by: string;
  token: string;
  expires_at: string;
  access_count: number;
  max_access_count: number | null;
  revoked: boolean;
  created_at: string;
}

export interface LabResultRow {
  id: string;
  person_id: string;
  test_date: string;
  test_name: string;
  category: string | null;
  value: number;
  unit: string;
  ref_min: number | null;
  ref_max: number | null;
  lab_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrowthRecordRow {
  id: string;
  person_id: string;
  recorded_date: string;
  height_cm: number | null;
  weight_kg: number | null;
  head_cm: number | null;
  notes: string | null;
  created_at: string;
}

export interface MedicationReminderRow {
  id: string;
  person_id: string;
  medication_name: string;
  dosage: string | null;
  reminder_times: string[];
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SymptomLogRow {
  id: string;
  person_id: string;
  logged_date: string;
  pain_level: number | null;
  fatigue_level: number | null;
  mood: number | null;
  symptoms_text: string | null;
  notes: string | null;
  created_at: string;
}

export interface AppointmentRow {
  id: string;
  person_id: string;
  appointment_date: string;
  appointment_time: string | null;
  title: string;
  specialty: string | null;
  doctor_name: string | null;
  location: string | null;
  completed: boolean;
  reminder_days_before: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VitalMeasurementRow {
  id: string;
  person_id: string;
  measurement_type: "blood_pressure" | "blood_glucose" | "heart_rate" | "weight" | "temperature" | "oxygen_saturation";
  value_primary: number;
  value_secondary: number | null;
  unit: string;
  measured_at: string;
  context: "fasting" | "after_meal" | "before_meal" | "at_rest" | "after_exercise" | "other" | null;
  notes: string | null;
  created_at: string;
}

export interface MedicalConsultationRow {
  id: string;
  person_id: string;
  consultation_date: string;
  doctor_name: string | null;
  specialty: string | null;
  reason: string | null;
  diagnosis: string | null;
  prescription_text: string | null;
  follow_up_date: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PregnancyRow {
  id: string;
  person_id: string;
  lmp_date: string | null;
  expected_due_date: string | null;
  actual_delivery_date: string | null;
  status: "ongoing" | "delivered" | "miscarriage" | "interrupted";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrenatalAppointmentRow {
  id: string;
  person_id: string;
  pregnancy_id: string | null;
  appointment_date: string;
  appointment_time: string | null;
  appointment_type: string;
  healthcare_provider: string | null;
  location: string | null;
  completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MenstrualCycleRow {
  id: string;
  person_id: string;
  start_date: string;
  end_date: string | null;
  flow: "light" | "medium" | "heavy" | "very_heavy" | null;
  symptoms: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsentRow {
  id: string;
  person_id: string;
  consent_type: string;
  granted: boolean;
  granted_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Insert types ────────────────────────────────────────────────────────────

export type PersonInsert = {
  created_by: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_type?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  social_security_number_encrypted?: string | null;
};

export type PersonUpdate = Partial<Omit<PersonInsert, "created_by">>;

export type AllergyInsert = {
  person_id: string;
  allergen: string;
  allergen_code?: string | null;
  coding_system: string;
  severity?: "mild" | "moderate" | "severe" | "life_threatening" | null;
  reaction?: string | null;
  diagnosed_date?: string | null;
  notes?: string | null;
};

export type ChronicConditionInsert = {
  person_id: string;
  condition_name: string;
  condition_code?: string | null;
  coding_system: string;
  status?: "active" | "remission" | "resolved" | null;
  diagnosed_date?: string | null;
  notes?: string | null;
};

export type TreatmentInsert = {
  person_id: string;
  medication_name: string;
  medication_code?: string | null;
  coding_system: string;
  dosage?: string | null;
  frequency?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  prescribing_doctor?: string | null;
  notes?: string | null;
};

export type VaccinationInsert = {
  person_id: string;
  vaccine_name: string;
  vaccine_code?: string | null;
  coding_system: string;
  administered_date?: string | null;
  batch_number?: string | null;
  administering_center?: string | null;
  next_dose_date?: string | null;
  notes?: string | null;
};

export type LabResultInsert = {
  person_id: string;
  test_date: string;
  test_name: string;
  category?: string | null;
  value: number;
  unit: string;
  ref_min?: number | null;
  ref_max?: number | null;
  lab_name?: string | null;
  notes?: string | null;
};

export type GrowthRecordInsert = {
  person_id: string;
  recorded_date: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  head_cm?: number | null;
  notes?: string | null;
};

export type MedicationReminderInsert = {
  person_id: string;
  medication_name: string;
  dosage?: string | null;
  reminder_times: string[];
  active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
};

export type SymptomLogInsert = {
  person_id: string;
  logged_date: string;
  pain_level?: number | null;
  fatigue_level?: number | null;
  mood?: number | null;
  symptoms_text?: string | null;
  notes?: string | null;
};

export type AppointmentInsert = {
  person_id: string;
  appointment_date: string;
  appointment_time?: string | null;
  title: string;
  specialty?: string | null;
  doctor_name?: string | null;
  location?: string | null;
  completed?: boolean;
  reminder_days_before?: number;
  notes?: string | null;
};

export type VitalMeasurementInsert = {
  person_id: string;
  measurement_type: "blood_pressure" | "blood_glucose" | "heart_rate" | "weight" | "temperature" | "oxygen_saturation";
  value_primary: number;
  value_secondary?: number | null;
  unit: string;
  measured_at?: string;
  context?: "fasting" | "after_meal" | "before_meal" | "at_rest" | "after_exercise" | "other" | null;
  notes?: string | null;
};

export type MedicalConsultationInsert = {
  person_id: string;
  consultation_date: string;
  doctor_name?: string | null;
  specialty?: string | null;
  reason?: string | null;
  diagnosis?: string | null;
  prescription_text?: string | null;
  follow_up_date?: string | null;
  location?: string | null;
  notes?: string | null;
};

export type PregnancyInsert = {
  person_id: string;
  lmp_date?: string | null;
  expected_due_date?: string | null;
  actual_delivery_date?: string | null;
  status?: "ongoing" | "delivered" | "miscarriage" | "interrupted";
  notes?: string | null;
};

export type PrenatalAppointmentInsert = {
  person_id: string;
  pregnancy_id?: string | null;
  appointment_date: string;
  appointment_time?: string | null;
  appointment_type: string;
  healthcare_provider?: string | null;
  location?: string | null;
  completed?: boolean;
  notes?: string | null;
};

export type MenstrualCycleInsert = {
  person_id: string;
  start_date: string;
  end_date?: string | null;
  flow?: "light" | "medium" | "heavy" | "very_heavy" | null;
  symptoms?: string | null;
  notes?: string | null;
};

export type MedicalDocumentInsert = {
  person_id: string;
  uploaded_by: string;
  filename: string;
  storage_path: string;
  file_type: string;
  file_size_bytes?: number | null;
  document_type?: string | null;
  exam_type?: string | null;
  document_date?: string | null;
  issuing_facility?: string | null;
  notes?: string | null;
};

export type SharedLinkInsert = {
  person_id: string;
  document_id?: string | null;
  created_by: string;
  token: string;
  expires_at: string;
  max_access_count?: number | null;
};

export type DocumentExplanationInsert = {
  document_id: string;
  person_id: string;
  requested_by: string;
  glossary_id?: string | null;
};

// ─── Database generic for Supabase client ────────────────────────────────────
// @supabase/supabase-js v2.106+ requires Relationships on every table.

export interface Database {
  public: {
    Tables: {
      persons: {
        Row: PersonRow;
        Insert: PersonInsert;
        Update: PersonUpdate;
        Relationships: [];
      };
      person_access: {
        Row: PersonAccessRow;
        Insert: {
          person_id: string;
          user_id: string;
          role: "owner" | "viewer" | "editor";
          granted_by: string;
        };
        Update: Partial<{ role: "owner" | "viewer" | "editor" }>;
        Relationships: [];
      };
      allergies: {
        Row: AllergyRow;
        Insert: AllergyInsert;
        Update: Partial<AllergyInsert>;
        Relationships: [];
      };
      chronic_conditions: {
        Row: ChronicConditionRow;
        Insert: ChronicConditionInsert;
        Update: Partial<ChronicConditionInsert>;
        Relationships: [];
      };
      treatments: {
        Row: TreatmentRow;
        Insert: TreatmentInsert;
        Update: Partial<TreatmentInsert>;
        Relationships: [];
      };
      vaccinations: {
        Row: VaccinationRow;
        Insert: VaccinationInsert;
        Update: Partial<VaccinationInsert>;
        Relationships: [];
      };
      medical_documents: {
        Row: MedicalDocumentRow;
        Insert: MedicalDocumentInsert;
        Update: Partial<MedicalDocumentInsert> & { storage_path?: string };
        Relationships: [];
      };
      exam_glossary: {
        Row: ExamGlossaryRow;
        Insert: {
          exam_type: string;
          display_name: string;
          description?: string | null;
          educational_text: string;
          normal_ranges?: Json | null;
        };
        Update: Partial<{
          display_name: string;
          description: string | null;
          educational_text: string;
          normal_ranges: Json | null;
        }>;
        Relationships: [];
      };
      document_explanations: {
        Row: DocumentExplanationRow;
        Insert: DocumentExplanationInsert;
        Update: Record<string, never>;
        Relationships: [];
      };
      shared_links: {
        Row: SharedLinkRow;
        Insert: SharedLinkInsert;
        Update: Partial<{ revoked: boolean; max_access_count: number | null }>;
        Relationships: [];
      };
      lab_results: {
        Row: LabResultRow;
        Insert: LabResultInsert;
        Update: Partial<LabResultInsert>;
        Relationships: [];
      };
      growth_records: {
        Row: GrowthRecordRow;
        Insert: GrowthRecordInsert;
        Update: Partial<GrowthRecordInsert>;
        Relationships: [];
      };
      medication_reminders: {
        Row: MedicationReminderRow;
        Insert: MedicationReminderInsert;
        Update: Partial<MedicationReminderInsert>;
        Relationships: [];
      };
      symptom_logs: {
        Row: SymptomLogRow;
        Insert: SymptomLogInsert;
        Update: Partial<SymptomLogInsert>;
        Relationships: [];
      };
      appointments: {
        Row: AppointmentRow;
        Insert: AppointmentInsert;
        Update: Partial<AppointmentInsert>;
        Relationships: [];
      };
      vital_measurements: {
        Row: VitalMeasurementRow;
        Insert: VitalMeasurementInsert;
        Update: Partial<VitalMeasurementInsert>;
        Relationships: [];
      };
      medical_consultations: {
        Row: MedicalConsultationRow;
        Insert: MedicalConsultationInsert;
        Update: Partial<MedicalConsultationInsert>;
        Relationships: [];
      };
      pregnancies: {
        Row: PregnancyRow;
        Insert: PregnancyInsert;
        Update: Partial<PregnancyInsert>;
        Relationships: [];
      };
      prenatal_appointments: {
        Row: PrenatalAppointmentRow;
        Insert: PrenatalAppointmentInsert;
        Update: Partial<PrenatalAppointmentInsert>;
        Relationships: [];
      };
      menstrual_cycles: {
        Row: MenstrualCycleRow;
        Insert: MenstrualCycleInsert;
        Update: Partial<MenstrualCycleInsert>;
        Relationships: [];
      };
      consents: {
        Row: ConsentRow;
        Insert: {
          person_id: string;
          consent_type: string;
          granted: boolean;
          granted_at?: string | null;
          expires_at?: string | null;
          notes?: string | null;
        };
        Update: Partial<ConsentRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ─── Convenience aliases ─────────────────────────────────────────────────────

export type Person = PersonRow;
export type Allergy = AllergyRow;
export type ChronicCondition = ChronicConditionRow;
export type Treatment = TreatmentRow;
export type Vaccination = VaccinationRow;
export type MedicalDocument = MedicalDocumentRow;
export type ExamGlossary = ExamGlossaryRow;
export type SharedLink = SharedLinkRow;
export type MenstrualCycle = MenstrualCycleRow;
export type LabResult = LabResultRow;
export type GrowthRecord = GrowthRecordRow;
export type MedicationReminder = MedicationReminderRow;
export type SymptomLog = SymptomLogRow;
export type Appointment = AppointmentRow;
export type VitalMeasurement = VitalMeasurementRow;
export type MedicalConsultation = MedicalConsultationRow;
export type Pregnancy = PregnancyRow;
export type PrenatalAppointment = PrenatalAppointmentRow;
