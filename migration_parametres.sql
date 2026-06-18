-- Migration Module 15 — Paramètres utilisateur
-- À exécuter dans Supabase SQL Editor

-- Table user_preferences : préférences par utilisateur
CREATE TABLE IF NOT EXISTS user_preferences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language    text NOT NULL DEFAULT 'fr',          -- 'fr' | 'en'
  theme       text NOT NULL DEFAULT 'light',        -- 'light' | 'dark' | 'system'
  notif_reminders  boolean NOT NULL DEFAULT true,   -- rappels médicaments
  notif_agenda     boolean NOT NULL DEFAULT true,   -- rendez-vous
  notif_rappels_sms boolean NOT NULL DEFAULT false, -- SMS Twilio
  share_with_doctor boolean NOT NULL DEFAULT false, -- partage pro santé
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_user_preferences_updated_at();

-- RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_preferences_select" ON user_preferences;
DROP POLICY IF EXISTS "user_preferences_insert" ON user_preferences;
DROP POLICY IF EXISTS "user_preferences_update" ON user_preferences;
DROP POLICY IF EXISTS "user_preferences_delete" ON user_preferences;

CREATE POLICY "user_preferences_select" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_insert" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_update" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_delete" ON user_preferences
  FOR DELETE USING (auth.uid() = user_id);
