-- Module 9: Rappels SMS/WhatsApp

CREATE TABLE IF NOT EXISTS sms_reminders (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id       UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  phone_number    TEXT NOT NULL,
  channel         TEXT NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms', 'whatsapp')),
  reminder_type   TEXT NOT NULL DEFAULT 'medication' CHECK (reminder_type IN ('medication', 'appointment', 'vaccination', 'custom')),
  message         TEXT NOT NULL,
  send_time       TIME NOT NULL,
  days_of_week    INTEGER[] DEFAULT '{1,2,3,4,5,6,0}',  -- 0=dim, 1=lun...
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_reminder_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sms_reminder_id UUID REFERENCES sms_reminders(id) ON DELETE SET NULL,
  person_id       UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel         TEXT,
  phone_number    TEXT,
  status          TEXT CHECK (status IN ('sent', 'failed', 'pending')),
  error_message   TEXT,
  twilio_sid      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sms_reminders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_reminder_logs  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_rem_select" ON sms_reminders;
CREATE POLICY "sms_rem_select" ON sms_reminders FOR SELECT
  USING (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

DROP POLICY IF EXISTS "sms_rem_insert" ON sms_reminders;
CREATE POLICY "sms_rem_insert" ON sms_reminders FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

DROP POLICY IF EXISTS "sms_rem_update" ON sms_reminders;
CREATE POLICY "sms_rem_update" ON sms_reminders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

DROP POLICY IF EXISTS "sms_rem_delete" ON sms_reminders;
CREATE POLICY "sms_rem_delete" ON sms_reminders FOR DELETE
  USING (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

DROP POLICY IF EXISTS "sms_log_select" ON sms_reminder_logs;
CREATE POLICY "sms_log_select" ON sms_reminder_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM persons p JOIN users u ON u.id = p.user_id WHERE p.id = person_id AND u.auth_id = auth.uid()));

DROP POLICY IF EXISTS "sms_log_insert" ON sms_reminder_logs;
CREATE POLICY "sms_log_insert" ON sms_reminder_logs FOR INSERT
  WITH CHECK (true);  -- inséré par l'API route (service_role côté serveur)
