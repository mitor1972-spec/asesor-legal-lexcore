-- Extend lawfirms table with additional fields
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS cif TEXT;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Case preferences
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS areas_accepted TEXT[];
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS provinces_accepted TEXT[];
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS min_lead_score INTEGER DEFAULT 0;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS max_lead_price INTEGER DEFAULT 50;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS monthly_capacity INTEGER;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS exclusions TEXT[];

-- Own API key configuration
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS openai_api_key TEXT;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS settings_json JSONB DEFAULT '{}';

-- Create enum for firm status if not exists
DO $$ BEGIN
  CREATE TYPE firm_case_status AS ENUM ('received', 'reviewing', 'contacted', 'in_progress', 'won', 'lost', 'rejected', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add columns to lead_assignments
ALTER TABLE lead_assignments ADD COLUMN IF NOT EXISTS firm_status TEXT DEFAULT 'received';
ALTER TABLE lead_assignments ADD COLUMN IF NOT EXISTS firm_notes TEXT;
ALTER TABLE lead_assignments ADD COLUMN IF NOT EXISTS assigned_lawyer_id UUID REFERENCES profiles(id);
ALTER TABLE lead_assignments ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ;
ALTER TABLE lead_assignments ADD COLUMN IF NOT EXISTS result_amount DECIMAL;
ALTER TABLE lead_assignments ADD COLUMN IF NOT EXISTS result_notes TEXT;

-- Create lead_legal_help table for AI-generated assistance
CREATE TABLE IF NOT EXISTS lead_legal_help (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  lawfirm_id UUID REFERENCES lawfirms(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Generated content
  legal_orientation TEXT,
  documentation_needed TEXT,
  commercial_next_steps TEXT,
  legal_next_steps TEXT,
  risks_alerts TEXT,
  estimated_complexity TEXT,
  
  -- Full LLM response
  llm_response_json JSONB
);

-- Enable RLS on lead_legal_help
ALTER TABLE lead_legal_help ENABLE ROW LEVEL SECURITY;

-- Policies for lead_legal_help
CREATE POLICY "Internal users can manage legal help"
  ON lead_legal_help FOR ALL
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Lawfirm users can view their legal help"
  ON lead_legal_help FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.lawfirm_id = lead_legal_help.lawfirm_id
    )
  );

-- Policy for lawfirm users to view their assigned leads
CREATE POLICY "Lawfirm users can view their assigned leads"
  ON leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lead_assignments la
      JOIN profiles p ON p.lawfirm_id = la.lawfirm_id
      WHERE la.lead_id = leads.id
      AND p.id = auth.uid()
    )
  );

-- Policy for lawfirm users to update their assignments
CREATE POLICY "Lawfirm users can update their assignments"
  ON lead_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.lawfirm_id = lead_assignments.lawfirm_id
    )
  );

-- Policy for lawfirm users to view their assignments
CREATE POLICY "Lawfirm users can view their assignments"
  ON lead_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.lawfirm_id = lead_assignments.lawfirm_id
    )
  );

-- Policy for lawfirm admin to view/update their lawfirm
CREATE POLICY "Lawfirm admin can view their lawfirm"
  ON lawfirms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.lawfirm_id = lawfirms.id
    )
  );

CREATE POLICY "Lawfirm admin can update their lawfirm"
  ON lawfirms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
      AND p.lawfirm_id = lawfirms.id
      AND ur.role = 'lawfirm_admin'
    )
  );

-- Lawfirm users can view profiles of their own lawfirm team
CREATE POLICY "Lawfirm users can view their team profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles my_profile
      WHERE my_profile.id = auth.uid()
      AND my_profile.lawfirm_id = profiles.lawfirm_id
      AND my_profile.lawfirm_id IS NOT NULL
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lead_assignments_lawfirm_id ON lead_assignments(lawfirm_id);
CREATE INDEX IF NOT EXISTS idx_lead_legal_help_lead_id ON lead_legal_help(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_legal_help_lawfirm_id ON lead_legal_help(lawfirm_id);