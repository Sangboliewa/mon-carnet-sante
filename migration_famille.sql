-- Migration: Module Famille — ajout colonnes relation/nickname/avatar_emoji à persons

ALTER TABLE persons ADD COLUMN IF NOT EXISTS relation TEXT DEFAULT 'moi'
  CHECK (relation IN ('moi', 'conjoint', 'enfant', 'parent', 'autre'));

ALTER TABLE persons ADD COLUMN IF NOT EXISTS nickname TEXT;

ALTER TABLE persons ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '👤';

-- Refresh RLS policies (DROP IF EXISTS avant CREATE)
DROP POLICY IF EXISTS "Users can view their own persons" ON persons;
DROP POLICY IF EXISTS "Users can insert their own persons" ON persons;
DROP POLICY IF EXISTS "Users can update their own persons" ON persons;
DROP POLICY IF EXISTS "Users can delete their own persons" ON persons;
DROP POLICY IF EXISTS "select_own_persons" ON persons;
DROP POLICY IF EXISTS "insert_own_persons" ON persons;
DROP POLICY IF EXISTS "update_own_persons" ON persons;
DROP POLICY IF EXISTS "delete_own_persons" ON persons;

ALTER TABLE persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_persons" ON persons
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "insert_own_persons" ON persons
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "update_own_persons" ON persons
  FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "delete_own_persons" ON persons
  FOR DELETE USING (created_by = auth.uid());
